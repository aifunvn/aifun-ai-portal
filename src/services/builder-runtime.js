// ── Builder Runtime Engine — Sprint 18C ──────────────────────────────────────
//
// Single entry point for all AI execution. UI must never call providers or
// builder-studio-db directly — only this module.
//
// Public API:
//
//   runBuilder(builderId, variables, callbacks) → Promise<RunResult>
//     callbacks: { onChunk(text), onDone(result), onError(err), signal }
//
//   renderTemplate(template, variables) → string
//     Replaces {{variable}} tokens with values from the variables map.
//
//   buildPayload(builder, renderedPrompt) → messages[]
//     Combines systemPrompt + knowledgeSources + renderedPrompt into an
//     OpenAI-compatible messages array for the provider layer.
//
//   extractVariables(template) → string[]
//     Returns unique {{variable}} names found in a prompt template.
//
// Designed for Sprint 19 extensibility:
//   - buildPayload() already reserves `memory` and `tools` slots in comments
//   - createProvider() resolves via registry — add a provider without touching
//     this file
//   - runBuilder() passes the full payload through, so adding fields (e.g.
//     RAG chunks) in Sprint 19 only requires touching buildPayload()

import { getBuilderRow }       from './builder-studio-db.js';
import { recordAnalyticsEvent } from './builder-studio-db.js';
import { createProvider }       from './providers/provider-interface.js';

// Side-effect imports to register providers into the createProvider() registry.
// Order determines fallback priority.
import './providers/claude.js';
import './providers/openai.js';
import './providers/gemini.js';
import './providers/openrouter.js';

// ── Public: runBuilder ────────────────────────────────────────────────────────

/**
 * Load a builder and run it end-to-end.
 *
 * @param {string}   builderId
 * @param {Object}   variables   - key/value map for {{variable}} substitution
 * @param {Object}   callbacks
 * @param {Function} callbacks.onChunk  - (text: string) called per streamed piece
 * @param {Function} callbacks.onDone   - (RunResult) called on success
 * @param {Function} callbacks.onError  - (Error) called on failure
 * @param {AbortSignal} callbacks.signal - AbortController.signal for Stop button
 * @returns {Promise<RunResult>}
 */
export async function runBuilder(builderId, variables = {}, {
  onChunk  = () => {},
  onDone   = () => {},
  onError  = () => {},
  signal   = null,
  workspaceId = null,
} = {}) {
  const t0 = Date.now();
  let builder;

  try {
    builder = await getBuilderRow(builderId);
  } catch (err) {
    const e = new Error(`Không thể tải Builder: ${err.message}`);
    onError(e);
    throw e;
  }

  let result;
  try {
    const rendered = renderTemplate(builder.promptTemplate ?? '', variables);
    const payload  = buildPayload(builder, rendered);
    const provider = createProvider(builder.model);

    result = await provider.stream(payload, { onChunk, signal });
  } catch (err) {
    const ms = Date.now() - t0;
    _logAnalytics(builder, workspaceId, { success: false, tokensUsed: 0, ms });
    onError(err);
    throw err;
  }

  _logAnalytics(builder, workspaceId, {
    success:   true,
    tokensUsed: result.tokens?.total ?? 0,
    ms:         result.ms ?? (Date.now() - t0),
  });

  onDone(result);
  return result;
}

// ── Public: renderTemplate ────────────────────────────────────────────────────

/**
 * Replace {{variable}} tokens with values from the variables map.
 * Unknown tokens are left as-is so the user can see what was missing.
 *
 * @param {string} template   - prompt template with {{variable}} placeholders
 * @param {Object} variables  - { variableName: value }
 * @returns {string}
 */
export function renderTemplate(template, variables = {}) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = variables[key];
    if (val === undefined || val === null || val === '') return match;
    return String(val);
  });
}

// ── Public: buildPayload ──────────────────────────────────────────────────────

/**
 * Assemble the provider payload from a builder definition + rendered prompt.
 *
 * Returns the OpenAI-compatible messages[] format understood by all providers.
 * Knowledge sources are appended to the system message.
 *
 * Sprint 19 hooks (reserved, not yet active):
 *   - memory: ConversationTurn[] would be inserted between system and user messages
 *   - tools: ToolDefinition[] would be added as a top-level payload field
 *   - rag: KnowledgeChunk[] would replace raw knowledgeSources with retrieval results
 *
 * @param {Object} builder       - builder row from getBuilderRow()
 * @param {string} renderedPrompt - result of renderTemplate()
 * @returns {Object} payload for provider.stream() / provider.complete()
 */
export function buildPayload(builder, renderedPrompt) {
  const systemParts = [];

  if (builder.systemPrompt?.trim()) {
    systemParts.push(builder.systemPrompt.trim());
  }

  // Knowledge sources — appended to system message as context blocks.
  // Sprint 19: replace this with RAG retrieval over knowledgeSources.
  const sources = builder.knowledgeSources ?? [];
  if (sources.length) {
    const kb = sources
      .filter((s) => s.content?.trim())
      .map((s) => `## ${s.label ?? 'Nguồn tham khảo'}\n${s.content.trim()}`)
      .join('\n\n');
    if (kb) {
      systemParts.push('---\nKiến thức tham khảo:\n' + kb);
    }
  }

  const messages = [];

  if (systemParts.length) {
    messages.push({ role: 'system', content: systemParts.join('\n\n') });
  }

  messages.push({ role: 'user', content: renderedPrompt || '(không có nội dung)' });

  return {
    messages,
    model:       builder.model       ?? 'claude',
    temperature: builder.temperature ?? 0.7,
    maxTokens:   builder.maxTokens   ?? 4096,
    builderId:   builder.id          ?? 'runtime',
    // Sprint 19 extension points:
    // memory: [],
    // tools:  [],
  };
}

// ── Public: extractVariables ──────────────────────────────────────────────────

/**
 * Parse all {{variable}} names from a prompt template.
 * Used by the Run page to auto-generate the input form.
 *
 * @param {string} template
 * @returns {string[]} unique variable names in order of first appearance
 */
export function extractVariables(template) {
  if (!template) return [];
  const seen = new Set();
  const vars = [];
  let match;
  const re = /\{\{(\w+)\}\}/g;
  while ((match = re.exec(template)) !== null) {
    if (!seen.has(match[1])) { seen.add(match[1]); vars.push(match[1]); }
  }
  return vars;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _logAnalytics(builder, workspaceId, { success, tokensUsed, ms }) {
  if (!builder?.id || !workspaceId) return;
  recordAnalyticsEvent(builder.id, workspaceId, {
    eventType:      'used',
    success,
    tokensUsed,
    responseTimeMs: ms,
  }).catch(() => {}); // analytics must never crash the caller
}
