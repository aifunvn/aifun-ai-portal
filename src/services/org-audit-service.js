/**
 * Write-only audit log. Never update or delete rows.
 * Owner/admin reads go through Supabase RLS + listAuditLogs().
 */
import { supabase } from '../lib/supabase.js';

const _PAGE = 30;

export async function writeAudit({
  orgId, workspaceId, actorId, actorEmail,
  action, severity = 'info',
  beforeState, afterState,
  ipAddress, userAgent, sessionId,
}) {
  const { error } = await supabase.from('audit_logs').insert({
    org_id:       orgId,
    workspace_id: workspaceId ?? null,
    actor_id:     actorId,
    actor_email:  actorEmail,
    action,
    severity,
    before_state: beforeState ?? null,
    after_state:  afterState  ?? null,
    ip_address:   ipAddress   ?? null,
    user_agent:   userAgent   ?? null,
    session_id:   sessionId   ?? null,
  });
  if (error) console.error('[audit] write failed', error.message);
}

export async function listAuditLogs(orgId, { cursor, limit, action, severity } = {}) {
  let q = supabase
    .from('audit_logs')
    .select('id, action, severity, actor_id, actor_email, before_state, after_state, ip_address, session_id, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit ?? _PAGE);

  if (cursor)   q = q.lt('created_at', cursor);
  if (action)   q = q.eq('action', action);
  if (severity) q = q.eq('severity', severity);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  return {
    items:       rows,
    next_cursor: rows.length === (limit ?? _PAGE) ? rows.at(-1)?.created_at : null,
  };
}
