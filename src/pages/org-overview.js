import { orgStore }     from '../stores/org-store.js';
import { listMembers }  from '../services/org-member-service.js';
import { listTeams }    from '../services/org-team-service.js';
import { listActivity } from '../services/org-activity-service.js';
import { _fmt }         from './org-shared.js';

export async function loadOrgOverview(container) {
  const org = orgStore.getOrg();
  if (!org) { container.innerHTML = '<p class="text-muted">Chưa chọn tổ chức.</p>'; return; }

  container.innerHTML = '<div class="org-loading"><span class="spinner"></span></div>';

  const [members, teams, activity] = await Promise.all([
    listMembers(org.id).catch(() => []),
    listTeams(org.id).catch(() => []),
    listActivity(org.id, { limit: 5 }).catch(() => ({ items: [] })),
  ]);

  const activeMembers = members.filter(m => m.status === 'active');

  container.innerHTML = `
    <div class="org-overview">
      <div class="org-hero">
        <div class="org-avatar">${_orgAvatarHtml(org)}</div>
        <div class="org-hero-info">
          <h2 class="org-name">${_esc(org.name)}</h2>
          <p class="org-slug text-muted">@${_esc(org.slug)}</p>
          ${org.description ? `<p class="org-desc">${_esc(org.description)}</p>` : ''}
          <span class="badge badge--${org.plan}">${org.plan.toUpperCase()}</span>
        </div>
      </div>

      <div class="stat-row">
        ${_stat('Thành viên', activeMembers.length, 'users', `/${org.seat_limit ?? '∞'} chỗ`)}
        ${_stat('Nhóm', teams.length, 'layers')}
        ${_stat('Vai trò của bạn', _roleLabelVi(org.my_role), 'shield')}
      </div>

      <div class="org-panels">
        <div class="org-panel">
          <h3 class="panel-title">Thành viên gần đây</h3>
          ${_membersList(activeMembers.slice(0, 5))}
          ${activeMembers.length > 5
            ? `<a href="#/organization/members" class="panel-more">Xem tất cả ${activeMembers.length} thành viên →</a>`
            : ''}
        </div>
        <div class="org-panel">
          <h3 class="panel-title">Hoạt động gần đây</h3>
          ${_activityList(activity.items)}
        </div>
      </div>
    </div>`;
}

function _orgAvatarHtml(org) {
  if (org.avatar_url)
    return `<img src="${_esc(org.avatar_url)}" alt="${_esc(org.name)}" class="org-avatar-img">`;
  return `<span class="org-avatar-letter">${(org.name[0] ?? 'O').toUpperCase()}</span>`;
}

function _stat(label, value, icon, suffix = '') {
  return `<div class="stat-card">
    <span class="stat-icon icon-${icon}"></span>
    <span class="stat-value">${_esc(String(value))}${suffix}</span>
    <span class="stat-label">${label}</span>
  </div>`;
}

function _membersList(members) {
  if (!members.length) return '<p class="empty-hint">Chưa có thành viên.</p>';
  return `<ul class="member-mini-list">${members.map(m => `
    <li class="member-mini">
      <span class="member-mini-avatar">${(m.display_name[0] ?? '?').toUpperCase()}</span>
      <span class="member-mini-name">${_esc(m.display_name)}</span>
      <span class="role-chip role-chip--${m.role}">${_roleLabelVi(m.role)}</span>
    </li>`).join('')}</ul>`;
}

function _activityList(items) {
  if (!items.length) return '<p class="empty-hint">Chưa có hoạt động.</p>';
  return `<ul class="activity-mini">${items.map(a => `
    <li class="activity-mini-item">
      <span class="activity-dot"></span>
      <span class="activity-text">${_esc(_fmt.action(a.action))} — <em>${_esc(a.resource_name ?? a.resource_id ?? '')}</em></span>
      <span class="activity-time">${_fmt.relTime(a.created_at)}</span>
    </li>`).join('')}</ul>`;
}

function _roleLabelVi(role) {
  return { owner: 'Chủ sở hữu', admin: 'Quản trị', manager: 'Quản lý', editor: 'Thành viên', viewer: 'Xem' }[role] ?? role;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
