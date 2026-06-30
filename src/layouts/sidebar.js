import { router }          from '../router/router.js';
import { permissionStore } from '../stores/permission-store.js';
import { render as renderWS, init as initWS } from '../components/workspace-switcher.js';
import { render as renderUM, init as initUM } from '../components/user-menu.js';

const NAV_ITEMS = [
  {
    path:       '/dashboard',
    label:      'Dashboard',
    permission: 'dashboard:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="10" y="2" width="6" height="6" rx="1"/><rect x="2" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/></svg>`,
  },
  {
    path:       '/builders',
    label:      'AI Builders',
    permission: 'builders:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2l1.5 4.5L15 8l-4.5 1.5L9 14 7.5 9.5 3 8l4.5-1.5L9 2z"/></svg>`,
  },
  {
    path:       '/documents',
    label:      'Tài liệu',
    permission: 'documents:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z"/><polyline points="10 2 10 7 15 7"/><line x1="6" y1="11" x2="12" y2="11"/><line x1="6" y1="14" x2="10" y2="14"/></svg>`,
  },
  {
    path:       '/marketplace',
    label:      'Marketplace',
    permission: 'marketplace:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v10a1 1 0 001 1h10a1 1 0 001-1V6L12 2H6z"/><line x1="3" y1="6" x2="15" y2="6"/><path d="M12 10a3 3 0 01-6 0"/></svg>`,
  },
  {
    path:       '/history',
    label:      'AI History',
    permission: 'dashboard:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="7"/><polyline points="9 5 9 9 12 11"/></svg>`,
  },
  {
    path:       '/reports',
    label:      'Báo cáo',
    permission: 'dashboard:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="15" x2="15" y2="15"/><rect x="4" y="9" width="3" height="6" rx="1"/><rect x="8" y="5" width="3" height="10" rx="1"/><rect x="12" y="11" width="3" height="4" rx="1"/></svg>`,
  },
  {
    path:       '/organization',
    label:      'Tổ chức',
    permission: 'settings:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
  {
    path:       '/settings',
    label:      'Cài đặt',
    permission: 'settings:read',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="2"/><path d="M9 1v2M9 15v2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M1 9h2M15 9h2M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42"/></svg>`,
  },
];

export function renderSidebar() {
  const navHtml = NAV_ITEMS.map((item) => `
    <button class="sb-item" data-nav-to="${item.path}" data-permission="${item.permission}"
            aria-label="${item.label}">
      <span class="sb-item-icon">${item.icon}</span>
      <span>${item.label}</span>
    </button>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar" aria-label="Điều hướng chính">
      <div class="sb-logo">
        <img src="/logo.svg" alt="AIFUN OS" class="sb-logo-img">
        <span class="sb-logo-name">AIFUN OS</span>
        <span class="sb-logo-badge">V4</span>
      </div>

      ${renderWS()}

      <nav class="sb-nav" aria-label="Menu chính">
        <span class="sb-section-label">Chính</span>
        ${navHtml}
      </nav>

      ${renderUM()}
    </aside>
  `;
}

export function updateActiveNav(path) {
  document.querySelectorAll('.sb-item[data-nav-to]').forEach((btn) => {
    const navTo = btn.dataset.navTo;
    // Org sub-pages (/organization/members etc.) should keep "Tổ chức" active
    const isActive = navTo === path ||
      (navTo === '/organization' && path.startsWith('/organization/'));
    btn.classList.toggle('is-active', isActive);
  });
}

function _refreshNavVisibility() {
  document.querySelectorAll('.sb-item[data-permission]').forEach((btn) => {
    const visible = permissionStore.has(btn.dataset.permission);
    btn.style.display = visible ? '' : 'none';
  });
}

export function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('is-open');
  document.getElementById('sb-overlay')?.classList.remove('is-visible');
}

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('is-open');
  document.getElementById('sb-overlay')?.classList.add('is-visible');
}

export function initSidebar() {
  document.querySelectorAll('.sb-nav .sb-item[data-nav-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeSidebar();
      router.navigate(btn.dataset.navTo);
    });
  });

  document.getElementById('sb-overlay')?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

  window._sbOpen = openSidebar;

  // Permission-reactive nav visibility
  permissionStore.subscribe(_refreshNavVisibility);

  initWS();
  initUM();
}
