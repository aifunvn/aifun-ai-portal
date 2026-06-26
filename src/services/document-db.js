import { supabase }   from '../lib/supabase.js';
import { userStore }  from '../stores/user-store.js';

// ── Row mappers ───────────────────────────────────────────────────────────────

function toRow(doc) {
  return {
    id:                doc.id,
    workspace_id:      doc.workspace?.id ?? '_default',
    user_id:           userStore.getUser()?.id ?? null,
    title:             doc.title,
    content:           doc.content,
    builder_id:        doc.builderId        ?? null,
    builder_name:      doc.builderName      ?? null,
    provider:          doc.provider         ?? null,
    model:             doc.model            ?? null,
    doc_url:           doc.docUrl           ?? null,
    tokens_prompt:     doc.tokens?.prompt     ?? 0,
    tokens_completion: doc.tokens?.completion ?? 0,
    tokens_total:      doc.tokens?.total      ?? 0,
    form_data:         doc.formData         ?? null,
    created_at:        doc.createdAt        ?? new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    id:          row.id,
    title:       row.title,
    content:     row.content,
    builderId:   row.builder_id,
    builderName: row.builder_name,
    provider:    row.provider,
    model:       row.model,
    docUrl:      row.doc_url,
    workspace:   { id: row.workspace_id },
    formData:    row.form_data,
    tokens: {
      prompt:     row.tokens_prompt     ?? 0,
      completion: row.tokens_completion ?? 0,
      total:      row.tokens_total      ?? 0,
    },
    createdAt: row.created_at,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function saveDoc(doc) {
  const { error } = await supabase.from('documents').upsert(toRow(doc));
  if (error) throw error;
}

export async function listDocs(workspaceId, { query = '' } = {}) {
  let q = supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (query) {
    const safe = query.replace(/[%_]/g, '\\$&');
    q = q.or(`title.ilike.%${safe}%,builder_name.ilike.%${safe}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function getDoc(workspaceId, docId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteDoc(docId) {
  const { error } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', docId);
  if (error) throw error;
}
