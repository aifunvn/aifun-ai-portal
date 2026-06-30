import { supabase, getSessionSafe } from '../lib/supabase.js';
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
import { loadOrgOverview  } from '../pages/org-overview.js';
import { loadOrgMembers   } from '../pages/org-members.js';
import { loadOrgTeams     } from '../pages/org-teams.js';
import { loadOrgInvites   } from '../pages/org-invites.js';
import { loadOrgActivity  } from '../pages/org-activity.js';
import { loadOrgAudit     } from '../pages/org-audit.js';
import { loadOrgRoles     as _loadOrgRoles } from '../pages/org-roles.js';
import { _orgShellHtml    } from '../pages/organization.js';
import { orgStore         } from '../stores/org-store.js';
import { userStore        } from '../stores/user-store.js';

function mountAuth(html, initFn) {
  const root = document.getElementById('v4-root');
  if (!root) return;
  root.innerHTML = html;
  if (initFn) initFn();
}

// getSessionSafe() (src/lib/supabase.js) races the SDK call against a timeout
// and falls back to the persisted localStorage token — shared by every call
// site that needs the current session so the app can never hang on auth.
async function _safeGetSession() {
  return getSessionSafe();
}

async function requireAuth() {
  const session = await _safeGetSession();
  if (!session) { router.navigate('/auth/login'); return false; }
  return true;
}

let _engineReady = false;
let _enginePromise = null;

// onAuthStateChange('SIGNED_IN') can fire concurrently with init()'s own call
// to this function (both race to hydrate on boot). A plain boolean guard set
// BEFORE the await would let the second caller return early while the first
// call is still in flight (or silently hung) — masking a real hydrate failure.
// Sharing one in-flight promise means every caller actually awaits the same
// real completion instead of a flag that can be set prematurely.
async function _ensureEngine() {
  if (_engineReady) return;
  if (!_enginePromise) {
    _enginePromise = initWorkspaceEngine()
      .then(() => { _engineReady = true; })
      .catch((err) => {
        _enginePromise = null; // allow a future retry
        throw err;
      });
  }
  return _enginePromise;
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

async function init() {
  // Cancel the boot timeout immediately — app.js loaded successfully.
  // The #v4-boot spinner stays visible until mountPage() replaces it.
  // Timeout only guards against CDN/module-load failure, not slow auth.
  if (typeof window.__aifunBootReady === 'function') window.__aifunBootReady();

  supabase.auth.onAuthStateChange(onAuthStateChange);

  const session = await _safeGetSession();

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

  // Organization Center
  const _orgShell = (subId, title, loaderFn) => async () => {
    if (!(await requireAuth())) return;

    // Load orgs — catch gracefully so org shell renders even before migration runs
    try {
      await orgStore.load(userStore.getUser()?.id);
    } catch (err) {
      console.warn('[ORG] orgStore.load failed (DB tables may not exist yet):', err.message);
    }

    const mountPath = subId === 'overview' ? '/organization' : `/organization/${subId}`;

    mountPage(
      mountPath,
      `${title} — Tổ chức`,
      _orgShellHtml(subId, orgStore.getOrg()?.name),
      () => {
        const el = document.getElementById('org-content');
        if (el) loaderFn(el);
        // Sub-nav links use href="#/organization/..." which triggers hashchange naturally.
        // No click override needed — the router handles each sub-route correctly.
      },
    );
  };

  router.register('/organization',          _orgShell('overview',  'Tổng quan',  loadOrgOverview));
  router.register('/organization/members',  _orgShell('members',   'Thành viên', loadOrgMembers));
  router.register('/organization/teams',    _orgShell('teams',     'Nhóm',       loadOrgTeams));
  router.register('/organization/roles',    _orgShell('roles',     'Phân quyền', el => _loadOrgRoles(el)));
  router.register('/organization/invites',  _orgShell('invites',   'Lời mời',    loadOrgInvites));
  router.register('/organization/activity', _orgShell('activity',  'Hoạt động',  loadOrgActivity));
  router.register('/organization/audit',    _orgShell('audit',     'Kiểm toán',  loadOrgAudit));

  // Fallback
  router.register('*', () => { session ? router.navigate('/dashboard') : router.navigate('/auth/login'); });

  // Internal navigation events (e.g. from Builders → Marketplace link)
  window.addEventListener('aifun:navigate', (e) => { router.navigate(`/${e.detail}`); });

  router.init();

  // Hydrate stores after shell is already visible — non-blocking from boot perspective.
  if (session) {
    try { await _ensureEngine(); }
    catch (err) {
      console.warn('[AIFUN] Engine init failed — continuing without workspace:', err.message);
      _engineReady = false;
    }
  }
}

init().catch((err) => {
  console.warn('[AIFUN] init() failed — falling back to login:', err.message);
  if (typeof window.__aifunBootReady === 'function') window.__aifunBootReady();
  const root = document.getElementById('v4-root');
  if (root) { root.innerHTML = renderLogin(); initLogin(); }
});
