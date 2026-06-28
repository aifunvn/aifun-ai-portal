// Low-level schema loader — fetches JSON files and caches in-memory.
// Add new schema paths here as new builders are created.

const SCHEMA_URLS = [
  '/src/builders/schemas/prompt-builder.json',
  '/src/builders/schemas/sop-builder.json',
  '/src/builders/schemas/youtube-builder.json',
  '/src/builders/schemas/email-builder.json',
  '/src/builders/schemas/sales-builder.json',
  '/src/builders/schemas/content-builder.json',
  '/src/builders/schemas/crm-builder.json',
  '/src/builders/schemas/webinar-builder.json',
];

let _cache = null;

export async function loadAll() {
  if (_cache) return _cache;
  const results = await Promise.all(
    SCHEMA_URLS.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load builder schema: ${url} (${res.status})`);
      return res.json();
    })
  );
  _cache = results;
  return _cache;
}

export async function loadById(id) {
  const all = await loadAll();
  return all.find((s) => s.id === id) ?? null;
}

export function invalidateCache() {
  _cache = null;
}
