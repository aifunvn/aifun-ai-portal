// Safe wrapper around localStorage.
// Falls back to in-memory Map when storage is blocked
// (data: URLs, incognito strict mode, iframe sandbox, etc.).

const _mem = new Map();
let _checked = false;
let _available = false;

function _ok() {
  if (_checked) return _available;
  _checked = true;
  try {
    const T = '__aifun_st__';
    localStorage.setItem(T, '1');
    localStorage.removeItem(T);
    _available = true;
  } catch (_) {
    console.warn('[AIFUN] localStorage unavailable — using memory fallback');
    _available = false;
  }
  return _available;
}

export const safeStorage = {
  getItem(key) {
    if (_ok()) { try { return localStorage.getItem(key); } catch (_) {} }
    return _mem.has(key) ? _mem.get(key) : null;
  },

  setItem(key, value) {
    _mem.set(key, String(value));
    if (_ok()) { try { localStorage.setItem(key, value); } catch (_) {} }
  },

  removeItem(key) {
    _mem.delete(key);
    if (_ok()) { try { localStorage.removeItem(key); } catch (_) {} }
  },

  keys() {
    if (_ok()) { try { return Object.keys(localStorage); } catch (_) {} }
    return [..._mem.keys()];
  },

  clear() {
    _mem.clear();
    if (_ok()) { try { localStorage.clear(); } catch (_) {} }
  },

  isAvailable() { return _ok(); },
};
