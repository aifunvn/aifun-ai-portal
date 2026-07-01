// ── OpenAI Provider — Sprint 18B ─────────────────────────────────────────────
//
// Routes requests through the GAS proxy (action: 'runBuilder', provider: 'openai').
// GAS calls the OpenAI Chat Completions API server-side.
//
// GAS request format expected:
//   { action: 'runBuilder', provider: 'openai', model, temperature, maxTokens,
//     messages: [{ role, content }], builderId, workspace, user, timestamp }
//
// GAS response expected:
//   { content: string, tokens: { prompt, completion, total }, model, provider }
//   OR { error: string }

import { BaseProvider, callGasRunBuilder, registerProvider } from './provider-interface.js';
import { workspaceStore } from '../../stores/workspace-store.js';
import { userStore }      from '../../stores/user-store.js';

const MODEL_MAP = {
  openai:       'gpt-4o',
  'gpt-4o':     'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
};

class OpenAIProvider extends BaseProvider {
  get id()    { return 'openai'; }
  get label() { return 'OpenAI (GPT-4o)'; }

  async _fetch(payload, signal) {
    const gasModel  = MODEL_MAP[payload.model] ?? MODEL_MAP.openai;
    const workspace = workspaceStore.getWorkspace();
    const user      = userStore.getUser();
    const userName  = user?.user_metadata?.full_name ?? user?.email ?? 'Người dùng';

    const data = await callGasRunBuilder({
      provider:    'openai',
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
      provider: 'openai',
      ms:       0,
    };
  }
}

function _estimateTokens(messages, responseText) {
  const inputText  = (messages ?? []).map((m) => m.content).join(' ');
  const prompt     = Math.ceil(inputText.length    / 4);
  const completion = Math.ceil(responseText.length / 4);
  return { prompt, completion, total: prompt + completion };
}

registerProvider('openai', new OpenAIProvider());
