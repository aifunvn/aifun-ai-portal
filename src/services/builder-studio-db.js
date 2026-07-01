import { supabase }  from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

// ── Row mappers ───────────────────────────────────────────────────────────────

function toRow(b, workspaceId) {
  return {
    workspace_id:      workspaceId,
    name:              b.name,
    description:       b.description ?? null,
    category:          b.category ?? 'Khac',
    icon:              b.icon ?? 'sparkles',
    status:            b.status ?? 'draft',
    system_prompt:     b.systemPrompt   ?? '',
    prompt_template:   b.promptTemplate ?? '',
    model:             b.model ?? 'claude',
    temperature:       b.temperature ?? 0.7,
    max_tokens:        b.maxTokens ?? 4096,
    knowledge_sources: b.knowledgeSources ?? [],
  };
}

function fromRow(row) {
  return {
    id:               row.id,
    workspaceId:      row.workspace_id,
    name:             row.name,
    description:      row.description,
    category:         row.category,
    icon:             row.icon,
    status:           row.status,
    systemPrompt:     row.system_prompt,
    promptTemplate:   row.prompt_template,
    model:            row.model,
    temperature:      parseFloat(row.temperature ?? 0.7),
    maxTokens:        row.max_tokens,
    knowledgeSources: row.knowledge_sources ?? [],
    currentVersion:   row.current_version,
    createdBy:        row.created_by,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

function fromVersionRow(row) {
  return {
    id:               row.id,
    builderId:        row.builder_id,
    version:          row.version,
    name:             row.name,
    description:      row.description,
    systemPrompt:     row.system_prompt,
    promptTemplate:   row.prompt_template,
    model:            row.model,
    temperature:      parseFloat(row.temperature ?? 0.7),
    maxTokens:        row.max_tokens,
    knowledgeSources: row.knowledge_sources ?? [],
    changeNote:       row.change_note,
    createdBy:        row.created_by,
    createdAt:        row.created_at,
  };
}

function fromAnalyticsRow(row) {
  return {
    id:             row.id,
    builderId:      row.builder_id,
    eventType:      row.event_type,
    success:        row.success,
    tokensUsed:     row.tokens_used,
    responseTimeMs: row.response_time_ms,
    createdAt:      row.created_at,
  };
}

// ── Builders CRUD ────────────────────────────────────────────────────────────

export async function listBuilders(workspaceId, { status = 'all', query = '' } = {}) {
  let q = supabase
    .from('custom_builders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (status !== 'all') q = q.eq('status', status);
  if (query) {
    const safe = query.replace(/[%_]/g, '\\$&');
    q = q.ilike('name', `%${safe}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function getBuilderRow(id) {
  const { data, error } = await supabase
    .from('custom_builders')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function insertBuilder(builder, workspaceId) {
  const row = toRow(builder, workspaceId);
  row.created_by = userStore.getUser()?.id;
  const { data, error } = await supabase.from('custom_builders').insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateBuilder(id, builder, workspaceId) {
  const row = toRow(builder, workspaceId);
  const { data, error } = await supabase
    .from('custom_builders')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function setBuilderStatus(id, status) {
  const { data, error } = await supabase
    .from('custom_builders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function setBuilderVersion(id, version) {
  const { error } = await supabase
    .from('custom_builders')
    .update({ current_version: version })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteBuilder(id) {
  // Use a SECURITY DEFINER RPC instead of a plain UPDATE.
  //
  // Root cause (migration 013c): PostgreSQL RLS checks that the new row
  // after UPDATE still satisfies the SELECT policy. Our SELECT policy
  // requires `deleted_at IS NULL`. A soft-delete sets deleted_at = now(),
  // so the new row fails that check → 42501. The SECURITY DEFINER function
  // bypasses the SELECT-policy visibility check while still verifying
  // workspace membership before updating.
  const { data, error } = await supabase.rpc('_aifun_soft_delete_builder', { p_id: id });

  if (error) throw error;

  if (!data) {
    throw new Error('Không tìm thấy Builder hoặc bạn không có quyền xóa.');
  }
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function insertVersion(builderId, version, builder, changeNote) {
  const row = {
    builder_id:        builderId,
    version,
    name:              builder.name,
    description:       builder.description ?? null,
    system_prompt:     builder.systemPrompt   ?? '',
    prompt_template:   builder.promptTemplate ?? '',
    model:             builder.model ?? 'claude',
    temperature:       builder.temperature ?? 0.7,
    max_tokens:        builder.maxTokens ?? 4096,
    knowledge_sources: builder.knowledgeSources ?? [],
    change_note:       changeNote ?? null,
    created_by:        userStore.getUser()?.id,
  };
  const { error } = await supabase.from('custom_builder_versions').insert(row);
  if (error) throw error;
}

export async function listVersions(builderId) {
  const { data, error } = await supabase
    .from('custom_builder_versions')
    .select('*')
    .eq('builder_id', builderId)
    .order('version', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromVersionRow);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function recordAnalyticsEvent(builderId, workspaceId, entry) {
  const row = {
    builder_id:       builderId,
    workspace_id:      workspaceId,
    event_type:        entry.eventType ?? 'test_run',
    success:           entry.success ?? true,
    tokens_used:       entry.tokensUsed ?? 0,
    response_time_ms:  entry.responseTimeMs ?? 0,
    actor_id:          userStore.getUser()?.id ?? null,
  };
  const { error } = await supabase.from('custom_builder_analytics').insert(row);
  if (error) throw error;
}

export async function listAnalyticsEvents(builderId, limit = 100) {
  const { data, error } = await supabase
    .from('custom_builder_analytics')
    .select('*')
    .eq('builder_id', builderId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(fromAnalyticsRow);
}
