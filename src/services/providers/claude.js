// ── Claude Provider — Sprint 18B ─────────────────────────────────────────────
//
// Routes requests through the GAS proxy (action: 'runBuilder').
// GAS calls the Claude Messages API server-side — the browser never holds keys.
//
// GAS request format expected:
//   { action: 'runBuilder', provider: 'claude', model, temperature, maxTokens,
//     messages: [{ role, content }], builderId, workspace, user, timestamp }
//
// GAS response expected:
//   { content: string, tokens: { prompt, completion, total }, model, provider }
//   OR { error: string }
//
// True SSE streaming is not feasible through GAS (synchronous HTTP). Streaming
// is simulated client-side via _simulateStream in BaseProvider after the full
// response arrives. This is transparent to UI consumers.

import { BaseProvider, callGasRunBuilder, registerProvider } from './provider-interface.js';
import { workspaceStore } from '../../stores/workspace-store.js';
import { userStore }      from '../../stores/user-store.js';

const MODEL_MAP = {
  claude:               'claude-sonnet-4-6',
  'claude-sonnet-4-6':  'claude-sonnet-4-6',
  'claude-haiku-4-5':   'claude-haiku-4-5',
  'claude-opus-4-8':    'claude-opus-4-8',
};

class ClaudeProvider extends BaseProvider {
  get id()    { return 'claude'; }
  get label() { return 'Claude (Anthropic)'; }

  async _fetch(payload, signal) {
    const gasModel   = MODEL_MAP[payload.model] ?? MODEL_MAP.claude;
    const workspace  = workspaceStore.getWorkspace();
    const user       = userStore.getUser();
    const userName   = user?.user_metadata?.full_name ?? user?.email ?? 'Người dùng';

    const data = await callGasRunBuilder({
      provider:    'claude',
      model:       gasModel,
      temperature: payload.temperature ?? 0.7,
      maxTokens:   payload.maxTokens   ?? 4096,
      messages:    payload.messages    ?? [],
      builderId:   payload.builderId   ?? 'runtime',
      workspace:   workspace?.name     ?? '',
      user:        userName,
      timestamp:   new Date().toISOString(),
    }, signal);

    const text   = data.content ?? '';
    const tokens = data.tokens  ?? _estimateTokens(payload.messages, text);

    return {
      text,
      tokens,
      model:    data.model    ?? gasModel,
      provider: 'claude',
      ms:       0, // filled by BaseProvider.stream / complete
    };
  }
}

function _estimateTokens(messages, responseText) {
  const inputText = (messages ?? []).map((m) => m.content).join(' ');
  const prompt     = Math.ceil(inputText.length    / 4);
  const completion = Math.ceil(responseText.length / 4);
  return { prompt, completion, total: prompt + completion };
}

registerProvider('claude', new ClaudeProvider());
