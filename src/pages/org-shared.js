/** Shared helpers for all /organization/* pages */

export function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export const ROLE_LABELS_VI = {
  owner:   'Chủ sở hữu',
  admin:   'Quản trị viên',
  manager: 'Quản lý',
  editor:  'Thành viên',
  viewer:  'Xem',
};

export const _fmt = {
  action(action) {
    const map = {
      'member.invited':   'Mời thành viên',
      'member.joined':    'Gia nhập',
      'member.removed':   'Xóa thành viên',
      'member.role_updated': 'Đổi vai trò',
      'team.created':     'Tạo nhóm',
      'team.updated':     'Cập nhật nhóm',
      'team.deleted':     'Xóa nhóm',
      'invite.revoked':   'Thu hồi lời mời',
      'org.updated':      'Cập nhật tổ chức',
    };
    return map[action] ?? action;
  },

  relTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} ngày trước`;
    return new Date(iso).toLocaleDateString('vi-VN');
  },
};

export function roleBadge(role) {
  return `<span class="role-chip role-chip--${esc(role)}">${esc(ROLE_LABELS_VI[role] ?? role)}</span>`;
}

export function emptyState(icon, title, desc, ctaHtml = '') {
  return `<div class="org-empty">
    <svg class="org-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      ${icon}
    </svg>
    <p class="org-empty-title">${esc(title)}</p>
    <p class="org-empty-desc">${esc(desc)}</p>
    ${ctaHtml}
  </div>`;
}

export function loadingHtml() {
  return '<div class="org-loading"><span class="spinner"></span></div>';
}

export function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'alert');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
