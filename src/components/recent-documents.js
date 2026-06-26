const DOC_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z"/><polyline points="9 2 9 6 13 6"/></svg>`;

function relTime(ts) {
  const diff  = Date.now() - ts;
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (hours < 1)  return 'vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'hôm qua';
  return `${days} ngày trước`;
}

function row(doc) {
  return `
    <div class="rdoc-row">
      <div class="rdoc-icon" aria-hidden="true">${DOC_ICON}</div>
      <div class="rdoc-body">
        <div class="rdoc-name" title="${doc.name}">${doc.name}</div>
        <div class="rdoc-type">${doc.type}</div>
      </div>
      <time class="rdoc-time" datetime="${new Date(doc.createdAt).toISOString()}">${relTime(doc.createdAt)}</time>
    </div>
  `;
}

export function render(docs) {
  if (!docs?.length) {
    return '<p class="dash-empty">Chưa có tài liệu nào. Hãy tạo tài liệu đầu tiên!</p>';
  }
  return `<div class="rdoc-list">${docs.map(row).join('')}</div>`;
}
