import { supabase } from '../lib/supabase.js';
import { requireOrgRole, invalidateOrgRoleCache } from './permission-engine.js';

export async function createOrg({ name, slug, userId }) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, slug, owner_id: userId })
    .select()
    .single();
  if (error) throw error;

  // Owner is also a member
  await supabase.from('organization_members').insert({
    org_id: data.id, user_id: userId, role: 'owner',
  });

  return data;
}

export async function getOrg(orgId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return data;
}

export async function listUserOrgs(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(*)')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map(r => ({ ...r.organizations, my_role: r.role }));
}

export async function updateOrg(orgId, patch, userId) {
  await requireOrgRole(orgId, 'admin', userId);
  const allowed = ['name', 'slug', 'avatar_url', 'description', 'metadata'];
  const safe = Object.fromEntries(
    Object.entries(patch).filter(([k]) => allowed.includes(k))
  );
  const { data, error } = await supabase
    .from('organizations')
    .update(safe)
    .eq('id', orgId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOrg(orgId, userId) {
  await requireOrgRole(orgId, 'owner', userId);
  const { error } = await supabase
    .from('organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', orgId);
  if (error) throw error;
  invalidateOrgRoleCache(orgId);
}
