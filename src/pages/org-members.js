import { orgStore }          from '../stores/org-store.js';
import { listMembers, updateMemberRole, suspendMember, reactivateMember, removeMember }
                             from '../services/org-member-service.js';
import { canDo }             from '../services/permission-engine.js';
import { logActivity }       from '../services/org-activity-service.js';
import { userStore }         from '../stores/user-store.js';
import { esc, roleBadge, emptyState, loadingHtml, toast, ROLE_LABELS_VI } from './org-shared.js';

const ROLES = ['admin','manager','editor','viewer'];

let _members = [];
let _canManage = false;

export async function loadOrgMembers(container) {
  const org    = orgStore.getOrg();
  const userId = userStore.getUser()?.id;
  if (!org) { container.innerHTML = '<p class="text-muted">Chưa chọn tổ chức.</p>'; return; }

  container.innerHTML = loadingHtml();

  [_members, _canManage] = await Promise.all([
    listMembers(org.id),
    canDo(org.id, 'member:update_role', userId),
  ]);

  _render(container, org, userId);
}

function _render(container, org, userId) {
  if (!_members.length) {
    container.innerHTML = emptyState(
      '<path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      'Chưa có thành viên',
      'Mời thành viên đầu tiên để bắt đầu cộng tác.',
    );
    return;
  }

  const active    = _members.filter(m => m.status === 'active');
  const suspended = _members.filter(m => m.status === 'suspended');

  container.innerHTML = `
    <div class="org-section-header">
      <h3 class="org-section-title">Thành viên (${active.length}/${org.seat_limit ?? '∞'})</h3>
      ${_canManage ? `<a href="#/organization/invites" class="btn btn--primary btn--sm">+ Mời thành viên</a>` : ''}
    </div>

    <div class="member-search-row">
      <input id="member-search" type="search" placeholder="Tìm theo tên hoặc email…" class="input" autocomplete="off">
    </div>

    <table class="org-table" id="members-table">
      <thead>
        <tr>
          <th>Thành viên</th>
          <th>Vai trò</th>
          <th>Trạng thái</th>
          <th>Gia nhập</th>
          ${_canManage ? '<th></th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${_members.map(m => _memberRow(m, userId)).join('')}
      </tbody>
    </table>
    ${suspended.length ? `<p class="text-muted hint-sm">${suspended.length} tài khoản đang bị tạm đình chỉ</p>` : ''}`;

  _wire(container, org, userId);
}

function _memberRow(m, userId) {
  const isSelf = m.user_id === userId;
  return `<tr data-uid="${esc(m.user_id)}" data-status="${esc(m.status)}">
    <td>
      <div class="member-cell">
        <span class="member-avatar">${(m.display_name[0] ?? '?').toUpperCase()}</span>
        <div>
          <p class="member-name">${esc(m.display_name)}${isSelf ? ' <span class="badge badge--you">Bạn</span>' : ''}</p>
          <p class="member-email text-muted">${esc(m.email)}</p>
        </div>
      </div>
    </td>
    <td>${roleBadge(m.role)}</td>
    <td><span class="status-dot status-dot--${esc(m.status)}"></span> ${m.status === 'active' ? 'Hoạt động' : 'Đình chỉ'}</td>
    <td class="text-muted">${new Date(m.joined_at).toLocaleDateString('vi-VN')}</td>
    ${_canManage && !isSelf ? `<td class="actions-cell">
      <button class="btn btn--ghost btn--sm" data-action="role" data-uid="${esc(m.user_id)}" aria-label="Đổi vai trò">Vai trò</button>
      ${m.status === 'active'
        ? `<button class="btn btn--ghost btn--sm btn--danger" data-action="suspend" data-uid="${esc(m.user_id)}" aria-label="Đình chỉ">Đình chỉ</button>`
        : `<button class="btn btn--ghost btn--sm" data-action="reactivate" data-uid="${esc(m.user_id)}" aria-label="Kích hoạt lại">Kích hoạt</button>`}
      <button class="btn btn--ghost btn--sm btn--danger" data-action="remove" data-uid="${esc(m.user_id)}" aria-label="Xóa">Xóa</button>
    </td>` : (_canManage ? '<td></td>' : '')}
  </tr>`;
}

function _wire(container, org, userId) {
  const search = container.querySelector('#member-search');
  if (search) search.addEventListener('input', () => _filterTable(search.value));

  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const uid    = btn.dataset.uid;
    const member = _members.find(m => m.user_id === uid);
    if (!member) return;

    try {
      if (action === 'role') await _changeRole(container, org, userId, member);
      if (action === 'suspend') {
        if (!confirm(`Đình chỉ ${member.display_name}?`)) return;
        await suspendMember(org.id, uid, userId);
        await logActivity(org.id, userId, 'member.suspended', 'member', uid, member.display_name);
        toast('Đã đình chỉ thành viên');
        await loadOrgMembers(container);
      }
      if (action === 'reactivate') {
        await reactivateMember(org.id, uid, userId);
        toast('Đã kích hoạt lại');
        await loadOrgMembers(container);
      }
      if (action === 'remove') {
        if (!confirm(`Xóa ${member.display_name} khỏi tổ chức?`)) return;
        await removeMember(org.id, uid, userId);
        await logActivity(org.id, userId, 'member.removed', 'member', uid, member.display_name);
        toast('Đã xóa thành viên');
        await loadOrgMembers(container);
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function _changeRole(container, org, userId, member) {
  const newRole = await _rolePickerModal(member.role);
  if (!newRole || newRole === member.role) return;
  await updateMemberRole(org.id, member.user_id, newRole, userId);
  await logActivity(org.id, userId, 'member.role_updated', 'member', member.user_id, member.display_name, { from: member.role, to: newRole });
  toast('Đã cập nhật vai trò');
  await loadOrgMembers(container);
}

function _rolePickerModal(current) {
  return new Promise(resolve => {
    const dlg = document.createElement('div');
    dlg.className = 'modal-backdrop';
    dlg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Đổi vai trò">
      <h3 class="modal-title">Đổi vai trò</h3>
      <div class="role-picker-list">
        ${ROLES.map(r => `<label class="role-picker-item ${r === current ? 'role-picker-item--current' : ''}">
          <input type="radio" name="role" value="${r}" ${r === current ? 'checked' : ''}>
          <span>${esc(ROLE_LABELS_VI[r] ?? r)}</span>
        </label>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn--ghost" id="role-cancel">Hủy</button>
        <button class="btn btn--primary" id="role-confirm">Xác nhận</button>
      </div>
    </div>`;
    document.body.appendChild(dlg);
    const cleanup = r => { dlg.remove(); resolve(r); };
    dlg.querySelector('#role-cancel').onclick  = () => cleanup(null);
    dlg.querySelector('#role-confirm').onclick = () => cleanup(dlg.querySelector('input[name=role]:checked')?.value ?? null);
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape') cleanup(null); });
    dlg.querySelector('#role-confirm').focus();
  });
}

function _filterTable(q) {
  const rows = document.querySelectorAll('#members-table tbody tr');
  const lq   = q.toLowerCase();
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(lq) ? '' : 'none';
  });
}
