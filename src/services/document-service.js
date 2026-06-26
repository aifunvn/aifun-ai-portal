// In-memory document store keyed by workspace ID.
// Sprint 7 will add Supabase + Google Drive persistence.
const _store = new Map();

export function saveDocument(doc) {
  const wsId = doc.workspace?.id ?? '_default';
  if (!_store.has(wsId)) _store.set(wsId, []);
  _store.get(wsId).unshift(doc);
  return doc;
}

export function listDocuments(workspaceId, { query = '' } = {}) {
  const docs = _store.get(workspaceId) ?? [];
  if (!query) return [...docs];
  const q = query.toLowerCase();
  return docs.filter((d) =>
    d.title.toLowerCase().includes(q) ||
    d.content.toLowerCase().includes(q) ||
    (d.builderName ?? '').toLowerCase().includes(q)
  );
}

export function getDocument(workspaceId, docId) {
  return (_store.get(workspaceId) ?? []).find((d) => d.id === docId) ?? null;
}

export function hasDocuments(workspaceId) {
  return (_store.get(workspaceId)?.length ?? 0) > 0;
}
