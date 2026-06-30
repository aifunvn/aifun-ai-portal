import { supabase } from '../lib/supabase.js';
import { requireOrgRole, invalidateOrgRoleCache } from './permission-engine.js';

export async function listMembers(orgId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id, role, status, joined_at,
      users:user_id ( id, email, raw_user_meta_data )
    `)
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(m => ({
    id:          m.id,
    user_id:     m.users?.id,
    email:       m.users?.email ?? '',
    display_name: m.users?.raw_user_meta_data?.display_name ?? m.users?.email ?? '',
    avatar_url:  m.users?.raw_user_meta_data?.avatar_url ?? null,
    role:        m.role,
    status:      m.status,
    joined_at:   m.joined_at,
  }));
}

export async function updateMemberRole(orgId, targetUserId, newRole, actorId) {
  await requireOrgRole(orgId, 'admin', actorId);
  if (newRole === 'owner') throw new Error('Cannot assign owner via this endpoint');

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);
  if (error) throw error;
  invalidateOrgRoleCache(orgId, targetUserId);
}

export async function suspendMember(orgId, targetUserId, actorId) {
  await requireOrgRole(orgId, 'admin', actorId);
  const { error } = await supabase
    .from('organization_members')
    .update({ status: 'suspended' })
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);
  if (error) throw error;
  invalidateOrgRoleCache(orgId, targetUserId);
}

export async function reactivateMember(orgId, targetUserId, actorId) {
  await requireOrgRole(orgId, 'admin', actorId);
  const { error } = await supabase
    .from('organization_members')
    .update({ status: 'active' })
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);
  if (error) throw error;
  invalidateOrgRoleCache(orgId, targetUserId);
}

export async function removeMember(orgId, targetUserId, actorId) {
  await requireOrgRole(orgId, 'admin', actorId);
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', targetUserId);
  if (error) throw error;
  invalidateOrgRoleCache(orgId, targetUserId);
}
