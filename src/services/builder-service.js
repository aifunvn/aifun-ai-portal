import { runProvider } from './provider-service.js';

/**
 * Generate AI output for a builder + form data.
 * Returns { content, tokens, provider }.
 * Sprint 6: swap 'mock' for the active workspace provider.
 */
export async function generateOutput(builder, formData) {
  const metaPrompt = builder.buildPrompt(formData);
  const result = await runProvider(metaPrompt, { provider: 'mock', formData });
  return {
    content:  result.content,
    tokens:   result.tokens,
    provider: result.provider,
  };
}

/**
 * Save generated output.
 * Sprint 6: persist to Google Drive + log to Sheets via GAS.
 */
export async function saveOutput(builder, formData, output) {
  const title = builder.buildTitle(formData);
  // Mock delay — real implementation calls GAS in Sprint 6
  await new Promise((r) => setTimeout(r, 700));
  return {
    id:        `doc_${Date.now()}`,
    title,
    content:   output.content,
    builder:   builder.id,
    createdAt: new Date().toISOString(),
  };
}
