import { supabase } from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

const ICON_PROFILE  = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7.5" cy="5" r="2.5"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>`;
const ICON_SETTINGS = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7.5" cy="7.5" r="1.5"/><path d="M7.5 1v1.5M7.5 12.5V14M2.4 2.4l1.06 1.06M11.54 11.54l1.06 1.06M1 7.5h1.5M12.5 7.5H14M2.4 12.6l1.06-1.06M11.54 3.46l1.06-1.06"/></svg>`;
const ICON_SIGNOUT  = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5.5 13H2.5a1 1 0 01-1-1V3a1 1 0 011-1h3"/><polyline points="10 10 13 7.5 10 5"/><line x1="13" y1="7.5" x2="5.5" y2="7.5"/></svg>`;
const CHEVRON       = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 5 7 9 11 5"/></svg>`;

export function render() {
  return `
    <div class="sb-footer">
      <button class="sb-user" id="sb-user-trigger" aria-expanded="false" aria-haspopup="menu">
        <div class="sb-avatar" id="sb-avatar">?</div>
        <div class="sb-user-info">
          <div class="sb-user-name"  id="sb-user-name">Đang tải...</div>
          <div class="sb-user-email" id="sb-user-email"></div>
        </div>
        ${CHEVRON}
      </button>

      <div class="sb-user-menu" id="sb-user-menu" role="menu">
        <div class="sb-user-menu-header" id="um-role-header" aria-hidden="true"></div>
        <button class="sb-user-menu-item" id="um-profile" role="menuitem">
          ${ICON_PROFILE} Hồ sơ cá nhân
        </button>
        <button class="sb-user-menu-item" id="um-settings" role="menuitem">
          ${ICON_SETTINGS} Cài đặt
        </button>
        <div class="sb-user-menu-divider"></div>
        <button class="sb-user-menu-item is-danger" id="um-sign-out" role="menuitem">
          ${ICON_SIGNOUT} Đăng xuất
        </button>
      </div>
    </div>
  `;
}

function closeMenu() {
  document.getElementById('sb-user-menu')?.classList.remove('is-open');
  document.getElementById('sb-user-trigger')?.setAttribute('aria-expanded', 'false');
}

function navigate(path) {
  closeMenu();
  window.location.hash = path;
}

export function init() {
  const trigger = document.getElementById('sb-user-trigger');
  const menu    = document.getElementById('sb-user-menu');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  document.getElementById('um-profile')?.addEventListener('click',  () => navigate('/settings'));
  document.getElementById('um-settings')?.addEventListener('click', () => navigate('/settings'));
  document.getElementById('um-sign-out')?.addEventListener('click', () => {
    closeMenu();
    supabase.auth.signOut();
  });

  userStore.subscribe(({ profile, role }) => {
    const avatar  = document.getElementById('sb-avatar');
    const name    = document.getElementById('sb-user-name');
    const email   = document.getElementById('sb-user-email');
    const roleHdr = document.getElementById('um-role-header');

    if (avatar) avatar.textContent = profile?.initials ?? '?';
    if (name)   name.textContent   = profile?.fullName ?? 'Người dùng';
    if (email)  email.textContent  = profile?.email    ?? '';

    if (roleHdr) {
      if (role?.label) {
        roleHdr.innerHTML = `<span class="um-role-badge">${role.label}</span>`;
        roleHdr.removeAttribute('aria-hidden');
      } else {
        roleHdr.innerHTML = '';
        roleHdr.setAttribute('aria-hidden', 'true');
      }
    }
  });
}
