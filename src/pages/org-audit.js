import { orgStore }       from '../stores/org-store.js';
import { listAuditLogs }  from '../services/org-audit-service.js';
import { canDo }          from '../services/permission-engine.js';
import { userStore }      from '../stores/user-store.js';
import { esc, emptyState, loadingHtml, _fmt } from './org-shared.js';

const SEVERITY_LABEL = { info: 'Info', warning: 'Cảnh báo', critical: 'Nghiêm trọng' };

export async function loadOrgAudit(container) {
  const org    = orgStore.getOrg();
  const userId = userStore.getUser()?.id;
  if (!org) { container.innerHTML = '<p class="text-muted">Chưa chọn tổ chức.</p>'; return; }

  const allowed = await canDo(org.id, 'audit:read', userId);
  if (!allowed) {
    container.innerHTML = `<div class="org-access-denied">
      <p class="text-muted">Chỉ Owner và Admin mới có thể xem nhật ký kiểm toán.</p>
    </div>`;
    return;
  }

  container.innerHTML = loadingHtml();

  try {
    const { items, next_cursor } = await listAuditLogs(org.id, { limit: 50 });
    _render(container, org, userId, items, next_cursor);
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Không thể tải nhật ký: ${esc(err.message)}</p>`;
  }
}

function _render(container, org, userId, items, nextCursor) {
  if (!items.length) {
    container.innerHTML = emptyState(
      '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
      'Chưa có bản ghi kiểm toán',
      'Các sự kiện bảo mật quan trọng sẽ xuất hiện ở đây.',
    );
    return;
  }

  container.innerHTML = `
    <div class="org-section-header">
      <h3 class="org-section-title">Nhật ký kiểm toán</h3>
      <div class="audit-filters">
        <select id="audit-sev-filter" class="input input--sm">
          <option value="">Tất cả mức độ</option>
          <option value="info">Info</option>
          <option value="warning">Cảnh báo</option>
          <option value="critical">Nghiêm trọng</option>
        </select>
      </div>
    </div>
    <div class="audit-note text-muted hint-sm">
      Nhật ký kiểm toán là bất biến — không thể sửa hoặc xóa.
    </div>
    <table class="org-table audit-table" id="audit-table">
      <thead><tr>
        <th>Thời gian</th>
        <th>Hành động</th>
        <th>Thực hiện bởi</th>
        <th>Mức độ</th>
        <th>IP</th>
      </tr></thead>
      <tbody>
        ${items.map(_auditRow).join('')}
      </tbody>
    </table>
    ${nextCursor ? `<div class="load-more-row"><button class="btn btn--ghost" id="audit-load-more" data-cursor="${esc(nextCursor)}">Tải thêm</button></div>` : ''}`;

  container.querySelector('#audit-sev-filter')?.addEventListener('change', async e => {
    const sev = e.target.value || undefined;
    container.querySelector('#audit-table tbody').innerHTML = loadingHtml();
    const { items: rows } = await listAuditLogs(org.id, { severity: sev, limit: 50 });
    container.querySelector('#audit-table tbody').innerHTML = rows.map(_auditRow).join('');
  });

  container.querySelector('#audit-load-more')?.addEventListener('click', async function() {
    const { items: more, next_cursor } = await listAuditLogs(org.id, { cursor: this.dataset.cursor, limit: 50 });
    container.querySelector('#audit-table tbody').insertAdjacentHTML('beforeend', more.map(_auditRow).join(''));
    if (!next_cursor) this.closest('.load-more-row').remove();
    else this.dataset.cursor = next_cursor;
  });
}

function _auditRow(a) {
  return `<tr class="audit-row audit-row--${esc(a.severity)}">
    <td class="text-muted">${new Date(a.created_at).toLocaleString('vi-VN')}</td>
    <td><code class="audit-action">${esc(a.action)}</code></td>
    <td>${esc(a.actor_email)}</td>
    <td><span class="severity-badge severity-badge--${esc(a.severity)}">${esc(SEVERITY_LABEL[a.severity] ?? a.severity)}</span></td>
    <td class="text-muted">${esc(a.ip_address ?? '—')}</td>
  </tr>`;
}
