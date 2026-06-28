const _ROLES = [
  { id: 'owner',  label: 'Chủ sở hữu', desc: 'Toàn quyền workspace',          primary: true  },
  { id: 'admin',  label: 'Admin',       desc: 'Quản lý thành viên & cài đặt', primary: false },
  { id: 'member', label: 'Member',      desc: 'Tạo và chỉnh sửa tài liệu',    primary: false },
  { id: 'viewer', label: 'Viewer',      desc: 'Chỉ xem tài liệu',             primary: false },
];

function _renderRoleChip(r) {
  if (r.primary) {
    return `<div class="stt-members-role-chip stt-members-role-chip--primary">
      <strong>${r.label}</strong><span>${r.desc}</span>
    </div>`;
  }
  return `<div class="stt-members-role-chip">
    <strong>${r.label}</strong><span>${r.desc}</span>
  </div>`;
}

function _renderPlaceholder() {
  const chips = _ROLES.map(_renderRoleChip).join('');
  return `
    <div class="stt-section">
      <div class="stt-section-title">Thành viên workspace</div>
      <div class="stt-section-desc">Mời thành viên, phân quyền và quản lý hoạt động</div>

      <div class="stt-members-coming-soon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"
          class="stt-members-icon" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h3 class="stt-members-coming-title">Sắp ra mắt trong Sprint 15</h3>
        <p class="stt-members-coming-desc">
          Mời thành viên qua email, phân quyền theo vai trò và theo dõi hoạt động workspace
          theo thời gian thực.
        </p>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Hệ thống phân quyền</div>
      <div class="stt-section-desc">4 vai trò với quyền hạn rõ ràng</div>
      <div class="stt-members-roles">
        ${chips}
      </div>
    </div>`;
}

export function loadMembers() {
  const panel = document.getElementById('stt-panel-members');
  if (!panel) return;
  panel.innerHTML = _renderPlaceholder();
}
