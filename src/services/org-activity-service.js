import { supabase } from '../lib/supabase.js';

const _PAGE = 30;

export async function logActivity(orgId, actorId, action, resourceType, resourceId, resourceName, metadata) {
  const { error } = await supabase.from('activity_logs').insert({
    org_id:        orgId,
    actor_id:      actorId,
    action,
    resource_type: resourceType,
    resource_id:   resourceId ?? null,
    resource_name: resourceName ?? null,
    metadata:      metadata ?? {},
  });
  if (error) console.error('[activity] log failed', error.message);
}

export async function listActivity(orgId, { cursor, limit, actorId, resourceType } = {}) {
  let q = supabase
    .from('activity_logs')
    .select(`
      id, action, resource_type, resource_id, resource_name, metadata, created_at,
      actor:actor_id ( id, email, raw_user_meta_data )
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit ?? _PAGE);

  if (cursor) q = q.lt('created_at', cursor);
  if (actorId) q = q.eq('actor_id', actorId);
  if (resourceType) q = q.eq('resource_type', resourceType);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  return {
    items:       rows,
    next_cursor: rows.length === (limit ?? _PAGE) ? rows.at(-1)?.created_at : null,
  };
}
