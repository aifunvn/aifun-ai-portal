import { router } from '../router/router.js';
import { supabase } from '../lib/supabase.js';

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="10" y="2" width="6" height="6" rx="1"/><rect x="2" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/></svg>`,
  },
  {
    path: '/builders',
    label: 'AI Builders',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2l1.5 4.5L15 8l-4.5 1.5L9 14 7.5 9.5 3 8l4.5-1.5L9 2z"/><path d="M14 13l.75 2.25L17 16l-2.25.75L14 19l-.75-2.25L11 16l2.25-.75L14 13z" opacity=".5"/></svg>`,
  },
  {
    path: '/documents',
    label: 'Tài liệu',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z"/><polyline points="10 2 10 7 15 7"/><line x1="6" y1="11" x2="12" y2="11"/><line x1="6" y1="14" x2="10" y2="14"/></svg>`,
  },
  {
    path: '/marketplace',
    label: 'Marketplace',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v10a1 1 0 001 1h10a1 1 0 001-1V6L12 2H6z"/><line x1="3" y1="6" x2="15" y2="6"/><path d="M12 10a3 3 0 01-6 0"/></svg>`,
  },
  {
    path: '/reports',
    label: 'Báo cáo',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="15" x2="15" y2="15"/><rect x="4" y="9" width="3" height="6" rx="1"/><rect x="8" y="5" width="3" height="10" rx="1"/><rect x="12" y="11" width="3" height="4" rx="1"/></svg>`,
  },
  {
    path: '/settings',
    label: 'Cài đặt',
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="2"/><path d="M9 1v2M9 15v2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M1 9h2M15 9h2M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42"/></svg>`,
  },
];

export function renderSidebar() {
  const navHtml = NAV_ITEMS.map((item) => `
    <button class="sb-item" data-nav-to="${item.path}" aria-label="${item.label}">
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

      <div class="sb-ws">
        <button class="sb-ws-trigger" id="ws-trigger" aria-expanded="false" aria-haspopup="listbox">
          <span class="sb-ws-avatar">A</span>
          <span class="sb-ws-name" id="ws-name">AIFUN Workspace</span>
          <svg class="sb-ws-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 5 7 9 11 5"/></svg>
        </button>
        <div class="sb-ws-dropdown" id="ws-dropdown" role="listbox">
          <button class="sb-ws-option is-active" role="option" aria-selected="true">
            <span class="sb-ws-avatar">A</span>
            <span>AIFUN Workspace</span>
          </button>
          <div class="sb-ws-divider"></div>
          <button class="sb-ws-option" data-nav-to="/settings" role="option" aria-selected="false">
            + Tạo workspace mới
          </button>
        </div>
      </div>

      <nav class="sb-nav" aria-label="Menu chính">
        <span class="sb-section-label">Chính</span>
        ${navHtml}
      </nav>

      <div class="sb-footer">
        <button class="sb-user" id="sb-user-trigger" aria-expanded="false" aria-haspopup="menu">
          <div class="sb-avatar" id="sb-avatar">?</div>
          <div class="sb-user-info">
            <div class="sb-user-name" id="sb-user-name">Đang tải...</div>
            <div class="sb-user-email" id="sb-user-email"></div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 5 7 9 11 5"/></svg>
        </button>

        <div class="sb-user-menu" id="sb-user-menu" role="menu">
          <button class="sb-user-menu-item" data-nav-to="/settings" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7.5" cy="5" r="2.5"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
            Hồ sơ cá nhân
          </button>
          <button class="sb-user-menu-item" data-nav-to="/settings" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7.5" cy="7.5" r="1.5"/><path d="M7.5 1v1.5M7.5 12.5V14M2.4 2.4l1.06 1.06M11.54 11.54l1.06 1.06M1 7.5h1.5M12.5 7.5H14M2.4 12.6l1.06-1.06M11.54 3.46l1.06-1.06"/></svg>
            Cài đặt
          </button>
          <div class="sb-user-menu-divider"></div>
          <button class="sb-user-menu-item is-danger" id="sb-sign-out" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5.5 13H2.5a1 1 0 01-1-1V3a1 1 0 011-1h3"/><polyline points="10 10 13 7.5 10 5"/><line x1="13" y1="7.5" x2="5.5" y2="7.5"/></svg>
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  `;
}

export function updateActiveNav(path) {
  document.querySelectorAll('.sb-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.navTo === path);
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

function closeAllDropdowns() {
  document.getElementById('ws-dropdown')?.classList.remove('is-open');
  document.getElementById('ws-trigger')?.setAttribute('aria-expanded', 'false');
  document.getElementById('sb-user-menu')?.classList.remove('is-open');
  document.getElementById('sb-user-trigger')?.setAttribute('aria-expanded', 'false');
}

export async function initSidebar() {
  // Nav item clicks
  document.querySelectorAll('[data-nav-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeSidebar();
      closeAllDropdowns();
      router.navigate(btn.dataset.navTo);
    });
  });

  // Workspace switcher
  const wsTrigger = document.getElementById('ws-trigger');
  const wsDropdown = document.getElementById('ws-dropdown');
  wsTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wsDropdown.classList.toggle('is-open');
    wsTrigger.setAttribute('aria-expanded', String(open));
  });

  // User menu
  const userTrigger = document.getElementById('sb-user-trigger');
  const userMenu = document.getElementById('sb-user-menu');
  userTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = userMenu.classList.toggle('is-open');
    userTrigger.setAttribute('aria-expanded', String(open));
  });

  // Sign out
  document.getElementById('sb-sign-out')?.addEventListener('click', () => {
    supabase.auth.signOut();
  });

  // Mobile overlay close
  document.getElementById('sb-overlay')?.addEventListener('click', closeSidebar);

  // Close dropdowns on outside click
  document.addEventListener('click', closeAllDropdowns);

  // Keyboard: Esc closes dropdowns and sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAllDropdowns(); closeSidebar(); }
  });

  // Expose openSidebar for topbar hamburger
  window._sbOpen = openSidebar;

  // Load user info
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Người dùng';
    const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sb-avatar').textContent = initials;
    document.getElementById('sb-user-name').textContent = name;
    document.getElementById('sb-user-email').textContent = user.email || '';
  }
}
