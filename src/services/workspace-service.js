import { supabase, getUserSafe } from '../lib/supabase.js';
import { workspaceStore }       from '../stores/workspace-store.js';
import { userStore }            from '../stores/user-store.js';
import { loadOrCreateProfile }  from './user-profile-service.js';
import { loadRolePermissions }  from './role-service.js';

// Daily limits per plan — kept in sync with usage-limit-service.js
const PLAN_LIMITS = { free: 20, starter: 100, pro: 1000, business: 10000 };

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function _fetchMemberships(userId) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role_id, joined_at')
    .eq('user_id', userId);
  if (error || !data?.length) return null;
  return data;
}

async function _createDefaultMembership(userId, profile) {
  const wsId = `ws_${userId.slice(0, 12)}`;
  const plan  = 'pro';

  await supabase.from('workspace_members').upsert({
    workspace_id: wsId,
    user_id:      userId,
    role_id:      'owner',
  });

  await supabase.from('workspace_usage_limits').upsert({
    workspace_id: wsId,
    plan,
    daily_limit:  PLAN_LIMITS[plan],
    used_today:   0,
    reset_at:     new Date(Date.now() + 86400000).toISOString(),
  });

  return [{ workspace_id: wsId, role_id: 'owner' }];
}

async function _fetchPlan(wsId) {
  try {
    const { data } = await supabase
      .from('workspace_usage_limits')
      .select('plan')
      .eq('workspace_id', wsId)
      .single();
    return data?.plan ?? 'free';
  } catch {
    return 'free';
  }
}

function _buildWorkspaceMeta(wsId, plan, profile) {
  const initial = (profile?.fullName?.[0] ?? 'W').toUpperCase();
  return {
    id:      wsId,
    name:    profile?.fullName ? `${profile.fullName} Workspace` : 'My Workspace',
    slug:    wsId,
    plan,
    initial,
    ownerId: null,   // not needed — role comes from workspace_members
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initWorkspaceEngine() {
  const user = await getUserSafe();
  if (!user) return;

  userStore.set({ user });

  // 1. Profile
  const profile = await loadOrCreateProfile(user);

  // 2. Memberships → create default if none
  let memberships = await _fetchMemberships(user.id);
  if (!memberships) {
    memberships = await _createDefaultMembership(user.id, profile);
  }

  // 3. Build workspace objects (parallel plan fetches)
  const workspaces = await Promise.all(
    memberships.map(async (m) => {
      const plan = await _fetchPlan(m.workspace_id);
      return {
        ..._buildWorkspaceMeta(m.workspace_id, plan, profile),
        _roleId: m.role_id,
      };
    }),
  );

  // 4. Restore or pick first — one notification instead of two
  const savedId = workspaceStore.getSavedId();
  const active  = workspaces.find((w) => w.id === savedId) ?? workspaces[0];
  workspaceStore.setAll(workspaces, active);

  // 5. Load role + permissions from DB
  const role = await loadRolePermissions(active._roleId ?? 'viewer');
  userStore.set({ role, permissions: role.permissions });
}

export async function switchWorkspace(workspaceId) {
  const ws = workspaceStore.getWorkspaces().find((w) => w.id === workspaceId);
  if (!ws) return;

  workspaceStore.setWorkspace(ws);
  const role = await loadRolePermissions(ws._roleId ?? 'viewer');
  userStore.set({ role, permissions: role.permissions });
}
