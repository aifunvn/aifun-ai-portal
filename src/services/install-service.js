import { supabase }     from '../lib/supabase.js';
import { userStore }    from '../stores/user-store.js';
import { safeStorage }  from '../utils/safe-storage.js';

// ── Local persistence (survives page reload, works without auth) ───────────────

const _LS_KEY  = (wsId) => `aifun_installs_${wsId}`;
const _subs    = new Set();

function _notify() { _subs.forEach((fn) => fn()); }

function _loadLocal(workspaceId) {
  try {
    const raw = safeStorage.getItem(_LS_KEY(workspaceId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function _saveLocal(workspaceId, set) {
  try { safeStorage.setItem(_LS_KEY(workspaceId), JSON.stringify([...set])); } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

export function subscribe(fn) {
  _subs.add(fn);
  return () => _subs.delete(fn);
}

export async function listInstalls(workspaceId) {
  try {
    const { data, error } = await supabase
      .from('marketplace_installs')
      .select('item_id')
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    const ids = (data ?? []).map((r) => r.item_id);
    // Sync local cache so fallback stays fresh
    _saveLocal(workspaceId, new Set(ids));
    return ids;
  } catch {
    return [..._loadLocal(workspaceId)];
  }
}

export async function isInstalled(workspaceId, itemId) {
  const ids = await listInstalls(workspaceId);
  return ids.includes(itemId);
}

export async function install(workspaceId, itemId) {
  const userId = userStore.getUser()?.id ?? null;
  // Optimistic local update
  const local = _loadLocal(workspaceId);
  local.add(itemId);
  _saveLocal(workspaceId, local);
  _notify();

  try {
    const { error } = await supabase
      .from('marketplace_installs')
      .upsert(
        { workspace_id: workspaceId, item_id: itemId, installed_by: userId },
        { onConflict: 'workspace_id,item_id' },
      );
    if (error) throw error;
  } catch {
    // Local fallback already applied — silent
  }
}

export async function uninstall(workspaceId, itemId) {
  // Optimistic local update
  const local = _loadLocal(workspaceId);
  local.delete(itemId);
  _saveLocal(workspaceId, local);
  _notify();

  try {
    const { error } = await supabase
      .from('marketplace_installs')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('item_id', itemId);
    if (error) throw error;
  } catch {
    // Local fallback already applied — silent
  }
}
