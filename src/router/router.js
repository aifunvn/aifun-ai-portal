const routes = new Map();
let _currentRoute = null;

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
  const path = getHash();
  const handler = routes.get(path) ?? routes.get('*');
  if (!handler) return;
  _currentRoute = path;
  await handler(path);
}

function current() {
  return _currentRoute;
}

function init() {
  window.addEventListener('hashchange', resolve);
  resolve();
}

export const router = { register, navigate, init, current };
