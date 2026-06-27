import { supabase } from '../lib/supabase.js';
import { router } from '../router/router.js';
import { mountPage } from '../layouts/main-layout.js';
import { initWorkspaceEngine } from '../services/workspace-service.js';
import { render as renderLogin,    init as initLogin    } from '../auth/login.js';
import { render as renderRegister, init as initRegister } from '../auth/register.js';
import { render as renderForgot,   init as initForgot   } from '../auth/forgot-password.js';
import { render as renderReset,    init as initReset    } from '../auth/reset-password.js';
import { render as renderVerify,   init as initVerify   } from '../auth/verify-email.js';
import { render as renderDashboard, init as initDashboard } from '../pages/dashboard.js';
import { render as renderBuilders, init as initBuilders } from '../pages/builders.js';
import { render as renderDocuments, init as initDocuments } from '../pages/documents.js';
import { render as renderMarketplace, initMarketplace } from '../pages/marketplace.js';
import { render as renderHistory,   init as initHistory   } from '../pages/history.js';
import { render as renderReports     } from '../pages/reports.js';
import { render as renderSettings    } from '../pages/settings.js';

function mountAuth(html, initFn) {
  const root = document.getElementById('v4-root');
  if (!root) return;
  root.innerHTML = html;
  if (initFn) initFn();
}

async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { router.navigate('/auth/login'); return false; }
  return true;
}

let _engineReady = false;

async function _ensureEngine() {
  if (_engineReady) return;
  _engineReady = true;
  await initWorkspaceEngine();
}

async function onAuthStateChange(event) {
  if (event === 'PASSWORD_RECOVERY') { router.navigate('/auth/reset-password'); return; }
  if (event === 'SIGNED_IN') {
    await _ensureEngine();
    if (router.current()?.startsWith('/auth')) router.navigate('/dashboard');
    return;
  }
  if (event === 'SIGNED_OUT') {
    _engineReady = false;
    router.navigate('/auth/login');
  }
}

async function _safeGetSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  } catch (err) {
    console.warn('[AIFUN] getSession failed — clearing auth storage:', err.message);
    try {
      Object.keys(localStorage)
        .filter((k) => k.indexOf('sb-') === 0 || k.indexOf('-auth-token') !== -1)
        .forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
    } catch (_) {}
    return null;
  }
}

async function init() {
  supabase.auth.onAuthStateChange(onAuthStateChange);

  const session = await _safeGetSession();

  // Hydrate stores before first route resolves
  if (session) {
    try { await _ensureEngine(); }
    catch (err) {
      console.warn('[AIFUN] Engine init failed — continuing without workspace:', err.message);
      _engineReady = false;
    }
  }

  // Auth routes
  router.register('/auth/login',           () => mountAuth(renderLogin(),    initLogin));
  router.register('/auth/register',        () => mountAuth(renderRegister(), initRegister));
  router.register('/auth/forgot-password', () => mountAuth(renderForgot(),   initForgot));
  router.register('/auth/reset-password',  () => mountAuth(renderReset(),    initReset));
  router.register('/auth/verify-email',    () => mountAuth(renderVerify(),   initVerify));

  // App routes (stores already hydrated — shell subscribers receive data immediately)
  router.register('/dashboard',   async () => { if (!(await requireAuth())) return; mountPage('/dashboard',   'Dashboard',   renderDashboard(), initDashboard); });
  router.register('/builders',    async () => { if (!(await requireAuth())) return; mountPage('/builders',    'AI Builders', renderBuilders(), initBuilders); });
  router.register('/documents',   async () => { if (!(await requireAuth())) return; mountPage('/documents',   'Tai lieu',    renderDocuments(), initDocuments); });
  router.register('/marketplace', async () => { if (!(await requireAuth())) return; mountPage('/marketplace', 'Marketplace', renderMarketplace()); initMarketplace(); });
  router.register('/history',     async () => { if (!(await requireAuth())) return; mountPage('/history',     'AI History',  renderHistory(), initHistory); });
  router.register('/reports',     async () => { if (!(await requireAuth())) return; mountPage('/reports',     'Báo cáo',     renderReports()); });
  router.register('/settings',    async () => { if (!(await requireAuth())) return; mountPage('/settings',    'Cài đặt',     renderSettings()); });

  // Fallback
  router.register('*', () => { session ? router.navigate('/dashboard') : router.navigate('/auth/login'); });

  // Internal navigation events (e.g. from Builders → Marketplace link)
  window.addEventListener('aifun:navigate', (e) => { router.navigate(`/${e.detail}`); });

  router.init();

  // Signal to v4.html that boot succeeded — cancels the 2-second timeout
  if (typeof window.__aifunBootReady === 'function') window.__aifunBootReady();
}

init().catch((err) => {
  console.warn('[AIFUN] init() failed — falling back to login:', err.message);
  if (typeof window.__aifunBootReady === 'function') window.__aifunBootReady();
  const root = document.getElementById('v4-root');
  if (root) { root.innerHTML = renderLogin(); initLogin(); }
});
