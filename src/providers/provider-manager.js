import { mockProvider }   from './mock-provider.js';
import { claudeProvider } from './claude-provider.js';

const PROVIDERS = {
  mock:   mockProvider,
  claude: claudeProvider,
};

export function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label }));
}

export async function run(metaPrompt, options = {}) {
  const key      = options.provider ?? 'mock';
  const provider = PROVIDERS[key] ?? PROVIDERS.mock;

  try {
    return await provider.run(metaPrompt, options);
  } catch (err) {
    if (key !== 'mock') {
      const fallbackResult = await PROVIDERS.mock.run(metaPrompt, options);
      return { ...fallbackResult, fallback: true, fallbackReason: err.message };
    }
    throw err;
  }
}
