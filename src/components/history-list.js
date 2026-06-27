function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function fmtMs(ms) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtCost(usd) {
  if (!usd) return '—';
  return usd < 0.001 ? '<$0.001' : `$${usd.toFixed(4)}`;
}

function statusBadge(status) {
  const MAP = {
    completed: { cls: 'hist-badge--ok',       label: 'Thành công' },
    failed:    { cls: 'hist-badge--fail',      label: 'Thất bại'  },
    fallback:  { cls: 'hist-badge--fallback',  label: 'Fallback'  },
  };
  const s = MAP[status] ?? MAP.completed;
  return `<span class="hist-badge ${s.cls}">${s.label}</span>`;
}

function histRow(req) {
  const tokens = req.totalTokens
    ? `${req.totalTokens.toLocaleString('vi-VN')} tk`
    : '—';
  return `
    <div class="hist-row ${req.status === 'failed' ? 'hist-row--fail' : ''}"
         role="row" aria-label="${req.builderName ?? 'AI Request'}">
      <div class="hist-row-main">
        <span class="hist-builder">${req.builderName ?? req.builderId ?? 'AI Builder'}</span>
        <span class="hist-provider">${req.provider ?? '—'}${req.model ? ' · ' + req.model : ''}</span>
      </div>
      <div class="hist-row-meta">
        <span class="hist-tokens">${tokens}</span>
        <span class="hist-cost">${fmtCost(req.estimatedCost)}</span>
        <span class="hist-time">${fmtMs(req.responseTimeMs)}</span>
        ${statusBadge(req.status)}
        <span class="hist-age">${relTime(req.createdAt)}</span>
      </div>
      ${req.errorMessage ? `<div class="hist-error" role="alert">${req.errorMessage}</div>` : ''}
    </div>
  `;
}

export function render(requests = []) {
  if (!requests.length) return renderEmpty();
  return `
    <div class="hist-table" role="table" aria-label="Lịch sử AI">
      <div class="hist-thead" role="row">
        <span>Builder · Provider</span>
        <span>Tokens</span>
        <span>Chi phí</span>
        <span>Thời gian</span>
        <span>Trạng thái</span>
        <span>Tạo lúc</span>
      </div>
      <div class="hist-tbody">${requests.map(histRow).join('')}</div>
    </div>
  `;
}

export function renderEmpty(message = 'Chưa có lịch sử AI nào. Tạo tài liệu đầu tiên bằng AI Builders.') {
  return `
    <div class="hist-empty">
      <svg width="42" height="42" viewBox="0 0 18 18" fill="none" stroke="currentColor"
           stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="9" r="7"/><polyline points="9 5 9 9 12 11"/>
      </svg>
      <p class="hist-empty-title">${message}</p>
    </div>
  `;
}

export function renderPagination({ page, total, limit }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return '';
  return `
    <div class="hist-pagination" role="navigation" aria-label="Phân trang">
      <button class="doc-page-btn" id="hist-page-prev"
              ${page > 1 ? '' : 'disabled'} aria-label="Trang trước">&#8592;</button>
      <span class="doc-page-info">Trang ${page} / ${totalPages} &nbsp;·&nbsp; ${total} yêu cầu</span>
      <button class="doc-page-btn" id="hist-page-next"
              ${page < totalPages ? '' : 'disabled'} aria-label="Trang sau">&#8594;</button>
    </div>
  `;
}
