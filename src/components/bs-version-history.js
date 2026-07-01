function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function row(v, isCurrent) {
  return `
    <div class="bs-version-row ${isCurrent ? 'bs-version-row--current' : ''}">
      <div class="bs-version-meta">
        <span class="bs-version-num">v${v.version}</span>
        <span class="bs-version-date">${fmtDate(v.createdAt)}</span>
        ${isCurrent ? '<span class="bs-status bs-status--published">Hiện tại</span>' : ''}
      </div>
      <p class="bs-version-note">${esc(v.changeNote) || 'Không có ghi chú'}</p>
      ${isCurrent ? '' : `<button class="bs-card-btn" data-restore="${v.version}">Khôi phục phiên bản này</button>`}
    </div>
  `;
}

export function render(versions, currentVersion) {
  if (!versions?.length) {
    return '<p class="bs-empty-note">Chưa có lịch sử phiên bản.</p>';
  }
  return `<div class="bs-version-list">${versions.map((v) => row(v, v.version === currentVersion)).join('')}</div>`;
}
