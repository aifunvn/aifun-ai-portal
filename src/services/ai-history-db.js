import { supabase }  from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

// Cost constants — Claude Sonnet 4.6 (USD per million tokens)
const COST_INPUT_PM  = 3.0;
const COST_OUTPUT_PM = 15.0;

export function estimateCost(inputTokens, outputTokens, provider) {
  if (provider === 'claude') {
    return (inputTokens * COST_INPUT_PM + outputTokens * COST_OUTPUT_PM) / 1_000_000;
  }
  return 0;
}

function toRow(entry) {
  const input  = entry.inputTokens  ?? entry.tokens?.prompt     ?? 0;
  const output = entry.outputTokens ?? entry.tokens?.completion ?? 0;
  return {
    workspace_id:     entry.workspaceId,
    user_id:          userStore.getUser()?.id ?? null,
    builder_id:       entry.builderId       ?? null,
    builder_name:     entry.builderName     ?? null,
    provider:         entry.provider        ?? null,
    model:            entry.model           ?? null,
    prompt:           entry.prompt          ?? null,
    response_time_ms: entry.responseTimeMs  ?? 0,
    input_tokens:     input,
    output_tokens:    output,
    total_tokens:     input + output,
    estimated_cost:   estimateCost(input, output, entry.provider),
    status:           entry.status          ?? 'completed',
    error_message:    entry.errorMessage    ?? null,
  };
}

function fromRow(row) {
  return {
    id:             row.id,
    workspaceId:    row.workspace_id,
    userId:         row.user_id,
    builderId:      row.builder_id,
    builderName:    row.builder_name,
    provider:       row.provider,
    model:          row.model,
    prompt:         row.prompt,
    responseTimeMs: row.response_time_ms ?? 0,
    inputTokens:    row.input_tokens     ?? 0,
    outputTokens:   row.output_tokens    ?? 0,
    totalTokens:    row.total_tokens     ?? 0,
    estimatedCost:  parseFloat(row.estimated_cost ?? 0),
    status:         row.status,
    errorMessage:   row.error_message,
    createdAt:      row.created_at,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function insertRequest(entry) {
  const { error } = await supabase.from('ai_requests').insert(toRow(entry));
  if (error) throw error;
}

export async function listRequests(workspaceId, {
  query    = '',
  builder  = 'all',
  provider = 'all',
  status   = 'all',
  dateFrom = null,   // ISO string
  dateTo   = null,   // ISO string
  sort     = 'newest',
  limit    = 20,
  offset   = 0,
} = {}) {
  let q = supabase
    .from('ai_requests')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  if (query) {
    const safe = query.replace(/[%_]/g, '\\$&');
    q = q.or(`builder_name.ilike.%${safe}%,provider.ilike.%${safe}%,model.ilike.%${safe}%`);
  }
  if (builder  !== 'all') q = q.eq('builder_id', builder);
  if (provider !== 'all') q = q.eq('provider',   provider);
  if (status   !== 'all') q = q.eq('status',     status);
  if (dateFrom)           q = q.gte('created_at', dateFrom);
  if (dateTo)             q = q.lte('created_at', dateTo);

  q = sort === 'oldest'
    ? q.order('created_at', { ascending: true })
    : q.order('created_at', { ascending: false });

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { requests: (data ?? []).map(fromRow), total: count ?? 0 };
}

export async function getStats(workspaceId) {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, monthRes, topBuildersRes, topProvidersRes, failedRes] = await Promise.all([
    // Today: tokens + cost
    supabase.from('ai_requests')
      .select('total_tokens, estimated_cost, status')
      .eq('workspace_id', workspaceId)
      .gte('created_at', todayStart),

    // This month: all requests for counts + cost
    supabase.from('ai_requests')
      .select('total_tokens, estimated_cost, status, builder_name, provider')
      .eq('workspace_id', workspaceId)
      .gte('created_at', monthStart),

    // Top builders (last 30 days)
    supabase.from('ai_requests')
      .select('builder_id, builder_name')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),

    // Top providers (last 30 days)
    supabase.from('ai_requests')
      .select('provider')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),

    // Failed requests count
    supabase.from('ai_requests')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'failed')
      .gte('created_at', monthStart),
  ]);

  const today = todayRes.data ?? [];
  const month = monthRes.data ?? [];

  const todayTokens  = today.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const todayCost    = today.reduce((s, r) => s + parseFloat(r.estimated_cost ?? 0), 0);
  const monthTokens  = month.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const monthCost    = month.reduce((s, r) => s + parseFloat(r.estimated_cost ?? 0), 0);
  const monthCount   = month.length;
  const failedCount  = failedRes.count ?? 0;

  // Top builders — count occurrences
  const bMap = new Map();
  (topBuildersRes.data ?? []).forEach(({ builder_id, builder_name }) => {
    const key = builder_id ?? 'unknown';
    bMap.set(key, { id: key, name: builder_name ?? key, count: (bMap.get(key)?.count ?? 0) + 1 });
  });
  const topBuilders = [...bMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  // Top providers
  const pMap = new Map();
  (topProvidersRes.data ?? []).forEach(({ provider }) => {
    const key = provider ?? 'unknown';
    pMap.set(key, { id: key, name: key, count: (pMap.get(key)?.count ?? 0) + 1 });
  });
  const topProviders = [...pMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    todayTokens, todayCost,
    monthTokens, monthCost, monthCount,
    failedCount,
    topBuilders, topProviders,
  };
}
