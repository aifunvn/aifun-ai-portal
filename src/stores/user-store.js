const _subs = new Set();
let _state = { user: null, profile: null, role: null, permissions: [] };

function _notify() {
  _subs.forEach((fn) => fn({ ..._state }));
}

export const userStore = {
  getUser:    () => _state.user,
  getProfile: () => _state.profile,
  getRole:    () => _state.role,

  hasPermission(p) {
    return _state.permissions.includes('*') || _state.permissions.includes(p);
  },

  set(partial) {
    _state = { ..._state, ...partial };
    _notify();
  },

  subscribe(fn) {
    _subs.add(fn);
    fn({ ..._state });
    return () => _subs.delete(fn);
  },
};
