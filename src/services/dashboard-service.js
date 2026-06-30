import { supabase }                       from '../lib/supabase.js';
import { listInstalls }                   from './install-service.js';
import { listItems as listMpItems }       from './marketplace-service.js';
import { getHistoryStats, listHistory }   from './ai-history-service.js';
import { listDocuments, getRecentDocuments } from './document-service.js';
import { getUsage, getDailyLimit }        from './usage-limit-service.js';

// Each export below is an independent widget data-loader: every Dashboard
// section calls (and catches) its own loader, so one failing query never
// blocks the others from rendering. No fabricated numbers — a value we
// can't fetch is omitted/zeroed, never guessed.

export async function getWorkspaceInfo(workspace) {
  const usage = await getUsage(workspace?.id).catch(() => null);
  const plan  = usage?.plan ?? workspace?.plan ?? 'free';
  const remainingRequests = usage
    ? Math.max(getDailyLimit(plan) - (usage.used_today ?? 0), 0)
    : null;
  return { plan, remainingRequests };
}

export async function getKpis(workspaceId) {
  const [statsRes, docsRes, installsRes] = await Promise.allSettled([
    getHistoryStats(workspaceId),
    listDocuments(workspaceId, { limit: 1 }),
    listInstalls(workspaceId),
  ]);

  const aiRequests = statsRes.status === 'fulfilled' ? statsRes.value.monthCount  ?? 0 : 0;
  const tokens      = statsRes.status === 'fulfilled' ? statsRes.value.monthTokens ?? 0 : 0;
  const documents    = docsRes.status === 'fulfilled' ? docsRes.value.total ?? 0 : 0;
  const builders      = installsRes.status === 'fulfilled' ? installsRes.value.length : 0;

  return [
    { id: 'ai-requests', label: 'AI Requests', value: aiRequests, unit: '',   change: 0, positive: null },
    { id: 'documents',   label: 'Tài liệu',     value: documents,  unit: '',   change: 0, positive: null },
    { id: 'tokens',      label: 'Tokens dùng',  value: tokens,      unit: 'tk', change: 0, positive: null },
    { id: 'builders',    label: 'AI Builders',  value: builders,     unit: '',   change: 0, positive: null },
  ];
}

export async function getRecentDocumentsData(workspaceId) {
  let docs = await getRecentDocuments(workspaceId);
  if (!docs?.length) {
    const result = await listDocuments(workspaceId, { limit: 5, sort: 'newest' });
    docs = result.docs;
  }
  return docs.map((d) => ({
    name:      d.title,
    type:      d.builderName ?? 'Tài liệu',
    createdAt: new Date(d.lastOpened ?? d.createdAt).getTime(),
  }));
}

export async function getActivityFeed(workspaceId) {
  const [docsRes, reqRes] = await Promise.allSettled([
    listDocuments(workspaceId, { limit: 5, sort: 'newest' }),
    listHistory(workspaceId, { limit: 5 }),
  ]);

  const docs = docsRes.status === 'fulfilled' ? docsRes.value.docs : [];
  const reqs = reqRes.status === 'fulfilled' ? reqRes.value.requests : [];

  const docEvents = docs.map((d) => ({
    text: `Tạo tài liệu — "${d.title}"`,
    at:   new Date(d.createdAt).getTime(),
  }));
  const reqEvents = reqs
    .filter((r) => r.status !== 'failed')
    .map((r) => ({
      text: `Yêu cầu AI — ${r.builderName ?? r.provider ?? 'Builder'}`,
      at:   new Date(r.createdAt).getTime(),
    }));

  return [...docEvents, ...reqEvents]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);
}

export async function getInstalledBuildersData(workspaceId) {
  const [installIds, allItems] = await Promise.all([
    listInstalls(workspaceId),
    listMpItems(),
  ]);
  const idSet = new Set(installIds);
  return allItems
    .filter((i) => idSet.has(i.id))
    .map((i) => ({ id: i.id, name: i.name, docs: 0 }));
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export async function getTokensByDayData(workspaceId) {
  const since = new Date(Date.now() - 6 * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('ai_requests')
    .select('total_tokens, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since.toISOString());
  if (error) throw error;

  const buckets = new Map();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    buckets.set(d.toDateString(), 0);
  }
  (data ?? []).forEach((r) => {
    const dateKey = new Date(new Date(r.created_at).setHours(0, 0, 0, 0)).toDateString();
    if (buckets.has(dateKey)) buckets.set(dateKey, buckets.get(dateKey) + (r.total_tokens ?? 0));
  });

  return [...buckets.entries()].map(([dateKey, tokens]) => ({
    day:    DAY_LABELS[new Date(dateKey).getDay()],
    tokens,
  }));
}

export async function getAiUsageStats(workspaceId) {
  return getHistoryStats(workspaceId);
}
