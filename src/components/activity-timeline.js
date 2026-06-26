function relTime(ts) {
  const diff  = Date.now() - ts;
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (hours < 1)  return 'vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'hôm qua';
  return `${days} ngày trước`;
}

function item(entry) {
  return `
    <div class="activity-item">
      <div class="activity-dot" aria-hidden="true"></div>
      <div class="activity-content">
        <div class="activity-text">${entry.text}</div>
        <time class="activity-time" datetime="${new Date(entry.at).toISOString()}">${relTime(entry.at)}</time>
      </div>
    </div>
  `;
}

export function render(log) {
  if (!log?.length) {
    return '<p class="dash-empty">Chưa có hoạt động nào.</p>';
  }
  return `<div class="activity-list">${log.map(item).join('')}</div>`;
}
