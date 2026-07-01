// ── Gemini Provider — Sprint 18B (STUB) ───────────────────────────────────────
//
// Placeholder only. GAS-side Gemini integration planned for Sprint 19.
// Registering now so createProvider('gemini') fails gracefully with a clear
// message instead of "provider not registered" — better DX when builder author
// selects Gemini before GAS support lands.

import { BaseProvider, registerProvider } from './provider-interface.js';

class GeminiProvider extends BaseProvider {
  get id()    { return 'gemini'; }
  get label() { return 'Gemini (Google) — Sprint 19'; }

  async _fetch() {
    throw new Error('Gemini provider chưa được triển khai. Dự kiến Sprint 19.');
  }
}

registerProvider('gemini', new GeminiProvider());
