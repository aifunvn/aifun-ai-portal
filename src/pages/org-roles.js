import { ORG_PERMS }  from '../services/permission-engine.js';
import { esc }        from './org-shared.js';

const ROLES = ['owner','admin','manager','editor','viewer'];

const ROLE_META = {
  owner:   { label: 'Chủ sở hữu', color: '#8b5cf6', desc: 'Toàn quyền, không thể bị xóa' },
  admin:   { label: 'Quản trị viên', color: '#6366f1', desc: 'Quản lý thành viên và cấu hình tổ chức' },
  manager: { label: 'Quản lý', color: '#3b82f6', desc: 'Tạo nhóm, mời thành viên, xem báo cáo' },
  editor:  { label: 'Thành viên', color: '#10b981', desc: 'Sử dụng AI Builders và Document Library' },
  viewer:  { label: 'Xem', color: '#94a3b8', desc: 'Chỉ xem nội dung, không thể chỉnh sửa' },
};

const PERM_GROUPS = [
  { label: 'Tổ chức', perms: ['org:read','org:update','org:delete'] },
  { label: 'Thành viên', perms: ['member:read','member:invite','member:update_role','member:suspend','member:remove'] },
  { label: 'Nhóm', perms: ['team:read','team:create','team:update','team:delete','team:manage_members'] },
  { label: 'Lời mời', perms: ['invite:read','invite:revoke'] },
  { label: 'Nhật ký', perms: ['activity:read','audit:read'] },
];

const PERM_LABELS = {
  'org:read':            'Xem thông tin tổ chức',
  'org:update':          'Chỉnh sửa tổ chức',
  'org:delete':          'Xóa tổ chức',
  'member:read':         'Xem danh sách thành viên',
  'member:invite':       'Mời thành viên mới',
  'member:update_role':  'Đổi vai trò thành viên',
  'member:suspend':      'Đình chỉ thành viên',
  'member:remove':       'Xóa thành viên',
  'team:read':           'Xem nhóm',
  'team:create':         'Tạo nhóm',
  'team:update':         'Chỉnh sửa nhóm',
  'team:delete':         'Xóa nhóm',
  'team:manage_members': 'Quản lý thành viên nhóm',
  'invite:read':         'Xem lời mời đang chờ',
  'invite:revoke':       'Thu hồi lời mời',
  'activity:read':       'Xem nhật ký hoạt động',
  'audit:read':          'Xem nhật ký kiểm toán',
};

export function loadOrgRoles(container) {
  container.innerHTML = `
    <div class="org-section-header">
      <h3 class="org-section-title">Ma trận phân quyền</h3>
      <p class="text-muted hint-sm">Chỉ đọc — phân quyền được cấu hình theo vai trò.</p>
    </div>

    <div class="role-header-row">
      <div class="role-perm-col"></div>
      ${ROLES.map(r => `<div class="role-col-head">
        <span class="role-dot" style="background:${esc(ROLE_META[r].color)}"></span>
        <strong>${esc(ROLE_META[r].label)}</strong>
        <span class="text-muted">${esc(ROLE_META[r].desc)}</span>
      </div>`).join('')}
    </div>

    ${PERM_GROUPS.map(group => `
      <div class="perm-group">
        <div class="perm-group-label">${esc(group.label)}</div>
        ${group.perms.map(perm => `
          <div class="perm-row">
            <div class="role-perm-col">${esc(PERM_LABELS[perm] ?? perm)}</div>
            ${ROLES.map(r => {
              const has = (ORG_PERMS[perm] ?? []).includes(r);
              return `<div class="role-col-cell" aria-label="${has ? 'Có' : 'Không'}">
                ${has
                  ? '<svg class="check-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clip-rule="evenodd"/></svg>'
                  : '<span class="dash-icon">—</span>'}
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>`).join('')}`;
}
