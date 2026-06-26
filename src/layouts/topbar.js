import { supabase } from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';
import { workspaceStore } from '../stores/workspace-store.js';

const THEME_KEY = 'aifun_theme';

function isDark() {
  return document.documentElement.hasAttribute('data-dark');
}

function applyTheme(dark) {
  dark
    ? document.documentElement.setAttribute('data-dark', '')
    : document.documentElement.removeAttribute('data-dark');
  updateThemeIcon(dark);
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

function updateThemeIcon(dark) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.setAttribute('aria-label', dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối');
  btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
}

const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 10.5A7 7 0 017.5 2.5a7 7 0 100 13 7 7 0 008-5z"/></svg>`;
const ICON_SUN  = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="9" y1="15" x2="9" y2="17"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="15" y1="9" x2="17" y2="9"/><line x1="3.22" y1="3.22" x2="4.64" y2="4.64"/><line x1="13.36" y1="13.36" x2="14.78" y2="14.78"/><line x1="3.22" y1="14.78" x2="4.64" y2="13.36"/><line x1="13.36" y1="4.64" x2="14.78" y2="3.22"/></svg>`;
const ICON_BELL = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5A5 5 0 004 6.5v3l-1.5 2.5h13L14 9.5v-3A5 5 0 009 1.5z"/><path d="M7 14.5a2 2 0 004 0"/></svg>`;

export function renderTopbar() {
  return `
    <header class="topbar" role="banner">
      <div class="tb-left">
        <button class="tb-hamburger" id="tb-hamburger" aria-label="Mở menu" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/></svg>
        </button>
        <h1 class="tb-page-title" id="tb-page-title">Dashboard</h1>
      </div>

      <div class="tb-right">
        <div class="theme-toggle">
          <button class="tb-icon-btn" id="theme-toggle" aria-label="Chuyển sang chế độ tối">
            ${ICON_MOON}
          </button>
        </div>

        <div class="notif-wrap">
          <button class="tb-icon-btn" id="notif-trigger" aria-label="Thông báo" aria-expanded="false" aria-haspopup="true">
            ${ICON_BELL}
          </button>
          <div class="tb-dropdown notif-dropdown" id="notif-dropdown" role="menu">
            <div class="tb-dropdown-header">Thông báo</div>
            <div class="tb-dropdown-empty">Chưa có thông báo mới</div>
          </div>
        </div>

        <div class="tb-user-wrap">
          <button class="tb-user-avatar" id="tb-user-trigger" aria-label="Menu tài khoản" aria-expanded="false" aria-haspopup="true">?</button>
          <div class="tb-dropdown tb-user-dropdown" id="tb-user-dropdown" role="menu">
            <div class="tb-user-info">
              <div class="tb-user-info-name"  id="tb-user-name">Đang tải...</div>
              <div class="tb-user-info-email" id="tb-user-email"></div>
            </div>
            <button class="tb-dropdown-item" id="tb-nav-settings" role="menuitem">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7.5" cy="7.5" r="1.5"/><path d="M7.5 1v1.5M7.5 12.5V14M2.4 2.4l1.06 1.06M11.54 11.54l1.06 1.06M1 7.5h1.5M12.5 7.5H14M2.4 12.6l1.06-1.06M11.54 3.46l1.06-1.06"/></svg>
              Cài đặt
            </button>
            <div class="tb-dropdown-divider"></div>
            <button class="tb-dropdown-item is-danger" id="tb-sign-out" role="menuitem">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5.5 13H2.5a1 1 0 01-1-1V3a1 1 0 011-1h3"/><polyline points="10 10 13 7.5 10 5"/><line x1="13" y1="7.5" x2="5.5" y2="7.5"/></svg>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function updatePageTitle(title) {
  const el = document.getElementById('tb-page-title');
  if (el) el.textContent = title;
  const ws = workspaceStore.getWorkspace();
  document.title = ws ? `${title} — ${ws.name} | AIFUN OS` : `${title} | AIFUN OS`;
}

function closeAllDropdowns() {
  ['notif-dropdown', 'tb-user-dropdown'].forEach((id) => {
    document.getElementById(id)?.classList.remove('is-open');
  });
  document.getElementById('notif-trigger')?.setAttribute('aria-expanded', 'false');
  document.getElementById('tb-user-trigger')?.setAttribute('aria-expanded', 'false');
}

export function initTopbar() {
  // Theme — restore from localStorage
  if (localStorage.getItem(THEME_KEY) === 'dark') applyTheme(true);

  document.getElementById('theme-toggle')?.addEventListener('click', () => applyTheme(!isDark()));

  // Hamburger
  document.getElementById('tb-hamburger')?.addEventListener('click', () => {
    if (typeof window._sbOpen === 'function') window._sbOpen();
  });

  // Notification dropdown
  const notifTrigger  = document.getElementById('notif-trigger');
  const notifDropdown = document.getElementById('notif-dropdown');
  notifTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = notifDropdown.classList.toggle('is-open');
    notifTrigger.setAttribute('aria-expanded', String(open));
    document.getElementById('tb-user-dropdown')?.classList.remove('is-open');
    document.getElementById('tb-user-trigger')?.setAttribute('aria-expanded', 'false');
  });

  // User dropdown
  const userTrigger  = document.getElementById('tb-user-trigger');
  const userDropdown = document.getElementById('tb-user-dropdown');
  userTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = userDropdown.classList.toggle('is-open');
    userTrigger.setAttribute('aria-expanded', String(open));
    document.getElementById('notif-dropdown')?.classList.remove('is-open');
    document.getElementById('notif-trigger')?.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('tb-nav-settings')?.addEventListener('click', () => {
    closeAllDropdowns();
    window.location.hash = '/settings';
  });

  document.getElementById('tb-sign-out')?.addEventListener('click', () => {
    supabase.auth.signOut();
  });

  document.addEventListener('click', closeAllDropdowns);

  // Subscribe to user-store — update topbar avatar/name/email
  userStore.subscribe(({ profile }) => {
    const avatar = document.getElementById('tb-user-trigger');
    const name   = document.getElementById('tb-user-name');
    const email  = document.getElementById('tb-user-email');
    if (avatar) avatar.textContent = profile?.initials ?? '?';
    if (name)   name.textContent   = profile?.fullName ?? 'Người dùng';
    if (email)  email.textContent  = profile?.email    ?? '';
  });

  // Subscribe to workspace-store — keep document.title in sync on workspace switch
  workspaceStore.subscribe(({ workspace }) => {
    const currentPage = document.getElementById('tb-page-title')?.textContent ?? 'AIFUN OS';
    document.title = workspace
      ? `${currentPage} — ${workspace.name} | AIFUN OS`
      : `${currentPage} | AIFUN OS`;
  });
}
