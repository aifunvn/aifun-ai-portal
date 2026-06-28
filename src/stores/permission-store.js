import { userStore } from './user-store.js';

// Reactive layer over userStore.permissions.
// Components subscribe here instead of userStore so permission changes
// trigger targeted re-renders without coupling to unrelated user state.
const _subs = new Set();

userStore.subscribe(() => {
  _subs.forEach((fn) => fn());
});

export const permissionStore = {
  has(permission) {
    return userStore.hasPermission(permission);
  },

  subscribe(fn) {
    _subs.add(fn);
    fn();
    return () => _subs.delete(fn);
  },
};
