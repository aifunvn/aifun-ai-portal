import { supabase } from '../lib/supabase.js';
import { workspaceStore } from '../stores/workspace-store.js';
import { userStore } from '../stores/user-store.js';

const ROLES = {
  owner: {
    id: 'owner',
    label: 'Chủ sở hữu',
    permissions: ['*'],
  },
  admin: {
    id: 'admin',
    label: 'Quản trị viên',
    permissions: ['members:invite', 'builders:use', 'documents:create', 'marketplace:install', 'settings:manage'],
  },
  member: {
    id: 'member',
    label: 'Thành viên',
    permissions: ['builders:use', 'documents:create'],
  },
  viewer: {
    id: 'viewer',
    label: 'Người xem',
    permissions: ['documents:read'],
  },
};

// Mock data — replaced with Supabase queries in Sprint 4
function _buildMockWorkspaces(userId) {
  return [
    {
      id:      'ws_aifun_001',
      name:    'AIFUN Workspace',
      slug:    'aifun',
      plan:    'pro',
      initial: 'A',
      ownerId: userId,
    },
  ];
}

function _resolveRole(ws, userId) {
  return ws.ownerId === userId ? ROLES.owner : ROLES.member;
}

export async function initWorkspaceEngine() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Populate user store
  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Người dùng';
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  userStore.set({
    user,
    profile: { id: user.id, email: user.email, fullName, initials, avatarUrl: null },
  });

  // Load and restore workspaces
  const workspaces = _buildMockWorkspaces(user.id);
  workspaceStore.setWorkspaces(workspaces);

  const savedId = workspaceStore.getSavedId();
  const active  = workspaces.find((w) => w.id === savedId) ?? workspaces[0];
  workspaceStore.setWorkspace(active);

  const role = _resolveRole(active, user.id);
  userStore.set({ role, permissions: role.permissions });
}

export function switchWorkspace(workspaceId) {
  const ws = workspaceStore.getWorkspaces().find((w) => w.id === workspaceId);
  if (!ws) return;

  workspaceStore.setWorkspace(ws);

  const user = userStore.getUser();
  const role = _resolveRole(ws, user?.id);
  userStore.set({ role, permissions: role.permissions });
}
