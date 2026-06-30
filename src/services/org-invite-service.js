import { supabase } from '../lib/supabase.js';
import { requireOrgRole } from './permission-engine.js';

export async function listPendingInvites(orgId, actorId) {
  await requireOrgRole(orgId, 'manager', actorId);
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, team_id, created_at, expires_at, invited_by')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function sendInvite(orgId, { email, role, teamId, message }, actorId) {
  await requireOrgRole(orgId, 'manager', actorId);
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      org_id:     orgId,
      email:      email.trim().toLowerCase(),
      role:       role ?? 'editor',
      team_id:    teamId ?? null,
      message:    message ?? null,
      invited_by: actorId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function revokeInvite(inviteId, orgId, actorId) {
  await requireOrgRole(orgId, 'manager', actorId);
  const { error } = await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('org_id', orgId);
  if (error) throw error;
}

export async function lookupInviteByToken(token) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error) return null;
  return data;
}

export async function acceptInvite(token, userId) {
  const invite = await lookupInviteByToken(token);
  if (!invite) throw new Error('Lời mời không hợp lệ hoặc đã hết hạn');

  // Add to org as member
  const { error: memberErr } = await supabase
    .from('organization_members')
    .upsert({ org_id: invite.org_id, user_id: userId, role: invite.role, invited_by: invite.invited_by });
  if (memberErr) throw memberErr;

  // Optionally add to team
  if (invite.team_id) {
    await supabase.from('team_members').upsert({
      team_id: invite.team_id, user_id: userId, role: 'member', added_by: invite.invited_by,
    });
  }

  // Mark accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return invite;
}
