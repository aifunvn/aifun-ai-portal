function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function relTime(iso) {
  if (!iso) return '';
  const diff  = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (hours < 1)  return 'vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'hôm qua';
  return `${days} ngày trước`;
}

export function render(builder) {
  const statusCls   = builder.status === 'published' ? 'bs-status--published' : 'bs-status--draft';
  const statusLabel = builder.status === 'published' ? 'Đã publish' : 'Bản nháp';

  return `
    <div class="bs-card" data-builder-id="${builder.id}">
      <div class="bs-card-head">
        <span class="bs-tag">${esc(builder.category)}</span>
        <span class="bs-status ${statusCls}">${statusLabel}</span>
      </div>
      <h3 class="bs-card-name">${esc(builder.name)}</h3>
      <p class="bs-card-desc">${esc(builder.description) || 'Chưa có mô tả.'}</p>
      <div class="bs-card-meta">
        <span>${esc(builder.model)}</span>
        <span>&middot;</span>
        <span>v${builder.currentVersion ?? 1}</span>
        <span>&middot;</span>
        <span>Cập nhật ${relTime(builder.updatedAt)}</span>
      </div>
      <div class="bs-card-actions">
        <button class="bs-card-btn" data-action="edit"      data-id="${builder.id}">Sửa</button>
        <button class="bs-card-btn" data-action="playground" data-id="${builder.id}">Test</button>
        <button class="bs-card-btn" data-action="versions"   data-id="${builder.id}">Phiên bản</button>
        <button class="bs-card-btn" data-action="analytics"  data-id="${builder.id}">Thống kê</button>
        <button class="bs-card-btn" data-action="toggle-status" data-id="${builder.id}">
          ${builder.status === 'published' ? 'Chuyển nháp' : 'Publish'}
        </button>
        <button class="bs-card-btn bs-card-btn--danger" data-action="delete" data-id="${builder.id}">Xóa</button>
      </div>
    </div>
  `;
}
