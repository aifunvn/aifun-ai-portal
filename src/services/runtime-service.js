import { executePipeline } from '../runtime/index.js';
import { saveDocument } from './document-service.js';
import { workspaceStore } from '../stores/workspace-store.js';

export async function runBuilder(builder, formData, options = {}) {
  const workspace = workspaceStore.getWorkspace();
  const { content, tokens, provider } = await executePipeline(builder, formData, options);

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
    createdAt:   new Date().toISOString(),
  });

  return { content, tokens, doc };
}
