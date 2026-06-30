import { orgStore }       from '../stores/org-store.js';
import { listPendingInvites, sendInvite, revokeInvite } from '../services/org-invite-service.js';
import { canDo }          from '../services/permission-engine.js';
import { logActivity }    from '../services/org-activity-service.js';
import { userStore }      from '../stores/user-store.js';
import { esc, emptyState, loadingHtml, toast, ROLE_LABELS_VI } from './org-shared.js';

const ROLES = ['manager','editor','viewer'];

export async function loadOrgInvites(container) {
  const org    = orgStore.getOrg();
  const userId = userStore.getUser()?.id;
  if (!org) { container.innerHTML = '<p class="text-muted">Chưa chọn tổ chức.</p>'; return; }

  container.innerHTML = loadingHtml();

  const [invites, canInvite] = await Promise.all([
    listPendingInvites(org.id, userId).catch(() => []),
    canDo(org.id, 'member:invite', userId),
  ]);

  _render(container, org, userId, invites, canInvite);
}

function _render(container, org, userId, invites, canInvite) {
  container.innerHTML = `
    <div class="org-section-header">
      <h3 class="org-section-title">Lời mời đang chờ (${invites.length})</h3>
      ${canInvite ? `<button class="btn btn--primary btn--sm" id="send-invite-btn">+ Mời thành viên</button>` : ''}
    </div>

    ${!invites.length
      ? emptyState(
          '<path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/>',
          'Không có lời mời nào đang chờ',
          'Mời đồng nghiệp để cộng tác cùng tổ chức.',
        )
      : `<table class="org-table">
          <thead><tr>
            <th>Email</th><th>Vai trò</th><th>Hết hạn</th>${canInvite ? '<th></th>' : ''}
          </tr></thead>
          <tbody>${invites.map(inv => `
            <tr>
              <td>${esc(inv.email)}</td>
              <td><span class="role-chip role-chip--${esc(inv.role)}">${esc(ROLE_LABELS_VI[inv.role] ?? inv.role)}</span></td>
              <td class="text-muted">${new Date(inv.expires_at).toLocaleDateString('vi-VN')}</td>
              ${canInvite ? `<td><button class="btn btn--ghost btn--sm btn--danger" data-revoke="${esc(inv.id)}" data-email="${esc(inv.email)}">Thu hồi</button></td>` : ''}
            </tr>`).join('')}
          </tbody>
        </table>`}`;

  if (canInvite) {
    container.querySelector('#send-invite-btn')?.addEventListener('click', () => _openInviteModal(container, org, userId));
    container.querySelectorAll('[data-revoke]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Thu hồi lời mời gửi tới ${btn.dataset.email}?`)) return;
        try {
          await revokeInvite(btn.dataset.revoke, org.id, userId);
          await logActivity(org.id, userId, 'invite.revoked', 'invite', btn.dataset.revoke, btn.dataset.email);
          toast('Đã thu hồi lời mời');
          await loadOrgInvites(container);
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }
}

function _openInviteModal(container, org, userId) {
  const dlg = document.createElement('div');
  dlg.className = 'modal-backdrop';
  dlg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Mời thành viên">
    <h3 class="modal-title">Mời thành viên mới</h3>
    <div class="form-group"><label for="invite-email">Email <span aria-hidden="true">*</span></label>
      <input id="invite-email" class="input" type="email" placeholder="ten@congty.com" required></div>
    <div class="form-group"><label for="invite-role">Vai trò</label>
      <select id="invite-role" class="input">
        ${ROLES.map(r => `<option value="${r}">${esc(ROLE_LABELS_VI[r] ?? r)}</option>`).join('')}
      </select></div>
    <div class="form-group"><label for="invite-msg">Tin nhắn (tùy chọn)</label>
      <textarea id="invite-msg" class="input" rows="2" maxlength="500" placeholder="Lời nhắn đi kèm lời mời…"></textarea></div>
    <p class="form-error hidden" id="invite-err"></p>
    <div class="modal-actions">
      <button class="btn btn--ghost" id="inv-cancel">Hủy</button>
      <button class="btn btn--primary" id="inv-send">Gửi lời mời</button>
    </div>
  </div>`;
  document.body.appendChild(dlg);

  const emailEl = dlg.querySelector('#invite-email');
  const roleEl  = dlg.querySelector('#invite-role');
  const msgEl   = dlg.querySelector('#invite-msg');
  const errEl   = dlg.querySelector('#invite-err');

  const close = () => dlg.remove();
  dlg.querySelector('#inv-cancel').onclick = close;
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  dlg.querySelector('#inv-send').onclick = async () => {
    const email = emailEl.value.trim();
    if (!email) { errEl.textContent = 'Vui lòng nhập email'; errEl.classList.remove('hidden'); return; }
    try {
      const inv = await sendInvite(org.id, { email, role: roleEl.value, message: msgEl.value }, userId);
      await logActivity(org.id, userId, 'member.invited', 'invite', inv.id, email, { role: roleEl.value });
      toast(`Đã gửi lời mời tới ${email}`);
      close();
      await loadOrgInvites(container);
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
  };

  emailEl.focus();
}
