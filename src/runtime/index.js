import { runProvider } from '../services/provider-service.js';

export async function executePipeline(builder, formData, options = {}) {
  const metaPrompt = builder.buildPrompt(formData);
  const result = await runProvider(metaPrompt, {
    provider:    options.provider ?? 'mock',
    formData,
    builderId:   builder.id,
    builderName: builder.name,
    title:       builder.buildTitle(formData),
  });
  return {
    metaPrompt,
    content:        result.content,
    tokens:         result.tokens,
    provider:       result.provider,
    model:          result.model,
    docUrl:         result.docUrl  ?? null,
    fallback:       result.fallback ?? false,
    fallbackReason: result.fallbackReason ?? null,
  };
}
