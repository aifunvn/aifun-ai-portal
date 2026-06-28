import { executePipeline } from '../runtime/index.js';
import { saveDocument }    from './document-service.js';
import { saveHistory }     from './history-db.js';
import { recordRequest }   from './ai-history-service.js';
import { workspaceStore }  from '../stores/workspace-store.js';

export async function runBuilder(builder, formData, options = {}) {
  const workspace = workspaceStore.getWorkspace();
  const wsId      = workspace?.id ?? '_default';
  const t0        = Date.now();

  let result;
  try {
    result = await executePipeline(builder, formData, options);
  } catch (err) {
    // Record failed request then re-throw so the UI can show the error
    recordRequest({
      workspaceId:    wsId,
      builderId:      builder.id,
      builderName:    builder.name,
      provider:       options.provider ?? 'mock',
      model:          null,
      responseTimeMs: Date.now() - t0,
      status:         'failed',
      errorMessage:   err?.message ?? 'Unknown error',
    });
    throw err;
  }

  const { content, tokens, provider, model, docUrl, fallback, fallbackReason } = result;
  const responseTimeMs = Date.now() - t0;

  const doc = saveDocument({
    id:          `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title:       builder.buildTitle(formData),
    content,
    builderId:   builder.id,
    builderName: builder.name,
    workspace,
    formData,
    tokens,
    provider,
    model,
    docUrl,
    createdAt:   new Date().toISOString(),
  });

  // Fire-and-forget — neither history write blocks the UI
  saveHistory({
    workspaceId:  wsId,
    builderId:    builder.id,
    builderName:  builder.name,
    provider,
    model,
    tokens,
    status:       fallback ? 'fallback' : 'completed',
    documentId:   doc.id,
  }).catch(() => {});

  recordRequest({
    workspaceId:    wsId,
    builderId:      builder.id,
    builderName:    builder.name,
    provider,
    model,
    prompt:         builder.buildPrompt?.(formData) ?? null,
    responseTimeMs,
    inputTokens:    tokens?.prompt     ?? 0,
    outputTokens:   tokens?.completion ?? 0,
    status:         fallback ? 'fallback' : 'completed',
    errorMessage:   fallback ? (fallbackReason ?? null) : null,
  });

  return { content, tokens, doc, provider, model, docUrl, fallback, fallbackReason };
}
