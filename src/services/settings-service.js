import { supabase }    from '../lib/supabase.js';
import { userStore }   from '../stores/user-store.js';

// ── In-memory cache (TTL: session) ────────────────────────────
const _settingsCache = new Map();

const _DEFAULTS = {
  display_name: '',
  description:  '',
  timezone:     'Asia/Ho_Chi_Minh',
  ai_language:  'vi',
  logo_url:     '',
  brand_color:  '#6366f1',
  favicon_url:  '',
  metadata:     {},
};

// ── Workspace Settings ─────────────────────────────────────────

export async function getWorkspaceSettings(workspaceId) {
  if (!workspaceId) return { ..._DEFAULTS };
  if (_settingsCache.has(workspaceId)) return _settingsCache.get(workspaceId);

  try {
    const { data, error } = await supabase
      .from('workspace_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    const settings = _toSettings(data);
    _settingsCache.set(workspaceId, settings);
    return settings;
  } catch {
    return { ..._DEFAULTS };
  }
}

export async function updateWorkspaceSettings(workspaceId, patch) {
  if (!workspaceId) return false;

  const payload = {
    workspace_id: workspaceId,
    ..._cleanPatch(patch),
  };

  try {
    const { error } = await supabase
      .from('workspace_settings')
      .upsert(payload, { onConflict: 'workspace_id' });

    if (error) throw error;
    _settingsCache.delete(workspaceId);
    return true;
  } catch {
    return false;
  }
}

// ── Profile ───────────────────────────────────────────────────

export async function getProfile() {
  const user = (await supabase.auth.getUser()).data?.user;
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return _toProfile(data, user);
  } catch {
    return _toProfile(null, user);
  }
}

export async function updateProfile(patch) {
  const user = (await supabase.auth.getUser()).data?.user;
  if (!user) return false;

  const allowed = {};
  if (patch.fullName  !== undefined) allowed.full_name  = patch.fullName.trim();
  if (patch.avatarUrl !== undefined) allowed.avatar_url = patch.avatarUrl.trim() || null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, email: user.email, ...allowed }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    // Keep userStore in sync so topbar reflects new name/avatar immediately.
    const profile = _toProfile(data, user);
    userStore.set({ profile });
    return true;
  } catch {
    return false;
  }
}

export async function sendPasswordReset() {
  const user = (await supabase.auth.getUser()).data?.user;
  if (!user?.email) return false;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/v4.html#/auth/reset-password`,
    });
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ── Danger Zone ───────────────────────────────────────────────

export async function deleteAllDocuments(workspaceId) {
  if (!workspaceId) return { deleted: 0, error: 'no_workspace' };

  try {
    const { data, error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .select('id');

    if (error) throw error;
    return { deleted: (data ?? []).length, error: null };
  } catch (err) {
    return { deleted: 0, error: err?.message ?? 'unknown' };
  }
}

// ── Private helpers ───────────────────────────────────────────

function _toSettings(row) {
  if (!row) return { ..._DEFAULTS };
  return {
    display_name: row.display_name ?? '',
    description:  row.description  ?? '',
    timezone:     row.timezone     ?? 'Asia/Ho_Chi_Minh',
    ai_language:  row.ai_language  ?? 'vi',
    logo_url:     row.logo_url     ?? '',
    brand_color:  row.brand_color  ?? '#6366f1',
    favicon_url:  row.favicon_url  ?? '',
    metadata:     row.metadata     ?? {},
  };
}

function _toProfile(row, user) {
  const fullName = row?.full_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Người dùng';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id:        row?.id        ?? user?.id  ?? '',
    email:     row?.email     ?? user?.email ?? '',
    fullName,
    initials,
    avatarUrl: row?.avatar_url ?? null,
  };
}

function _cleanPatch(patch) {
  const allowed = {};
  const fields  = ['display_name', 'description', 'timezone', 'ai_language', 'logo_url', 'brand_color', 'favicon_url'];
  fields.forEach((f) => {
    if (patch[f] !== undefined) allowed[f] = patch[f];
  });
  return allowed;
}
