import { saveDoc, listDocs, getDoc, deleteDoc } from './document-db.js';

// In-memory cache — populated on save and refreshed on list fetch.
// Acts as fallback when Supabase is unavailable (no auth, network error).
const _cache = new Map();

function _cacheAdd(wsId, doc) {
  if (!_cache.has(wsId)) _cache.set(wsId, []);
  // Replace if exists, otherwise prepend
  const list = _cache.get(wsId).filter((d) => d.id !== doc.id);
  _cache.set(wsId, [doc, ...list]);
}

function _cacheRemove(wsId, docId) {
  if (!_cache.has(wsId)) return;
  _cache.set(wsId, _cache.get(wsId).filter((d) => d.id !== docId));
}

function _cacheFilter(wsId, query) {
  const docs = _cache.get(wsId) ?? [];
  if (!query) return [...docs];
  const q = query.toLowerCase();
  return docs.filter((d) =>
    d.title.toLowerCase().includes(q) ||
    (d.content ?? '').toLowerCase().includes(q) ||
    (d.builderName ?? '').toLowerCase().includes(q),
  );
}

// ── Public API ─────────────────────────────────────────────────────────────────

// Synchronous: updates cache immediately, persists to DB in background.
export function saveDocument(doc) {
  const wsId = doc.workspace?.id ?? '_default';
  _cacheAdd(wsId, doc);
  saveDoc(doc).catch(() => {}); // fire-and-forget; never throws
  return doc;
}

// Async: fetches from Supabase, falls back to cache on error.
export async function listDocuments(workspaceId, { query = '' } = {}) {
  try {
    const docs = await listDocs(workspaceId, { query });
    _cache.set(workspaceId, docs); // refresh cache with DB truth
    return docs;
  } catch {
    return _cacheFilter(workspaceId, query);
  }
}

// Async: checks cache first, then Supabase.
export async function getDocument(workspaceId, docId) {
  const cached = (_cache.get(workspaceId) ?? []).find((d) => d.id === docId);
  if (cached) return cached;
  try {
    return await getDoc(workspaceId, docId);
  } catch {
    return null;
  }
}

// Async: removes from cache and soft-deletes in DB.
export async function deleteDocument(docId, workspaceId) {
  if (workspaceId) _cacheRemove(workspaceId, docId);
  try {
    await deleteDoc(docId);
  } catch {} // best-effort; cache already updated
}

export function hasDocuments(workspaceId) {
  return (_cache.get(workspaceId)?.length ?? 0) > 0;
}
