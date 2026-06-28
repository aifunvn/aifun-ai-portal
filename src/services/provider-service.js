import { run as providerRun, listProviders as listAll } from '../providers/provider-manager.js';

export async function runProvider(metaPrompt, options = {}) {
  return providerRun(metaPrompt, options);
}

export function listProviders() {
  return listAll();
}
