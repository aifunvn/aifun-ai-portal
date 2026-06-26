import { workspaceStore } from '../stores/workspace-store.js';
import { userStore } from '../stores/user-store.js';

function cfg() {
  return window.AIFUN_CONFIG ?? {};
}

export const claudeProvider = {
  label: 'Claude (Anthropic)',

  async run(metaPrompt, options = {}) {
    const config  = cfg();
    const gasUrl  = config.gasWebAppUrl;
    if (!gasUrl) throw new Error('GAS endpoint chua duoc cau hinh (gasWebAppUrl).');

    const workspace = workspaceStore.getWorkspace();
    const user      = userStore.getUser();
    const userName  = user?.user_metadata?.full_name ?? user?.email ?? 'Nguoi dung';

    const payload = {
      action:        'generateDocument',
      skillId:       options.builderId  ?? 'custom',
      prompt:        metaPrompt,
      title:         options.title      ?? options.builderName ?? 'Tai lieu',
      formData:      options.formData   ?? {},
      provider:      'claude',
      folderId:      config.driveFolderId   ?? '',
      spreadsheetId: config.spreadsheetId  ?? '',
      user:          userName,
      workspace:     workspace?.name ?? '',
      timestamp:     new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeoutMs  = config.requestTimeout ?? 90000;
    const tid = setTimeout(() => controller.abort(), timeoutMs);

    const t0 = Date.now();
    let res;
    try {
      res = await fetch(gasUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`Yeu cau qua thoi gian (${timeoutMs / 1000}s). Vui long thu lai.`);
      throw new Error(`Khong the ket noi den GAS: ${err.message}`);
    } finally {
      clearTimeout(tid);
    }

    if (!res.ok) throw new Error(`GAS tra ve HTTP ${res.status}. Vui long thu lai.`);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('GAS tra ve phan hoi khong hop le (non-JSON).');
    }

    if (data.error) throw new Error(data.error);

    const content   = data.content ?? '';
    const latencyMs = Date.now() - t0;
    const pTokens   = Math.ceil(metaPrompt.length / 4);
    const cTokens   = Math.ceil(content.length / 4);

    return {
      content,
      provider:  'claude',
      model:     'claude-sonnet-4-6',
      docUrl:    data.docUrl  ?? null,
      docId:     data.docId   ?? null,
      latencyMs,
      tokens: { prompt: pTokens, completion: cTokens, total: pTokens + cTokens },
    };
  },
};
