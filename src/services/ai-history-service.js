import { insertRequest, listRequests, getStats } from './ai-history-db.js';

// In-memory fallback cache — populated on list fetch
const _cache = new Map();  // workspaceId → request[]

// ── Public API ────────────────────────────────────────────────────────────────

export function recordRequest(entry) {
  // Fire-and-forget — never blocks UI
  insertRequest(entry).catch(() => {});
}

export async function listHistory(workspaceId, opts = {}) {
  try {
    const result = await listRequests(workspaceId, opts);
    _cache.set(workspaceId, result.requests);
    return result;
  } catch {
    const cached = _cache.get(workspaceId) ?? [];
    const q = opts.query?.toLowerCase();
    const filtered = q
      ? cached.filter((r) =>
          (r.builderName ?? '').toLowerCase().includes(q) ||
          (r.provider    ?? '').toLowerCase().includes(q))
      : [...cached];
    const sorted = opts.sort === 'oldest'
      ? filtered.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : filtered.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limit  = opts.limit  ?? 20;
    const offset = opts.offset ?? 0;
    return { requests: sorted.slice(offset, offset + limit), total: sorted.length };
  }
}

export async function getHistoryStats(workspaceId) {
  try {
    return await getStats(workspaceId);
  } catch {
    // Derive from cache on fallback
    const cached = _cache.get(workspaceId) ?? [];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const today = cached.filter((r) => new Date(r.createdAt) >= todayStart);
    const month = cached.filter((r) => new Date(r.createdAt) >= monthStart);

    return {
      todayTokens:   today.reduce((s, r) => s + r.totalTokens,  0),
      todayCost:     today.reduce((s, r) => s + r.estimatedCost, 0),
      monthTokens:   month.reduce((s, r) => s + r.totalTokens,  0),
      monthCost:     month.reduce((s, r) => s + r.estimatedCost, 0),
      monthCount:    month.length,
      failedCount:   cached.filter((r) => r.status === 'failed').length,
      topBuilders:   [],
      topProviders:  [],
    };
  }
}
