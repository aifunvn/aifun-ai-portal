function fmtTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function eventRow(e) {
  const cls = e.success ? 'bs-evt--ok' : 'bs-evt--fail';
  return `
    <div class="bs-evt-row ${cls}">
      <span>${e.eventType === 'test_run' ? 'Test' : 'Sử dụng'}</span>
      <span>${e.success ? 'Thành công' : 'Thất bại'}</span>
      <span>${e.tokensUsed} tokens</span>
      <span>${e.responseTimeMs} ms</span>
      <span>${fmtTime(e.createdAt)}</span>
    </div>
  `;
}

export function render(summary) {
  if (!summary || summary.totalRuns === 0) {
    return '<p class="bs-empty-note">Chưa có dữ liệu sử dụng. Hãy chạy Test Playground để bắt đầu thu thập số liệu.</p>';
  }
  return `
    <div class="bs-analytics-grid">
      <div class="bs-analytics-card">
        <div class="bs-analytics-value">${summary.totalRuns}</div>
        <div class="bs-analytics-label">Lượt chạy</div>
      </div>
      <div class="bs-analytics-card">
        <div class="bs-analytics-value">${summary.successRate ?? 0}%</div>
        <div class="bs-analytics-label">Tỷ lệ thành công</div>
      </div>
      <div class="bs-analytics-card">
        <div class="bs-analytics-value">${summary.totalTokens}</div>
        <div class="bs-analytics-label">Tổng tokens</div>
      </div>
      <div class="bs-analytics-card">
        <div class="bs-analytics-value">${summary.avgResponseMs}ms</div>
        <div class="bs-analytics-label">Thời gian phản hồi TB</div>
      </div>
    </div>
    <div class="bs-evt-list">
      <div class="bs-evt-header">
        <span>Loại</span><span>Trạng thái</span><span>Tokens</span><span>Thời gian</span><span>Lúc</span>
      </div>
      ${summary.recentEvents.map(eventRow).join('')}
    </div>
  `;
}
