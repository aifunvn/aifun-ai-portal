import { orgStore }     from '../stores/org-store.js';
import { listActivity } from '../services/org-activity-service.js';
import { esc, emptyState, loadingHtml, toast, _fmt } from './org-shared.js';

let _cursor = null;
let _items  = [];
let _loading = false;

export async function loadOrgActivity(container) {
  const org = orgStore.getOrg();
  if (!org) { container.innerHTML = '<p class="text-muted">Chưa chọn tổ chức.</p>'; return; }

  _cursor  = null;
  _items   = [];
  container.innerHTML = loadingHtml();

  await _fetchMore(org.id);
  _render(container, org);
}

async function _fetchMore(orgId) {
  if (_loading) return;
  _loading = true;
  try {
    const result = await listActivity(orgId, { cursor: _cursor, limit: 30 });
    _items  = [..._items, ...result.items];
    _cursor = result.next_cursor;
  } finally {
    _loading = false;
  }
}

function _render(container, org) {
  if (!_items.length) {
    container.innerHTML = emptyState(
      '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      'Chưa có hoạt động nào',
      'Hoạt động của tổ chức sẽ xuất hiện ở đây.',
    );
    return;
  }

  container.innerHTML = `
    <div class="org-section-header">
      <h3 class="org-section-title">Nhật ký hoạt động</h3>
      <div class="activity-filters">
        <select id="activity-type-filter" class="input input--sm">
          <option value="">Tất cả loại</option>
          <option value="member">Thành viên</option>
          <option value="team">Nhóm</option>
          <option value="invite">Lời mời</option>
          <option value="org">Tổ chức</option>
        </select>
      </div>
    </div>
    <div class="activity-feed" id="activity-feed">
      ${_items.map(_activityItem).join('')}
    </div>
    ${_cursor ? `<div class="load-more-row"><button class="btn btn--ghost" id="load-more">Tải thêm</button></div>` : ''}`;

  container.querySelector('#activity-type-filter')?.addEventListener('change', async e => {
    const type = e.target.value;
    container.querySelector('#activity-feed').innerHTML = loadingHtml();
    _cursor = null; _items = [];
    const result = await listActivity(org.id, { limit: 30, resourceType: type || undefined });
    _items  = result.items;
    _cursor = result.next_cursor;
    container.querySelector('#activity-feed').innerHTML = _items.map(_activityItem).join('');
    _updateLoadMore(container, org);
  });

  container.querySelector('#load-more')?.addEventListener('click', async () => {
    await _fetchMore(org.id);
    container.querySelector('#activity-feed').insertAdjacentHTML('beforeend', _items.slice(-30).map(_activityItem).join(''));
    _updateLoadMore(container, org);
  });
}

function _updateLoadMore(container, org) {
  const btn = container.querySelector('#load-more');
  if (btn && !_cursor) btn.closest('.load-more-row').remove();
}

function _activityItem(a) {
  const actor = a.actor?.raw_user_meta_data?.display_name ?? a.actor?.email ?? 'Hệ thống';
  return `<div class="activity-item">
    <div class="activity-avatar">${(actor[0] ?? '?').toUpperCase()}</div>
    <div class="activity-body">
      <p class="activity-desc">
        <strong>${esc(actor)}</strong> ${esc(_fmt.action(a.action))}
        ${a.resource_name ? `<em>"${esc(a.resource_name)}"</em>` : ''}
      </p>
      <p class="activity-meta text-muted">${_fmt.relTime(a.created_at)}</p>
    </div>
  </div>`;
}
