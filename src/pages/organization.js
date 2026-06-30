/**
 * /organization shell — HTML template only.
 * Routing and sub-page loading are handled entirely in app.js.
 */

const SUB_PAGES = [
  { id: 'overview',  path: '/organization',          label: 'Tổng quan',  icon: 'grid' },
  { id: 'members',   path: '/organization/members',  label: 'Thành viên', icon: 'users' },
  { id: 'teams',     path: '/organization/teams',    label: 'Nhóm',       icon: 'layers' },
  { id: 'roles',     path: '/organization/roles',    label: 'Phân quyền', icon: 'shield' },
  { id: 'invites',   path: '/organization/invites',  label: 'Lời mời',    icon: 'mail' },
  { id: 'activity',  path: '/organization/activity', label: 'Hoạt động',  icon: 'clock' },
  { id: 'audit',     path: '/organization/audit',    label: 'Kiểm toán',  icon: 'file-text' },
];

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function _orgShellHtml(activeId, orgName) {
  return `
    <div class="org-shell">
      <aside class="org-subnav" aria-label="Điều hướng tổ chức">
        <div class="org-subnav-header">
          <span class="org-subnav-title">${_esc(orgName ?? 'Tổ chức')}</span>
        </div>
        <nav>
          <ul class="org-subnav-list">
            ${SUB_PAGES.map(p => `
              <li>
                <a href="#${p.path}"
                   class="org-subnav-link ${p.id === activeId ? 'org-subnav-link--active' : ''}"
                   data-sub="${p.id}">
                  <span class="nav-icon icon-${p.icon}"></span>
                  ${_esc(p.label)}
                </a>
              </li>`).join('')}
          </ul>
        </nav>
      </aside>
      <main class="org-content" id="org-content" aria-live="polite"></main>
    </div>`;
}
