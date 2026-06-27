import {
  saveDoc, listDocs, getDoc, deleteDoc, patchDoc,
  saveVersion, listVersions,
  listPinnedDocs, listRecentDocs,
} from './document-db.js';

// In-memory cache — populated on list fetch and save.
const _cache = new Map();

function _cacheAdd(wsId, doc) {
  if (!_cache.has(wsId)) _cache.set(wsId, []);
  const list = _cache.get(wsId).filter((d) => d.id !== doc.id);
  _cache.set(wsId, [doc, ...list]);
}

function _cacheRemove(wsId, docId) {
  if (!_cache.has(wsId)) return;
  _cache.set(wsId, _cache.get(wsId).filter((d) => d.id !== docId));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function saveDocument(doc) {
  const wsId = doc.workspace?.id ?? '_default';
  _cacheAdd(wsId, doc);
  saveDoc(doc).catch(() => {});
  saveVersion(doc).catch(() => {});
  return doc;
}

export async function listDocuments(workspaceId, opts = {}) {
  try {
    const result = await listDocs(workspaceId, opts);
    _cache.set(workspaceId, result.docs);
    return result;
  } catch {
    const cached = _cache.get(workspaceId) ?? [];
    const q = opts.query?.toLowerCase();
    const docs = q ? cached.filter((d) =>
      d.title.toLowerCase().includes(q) || (d.builderName ?? '').toLowerCase().includes(q)
    ) : [...cached];
    return { docs, total: docs.length };
  }
}

export async function getPinnedDocuments(workspaceId) {
  try {
    return await listPinnedDocs(workspaceId);
  } catch {
    return (_cache.get(workspaceId) ?? []).filter((d) => d.pinned).slice(0, 5);
  }
}

export async function getRecentDocuments(workspaceId) {
  try {
    return await listRecentDocs(workspaceId);
  } catch {
    return (_cache.get(workspaceId) ?? [])
      .filter((d) => d.lastOpened)
      .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
      .slice(0, 5);
  }
}

export async function getDocument(workspaceId, docId) {
  const cached = (_cache.get(workspaceId) ?? []).find((d) => d.id === docId);
  try {
    const doc = await getDoc(workspaceId, docId);
    // Update last_opened
    await patchDoc(docId, { last_opened: new Date().toISOString() }).catch(() => {});
    return doc;
  } catch {
    return cached ?? null;
  }
}

export async function deleteDocument(docId, workspaceId) {
  if (workspaceId) _cacheRemove(workspaceId, docId);
  try { await deleteDoc(docId); } catch {}
}

export async function toggleFavorite(docId, workspaceId, value) {
  const cached = (_cache.get(workspaceId) ?? []).find((d) => d.id === docId);
  if (cached) cached.favorite = value;
  await patchDoc(docId, { favorite: value }).catch(() => {});
}

export async function togglePinned(docId, workspaceId, value) {
  const cached = (_cache.get(workspaceId) ?? []).find((d) => d.id === docId);
  if (cached) cached.pinned = value;
  await patchDoc(docId, { pinned: value }).catch(() => {});
}

export async function updateDriveSync(docId, status) {
  await patchDoc(docId, { drive_sync_status: status }).catch(() => {});
}

export async function getVersionHistory(docId) {
  try { return await listVersions(docId); } catch { return []; }
}

export function hasDocuments(workspaceId) {
  return (_cache.get(workspaceId)?.length ?? 0) > 0;
}
