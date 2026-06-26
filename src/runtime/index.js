import { runProvider } from '../services/provider-service.js';

/**
 * Core pipeline: prompt → provider → normalised response.
 * Stateless — no workspace or persistence concerns here.
 */
export async function executePipeline(builder, formData, options = {}) {
  const metaPrompt = builder.buildPrompt(formData);
  const result = await runProvider(metaPrompt, {
    provider: options.provider ?? 'mock',
    formData,
  });
  return {
    metaPrompt,
    content:  result.content,
    tokens:   result.tokens,
    provider: result.provider,
  };
}
