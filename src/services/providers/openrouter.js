// ── OpenRouter Provider — Sprint 18B (STUB) ───────────────────────────────────
//
// Placeholder only. OpenRouter integration planned for Sprint 19.

import { BaseProvider, registerProvider } from './provider-interface.js';

class OpenRouterProvider extends BaseProvider {
  get id()    { return 'openrouter'; }
  get label() { return 'OpenRouter — Sprint 19'; }

  async _fetch() {
    throw new Error('OpenRouter provider chưa được triển khai. Dự kiến Sprint 19.');
  }
}

registerProvider('openrouter', new OpenRouterProvider());
