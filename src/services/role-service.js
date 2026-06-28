import { supabase } from '../lib/supabase.js';

// Static fallback — used when DB is unavailable or role is 'owner' (wildcard)
const FALLBACK = {
  owner: {
    id: 'owner', label: 'Chủ sở hữu',
    permissions: ['*'],
  },
  admin: {
    id: 'admin', label: 'Quản trị viên',
    permissions: [
      'dashboard:read', 'builders:read', 'builders:run', 'builders:install',
      'documents:read', 'documents:create', 'documents:delete',
      'marketplace:read', 'marketplace:install',
      'settings:read', 'settings:update', 'billing:read', 'admin:read',
    ],
  },
  editor: {
    id: 'editor', label: 'Biên tập viên',
    permissions: [
      'dashboard:read', 'builders:read', 'builders:run',
      'documents:read', 'documents:create', 'documents:delete',
      'marketplace:read', 'settings:read',
    ],
  },
  viewer: {
    id: 'viewer', label: 'Người xem',
    permissions: ['dashboard:read', 'documents:read'],
  },
};

export async function loadRolePermissions(roleId) {
  if (roleId === 'owner') return FALLBACK.owner;

  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (error || !data?.length) return FALLBACK[roleId] ?? FALLBACK.viewer;

    const permissions = data.map((r) => r.permission_id);
    return { id: roleId, label: FALLBACK[roleId]?.label ?? roleId, permissions };
  } catch {
    return FALLBACK[roleId] ?? FALLBACK.viewer;
  }
}

export function getFallbackRole(roleId) {
  return FALLBACK[roleId] ?? FALLBACK.viewer;
}
