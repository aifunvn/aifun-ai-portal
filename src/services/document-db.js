import { supabase }  from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

// ── Row mappers ───────────────────────────────────────────────────────────────

function toRow(doc) {
  return {
    id:                doc.id,
    workspace_id:      doc.workspace?.id ?? '_default',
    user_id:           userStore.getUser()?.id ?? null,
    title:             doc.title,
    content:           doc.content,
    prompt:            doc.prompt            ?? null,
    builder_id:        doc.builderId         ?? null,
    builder_name:      doc.builderName       ?? null,
    provider:          doc.provider          ?? null,
    model:             doc.model             ?? null,
    doc_url:           doc.docUrl            ?? null,
    tokens_prompt:     doc.tokens?.prompt     ?? 0,
    tokens_completion: doc.tokens?.completion ?? 0,
    tokens_total:      doc.tokens?.total      ?? 0,
    form_data:         doc.formData          ?? null,
    version:           doc.version           ?? 1,
    favorite:          doc.favorite          ?? false,
    pinned:            doc.pinned            ?? false,
    last_opened:       doc.lastOpened        ?? null,
    drive_sync_status: doc.driveSyncStatus   ?? 'none',
    cost_usd:          doc.costUsd           ?? 0,
    created_at:        doc.createdAt         ?? new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    id:             row.id,
    title:          row.title,
    content:        row.content,
    prompt:         row.prompt,
    builderId:      row.builder_id,
    builderName:    row.builder_name,
    provider:       row.provider,
    model:          row.model,
    docUrl:         row.doc_url,
    workspace:      { id: row.workspace_id },
    formData:       row.form_data,
    version:        row.version        ?? 1,
    favorite:       row.favorite       ?? false,
    pinned:         row.pinned         ?? false,
    lastOpened:     row.last_opened    ?? null,
    driveSyncStatus: row.drive_sync_status ?? 'none',
    costUsd:        row.cost_usd       ?? 0,
    tokens: {
      prompt:     row.tokens_prompt     ?? 0,
      completion: row.tokens_completion ?? 0,
      total:      row.tokens_total      ?? 0,
    },
    createdAt: row.created_at,
  };
}

function fromVersionRow(row) {
  return {
    id:         row.id,
    documentId: row.document_id,
    version:    row.version,
    title:      row.title,
    content:    row.content,
    prompt:     row.prompt,
    createdAt:  row.created_at,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function saveDoc(doc) {
  const { error } = await supabase.from('documents').upsert(toRow(doc));
  if (error) throw error;
}

export async function listDocs(workspaceId, {
  query   = '',
  filter  = 'all',   // 'all' | builderId string
  sort    = 'newest', // 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'favorites'
  limit   = 20,
  offset  = 0,
} = {}) {
  let q = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null);

  if (query) {
    const safe = query.replace(/[%_]/g, '\\$&');
    q = q.or(`title.ilike.%${safe}%,builder_name.ilike.%${safe}%`);
  }
  if (filter && filter !== 'all') {
    q = q.eq('builder_id', filter);
  }

  // Sort
  if (sort === 'oldest')     q = q.order('created_at', { ascending: true });
  else if (sort === 'title_asc')  q = q.order('title',      { ascending: true });
  else if (sort === 'title_desc') q = q.order('title',      { ascending: false });
  else if (sort === 'favorites')  q = q.order('favorite',   { ascending: false }).order('created_at', { ascending: false });
  else                             q = q.order('created_at', { ascending: false });

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { docs: (data ?? []).map(fromRow), total: count ?? 0 };
}

export async function listPinnedDocs(workspaceId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('pinned', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function listRecentDocs(workspaceId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .not('last_opened', 'is', null)
    .order('last_opened', { ascending: false })
    .limit(5);
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

export async function patchDoc(docId, fields) {
  const { error } = await supabase
    .from('documents')
    .update(fields)
    .eq('id', docId);
  if (error) throw error;
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function saveVersion(doc) {
  const { error } = await supabase.from('document_versions').insert({
    document_id:  doc.id,
    workspace_id: doc.workspace?.id ?? '_default',
    version:      doc.version ?? 1,
    title:        doc.title,
    content:      doc.content,
    prompt:       doc.prompt ?? null,
  });
  if (error && error.code !== '23505') throw error; // ignore duplicate version
}

export async function listVersions(docId) {
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', docId)
    .order('version', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromVersionRow);
}
