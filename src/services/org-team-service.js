import { supabase } from '../lib/supabase.js';
import { requireOrgRole } from './permission-engine.js';

export async function listTeams(orgId) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id, name, slug, description, color, icon, created_at,
      team_members ( count )
    `)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(t => ({
    ...t,
    member_count: t.team_members?.[0]?.count ?? 0,
  }));
}

export async function getTeam(teamId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(user_id, role, joined_at)')
    .eq('id', teamId)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return data;
}

export async function createTeam(orgId, { name, slug, description, color, icon }, userId) {
  await requireOrgRole(orgId, 'manager', userId);
  const { data, error } = await supabase
    .from('teams')
    .insert({ org_id: orgId, name, slug, description, color: color ?? '#6366f1', icon, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  // Creator becomes team lead
  await supabase.from('team_members').insert({
    team_id: data.id, user_id: userId, role: 'lead', added_by: userId,
  });

  return data;
}

export async function updateTeam(orgId, teamId, patch, userId) {
  await requireOrgRole(orgId, 'manager', userId);
  const allowed = ['name', 'slug', 'description', 'color', 'icon'];
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase
    .from('teams')
    .update(safe)
    .eq('id', teamId)
    .eq('org_id', orgId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTeam(orgId, teamId, userId) {
  await requireOrgRole(orgId, 'admin', userId);
  const { error } = await supabase
    .from('teams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('org_id', orgId);
  if (error) throw error;
}

export async function addTeamMember(teamId, targetUserId, role, actorId, orgId) {
  await requireOrgRole(orgId, 'manager', actorId);
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: targetUserId, role: role ?? 'member', added_by: actorId });
  if (error) throw error;
}

export async function removeTeamMember(teamId, targetUserId, actorId, orgId) {
  await requireOrgRole(orgId, 'manager', actorId);
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', targetUserId);
  if (error) throw error;
}
