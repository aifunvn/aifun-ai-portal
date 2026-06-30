import { orgStore }       from '../stores/org-store.js';
import { listTeams, createTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember }
                          from '../services/org-team-service.js';
import { listMembers }    from '../services/org-member-service.js';
import { canDo }          from '../services/permission-engine.js';
import { logActivity }    from '../services/org-activity-service.js';
import { userStore }      from '../stores/user-store.js';
import { esc, emptyState, loadingHtml, toast } from './org-shared.js';

let _teams    = [];
let _members  = [];
let _canWrite = false;

export async function loadOrgTeams(container) {
  const org    = orgStore.getOrg();
  const userId = userStore.getUser()?.id;
  if (!org) { container.innerHTML = '<p class="text-muted">Chưa chọn tổ chức.</p>'; return; }

  container.innerHTML = loadingHtml();
  [_teams, _members, _canWrite] = await Promise.all([
    listTeams(org.id),
    listMembers(org.id),
    canDo(org.id, 'team:create', userId),
  ]);

  _render(container, org, userId);
}

function _render(container, org, userId) {
  if (!_teams.length) {
    container.innerHTML =
      (_canWrite
        ? `<div class="org-section-header">
             <h3 class="org-section-title">Nhóm</h3>
             <button class="btn btn--primary btn--sm" id="create-team-btn">+ Tạo nhóm</button>
           </div>` : '') +
      emptyState(
        '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
        'Chưa có nhóm nào',
        'Nhóm giúp bạn phân quyền và cộng tác hiệu quả hơn.',
      );
    if (_canWrite) container.querySelector('#create-team-btn')?.addEventListener('click', () => _openCreateModal(container, org, userId));
    return;
  }

  container.innerHTML = `
    <div class="org-section-header">
      <h3 class="org-section-title">Nhóm (${_teams.length})</h3>
      ${_canWrite ? `<button class="btn btn--primary btn--sm" id="create-team-btn">+ Tạo nhóm</button>` : ''}
    </div>
    <div class="team-grid">
      ${_teams.map(t => _teamCard(t)).join('')}
    </div>`;

  if (_canWrite) container.querySelector('#create-team-btn')?.addEventListener('click', () => _openCreateModal(container, org, userId));

  container.querySelectorAll('[data-team-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.teamAction;
      const teamId = btn.dataset.teamId;
      const team   = _teams.find(t => t.id === teamId);
      if (!team) return;
      try {
        if (action === 'delete') {
          if (!confirm(`Xóa nhóm "${team.name}"?`)) return;
          await deleteTeam(org.id, teamId, userId);
          await logActivity(org.id, userId, 'team.deleted', 'team', teamId, team.name);
          toast('Đã xóa nhóm');
          await loadOrgTeams(container);
        }
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

function _teamCard(t) {
  return `<div class="team-card">
    <div class="team-card-color" style="background:${esc(t.color)}"></div>
    <div class="team-card-body">
      <h4 class="team-name">${esc(t.name)}</h4>
      <p class="team-slug text-muted">@${esc(t.slug)}</p>
      ${t.description ? `<p class="team-desc">${esc(t.description)}</p>` : ''}
      <p class="team-count text-muted">${t.member_count} thành viên</p>
    </div>
    <div class="team-card-actions">
      ${_canWrite ? `<button class="btn btn--ghost btn--sm btn--danger" data-team-action="delete" data-team-id="${esc(t.id)}">Xóa</button>` : ''}
    </div>
  </div>`;
}

function _openCreateModal(container, org, userId) {
  const dlg = document.createElement('div');
  dlg.className = 'modal-backdrop';
  dlg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Tạo nhóm">
    <h3 class="modal-title">Tạo nhóm mới</h3>
    <div class="form-group"><label for="team-name">Tên nhóm <span aria-hidden="true">*</span></label>
      <input id="team-name" class="input" type="text" maxlength="80" placeholder="Ví dụ: Marketing" required></div>
    <div class="form-group"><label for="team-slug">Slug</label>
      <input id="team-slug" class="input" type="text" maxlength="40" placeholder="marketing"></div>
    <div class="form-group"><label for="team-desc">Mô tả</label>
      <textarea id="team-desc" class="input" rows="2" maxlength="300"></textarea></div>
    <div class="form-group"><label for="team-color">Màu</label>
      <input id="team-color" type="color" value="#6366f1" class="input-color"></div>
    <p class="form-error hidden" id="team-form-err"></p>
    <div class="modal-actions">
      <button class="btn btn--ghost" id="team-cancel">Hủy</button>
      <button class="btn btn--primary" id="team-save">Tạo nhóm</button>
    </div>
  </div>`;
  document.body.appendChild(dlg);

  const nameInput  = dlg.querySelector('#team-name');
  const slugInput  = dlg.querySelector('#team-slug');
  const descInput  = dlg.querySelector('#team-desc');
  const colorInput = dlg.querySelector('#team-color');
  const errEl      = dlg.querySelector('#team-form-err');

  nameInput.addEventListener('input', () => {
    if (!slugInput.dataset.edited)
      slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  });
  slugInput.addEventListener('input', () => { slugInput.dataset.edited = '1'; });

  const close = () => dlg.remove();
  dlg.querySelector('#team-cancel').onclick = close;
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  dlg.querySelector('#team-save').onclick = async () => {
    const name = nameInput.value.trim();
    const slug = slugInput.value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40);
    if (!name) { errEl.textContent = 'Tên nhóm không được để trống'; errEl.classList.remove('hidden'); return; }
    try {
      const t = await createTeam(org.id, { name, slug, description: descInput.value.trim(), color: colorInput.value }, userId);
      await logActivity(org.id, userId, 'team.created', 'team', t.id, t.name);
      toast('Đã tạo nhóm');
      close();
      await loadOrgTeams(container);
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
  };

  nameInput.focus();
}
