const WS_KEY = 'aifun_workspace_id';
const _subs = new Set();
let _state = { workspace: null, workspaces: [] };

function _notify() {
  _subs.forEach((fn) => fn({ ..._state }));
}

export const workspaceStore = {
  getWorkspace:  () => _state.workspace,
  getWorkspaces: () => _state.workspaces,
  getSavedId:    () => localStorage.getItem(WS_KEY),

  setWorkspace(ws) {
    _state = { ..._state, workspace: ws };
    ws ? localStorage.setItem(WS_KEY, ws.id) : localStorage.removeItem(WS_KEY);
    _notify();
  },

  setWorkspaces(list) {
    _state = { ..._state, workspaces: list };
    _notify();
  },

  // Set both workspaces list and active workspace in one notification (avoids double render).
  setAll(list, active) {
    _state = { workspaces: list, workspace: active ?? list[0] ?? null };
    const ws = _state.workspace;
    ws ? localStorage.setItem(WS_KEY, ws.id) : localStorage.removeItem(WS_KEY);
    _notify();
  },

  subscribe(fn) {
    _subs.add(fn);
    fn({ ..._state });
    return () => _subs.delete(fn);
  },
};
