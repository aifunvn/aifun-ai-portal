const routes = new Map();
let _currentRoute = null;
let _navGen       = 0;   // incremented on every resolve(); handlers can check staleness

function getHash() {
  return window.location.hash.slice(1) || '/';
}

function navigate(path) {
  window.location.hash = path;
}

function register(path, handler) {
  routes.set(path, handler);
}

async function resolve() {
  const gen  = ++_navGen;
  const path = getHash();
  const handler = routes.get(path) ?? routes.get('*');
  if (!handler) return;
  _currentRoute = path;
  try {
    await handler(path);
  } catch (err) {
    // Never let a page handler error freeze the router
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aifun:route-error', { detail: { path, err } }));
    }
  }
}

function current() {
  return _currentRoute;
}

// Returns true if this navigation generation is still the latest.
// Use inside slow async handlers to bail out if superseded.
function isCurrent(gen) {
  return gen === _navGen;
}

function init() {
  window.addEventListener('hashchange', resolve);
  resolve();
}

export const router = { register, navigate, init, current, isCurrent, getNavGen: () => _navGen };
