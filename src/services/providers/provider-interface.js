// ── Provider Interface — Sprint 18B ──────────────────────────────────────────
//
// All AI providers implement BaseProvider. The Runtime Engine (builder-runtime.js)
// only depends on this interface, so adding a new provider never touches the engine.
//
// Payload schema (designed for Sprint 19 extensibility — ignored fields are safe):
// {
//   messages:    [{ role: 'system'|'user'|'assistant', content: string }],
//   model:       string,     // provider-side model id (e.g. 'claude-sonnet-4-6')
//   temperature: number,     // 0–1
//   maxTokens:   number,
//   // Sprint 19 extensions (providers should silently ignore unknown keys):
//   // memory:   ConversationTurn[],
//   // tools:    ToolDefinition[],
//   // rag:      KnowledgeChunk[],
// }
//
// RunResult schema:
// {
//   text:     string,         // full AI response
//   tokens:   { prompt: number, completion: number, total: number },
//   model:    string,         // model actually used
//   provider: string,         // provider id
//   ms:       number,         // wall-clock latency
// }

export class BaseProvider {
  // Subclasses must set this
  get id()    { return 'base'; }
  get label() { return 'Base Provider'; }

  // ── Must override ──────────────────────────────────────────────────────────

  // Non-streaming: return full RunResult. Used by complete().
  // eslint-disable-next-line no-unused-vars
  async _fetch(payload, signal) {
    throw new Error(`${this.id}: _fetch() not implemented`);
  }

  // ── Streaming (default: simulate from full response) ───────────────────────
  // Override with real SSE if provider supports it natively via GAS in future.
  //
  // onChunk(text: string) — called for each streamed piece
  // signal: AbortSignal
  // returns: RunResult (same as complete)
  async stream(payload, { onChunk, signal } = {}) {
    const t0 = Date.now();
    const result = await this._fetch(payload, signal);
    if (signal?.aborted) return result;

    // Simulate streaming — split on word boundaries so text looks natural
    await _simulateStream(result.text, onChunk ?? (() => {}), signal);

    return { ...result, ms: Date.now() - t0 };
  }

  // Non-streaming convenience
  async complete(payload, signal) {
    const t0 = Date.now();
    const result = await this._fetch(payload, signal);
    return { ...result, ms: Date.now() - t0 };
  }

  // Rough token estimate (4 chars/token) — good enough for progress display
  countTokens(text) {
    return Math.ceil((text ?? '').length / 4);
  }
}

// ── Streaming simulation ─────────────────────────────────────────────────────

async function _simulateStream(text, onChunk, signal) {
  if (!text) return;

  // Split preserving whitespace: word + following whitespace = one unit
  const units = text.match(/\S+\s*/g) ?? [];
  const WORDS_PER_CHUNK = 4;   // ~20-25 chars per emit
  const DELAY_MS        = 28;  // ~35 chunks/sec — feels like fast typing

  for (let i = 0; i < units.length; i += WORDS_PER_CHUNK) {
    if (signal?.aborted) return;
    onChunk(units.slice(i, i + WORDS_PER_CHUNK).join(''));
    await _sleep(DELAY_MS);
  }
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── GAS proxy helper (shared by Claude + OpenAI providers) ───────────────────

export async function callGasRunBuilder(providerPayload, signal) {
  const gasUrl = window.AIFUN_CONFIG?.gasWebAppUrl;
  if (!gasUrl) throw new Error('GAS endpoint chưa được cấu hình (AIFUN_CONFIG.gasWebAppUrl).');

  const timeoutMs = window.AIFUN_CONFIG?.requestTimeout ?? 90_000;

  // Merge caller's AbortSignal with our timeout signal
  const timeoutController = new AbortController();
  const tid = setTimeout(() => timeoutController.abort(), timeoutMs);
  const mergedSignal = _mergeSignals(signal, timeoutController.signal);

  let res;
  try {
    res = await fetch(gasUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'runBuilder', ...providerPayload }),
      signal:  mergedSignal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      if (signal?.aborted) throw new Error('Yêu cầu đã bị huỷ.');
      throw new Error(`Hết thời gian chờ (${timeoutMs / 1000}s). Vui lòng thử lại.`);
    }
    throw new Error(`Không thể kết nối GAS: ${err.message}`);
  } finally {
    clearTimeout(tid);
  }

  if (!res.ok) throw new Error(`GAS trả về HTTP ${res.status}. Vui lòng thử lại.`);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('GAS trả về dữ liệu không hợp lệ (non-JSON).');
  }

  if (data.error) throw new Error(data.error);

  return data;
}

function _mergeSignals(...signals) {
  const ctrl = new AbortController();
  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) { ctrl.abort(); break; }
    sig.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

// ── Provider registry ─────────────────────────────────────────────────────────

const _registry = new Map();

export function registerProvider(id, provider) {
  _registry.set(id, provider);
}

export function createProvider(model) {
  // model is the builder.model string — map to provider id prefix
  const id = _resolveProviderId(model);
  const provider = _registry.get(id);
  if (!provider) throw new Error(`Provider "${id}" chưa được đăng ký.`);
  return provider;
}

export function listRegisteredProviders() {
  return [..._registry.entries()].map(([id, p]) => ({ id, label: p.label }));
}

function _resolveProviderId(model) {
  if (!model) return 'claude';
  const m = model.toLowerCase();
  if (m.startsWith('claude') || m === 'claude')      return 'claude';
  if (m.startsWith('gpt') || m === 'openai')          return 'openai';
  if (m.startsWith('gemini'))                          return 'gemini';
  if (m === 'openrouter' || m.includes('/'))           return 'openrouter';
  return 'claude'; // default
}
