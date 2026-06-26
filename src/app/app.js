import { supabase } from '../lib/supabase.js';
import { router } from '../router/router.js';
import { mountPage } from '../layouts/main-layout.js';
import { initWorkspaceEngine } from '../services/workspace-service.js';
import { render as renderLogin,    init as initLogin    } from '../auth/login.js';
import { render as renderRegister, init as initRegister } from '../auth/register.js';
import { render as renderForgot,   init as initForgot   } from '../auth/forgot-password.js';
import { render as renderReset,    init as initReset    } from '../auth/reset-password.js';
import { render as renderVerify,   init as initVerify   } from '../auth/verify-email.js';
import { render as renderDashboard   } from '../pages/dashboard.js';
import { render as renderBuilders    } from '../pages/builders.js';
import { render as renderDocuments   } from '../pages/documents.js';
import { render as renderMarketplace } from '../pages/marketplace.js';
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

async function onAuthStateChange(event) {
  if (event === 'PASSWORD_RECOVERY') { router.navigate('/auth/reset-password'); return; }
  if (event === 'SIGNED_IN') {
    await initWorkspaceEngine();
    if (router.current()?.startsWith('/auth')) router.navigate('/dashboard');
    return;
  }
  if (event === 'SIGNED_OUT') { router.navigate('/auth/login'); }
}

async function init() {
  supabase.auth.onAuthStateChange(onAuthStateChange);

  const { data: { session } } = await supabase.auth.getSession();

  // Hydrate stores before first route resolves
  if (session) await initWorkspaceEngine();

  // Auth routes
  router.register('/auth/login',           () => mountAuth(renderLogin(),    initLogin));
  router.register('/auth/register',        () => mountAuth(renderRegister(), initRegister));
  router.register('/auth/forgot-password', () => mountAuth(renderForgot(),   initForgot));
  router.register('/auth/reset-password',  () => mountAuth(renderReset(),    initReset));
  router.register('/auth/verify-email',    () => mountAuth(renderVerify(),   initVerify));

  // App routes (stores already hydrated — shell subscribers receive data immediately)
  router.register('/dashboard',   async () => { if (!(await requireAuth())) return; mountPage('/dashboard',   'Dashboard',   renderDashboard()); });
  router.register('/builders',    async () => { if (!(await requireAuth())) return; mountPage('/builders',    'AI Builders', renderBuilders()); });
  router.register('/documents',   async () => { if (!(await requireAuth())) return; mountPage('/documents',   'Tài liệu',    renderDocuments()); });
  router.register('/marketplace', async () => { if (!(await requireAuth())) return; mountPage('/marketplace', 'Marketplace', renderMarketplace()); });
  router.register('/reports',     async () => { if (!(await requireAuth())) return; mountPage('/reports',     'Báo cáo',     renderReports()); });
  router.register('/settings',    async () => { if (!(await requireAuth())) return; mountPage('/settings',    'Cài đặt',     renderSettings()); });

  // Fallback
  router.register('*', () => { session ? router.navigate('/dashboard') : router.navigate('/auth/login'); });

  router.init();
}

init();
