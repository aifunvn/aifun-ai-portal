const ICON_DOC  = `<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z"/><polyline points="10 2 10 7 15 7"/></svg>`;
const ICON_ARR  = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 11 9 7 5 3"/></svg>`;
const ICON_PIN  = `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 2.5l4 4-2 2-3-1-3.5 3.5-1.5 2-2-2 2-1.5L7 6l-1-3z"/></svg>`;
const ICON_STAR = `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.9 3.9L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1L2 5.6l4.1-.7z"/></svg>`;
const ICON_SYNC = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8a6 6 0 016-6 6 6 0 014.2 1.7"/><path d="M14 8a6 6 0 01-6 6 6 6 0 01-4.2-1.7"/><polyline points="14 3 14 6 11 6"/><polyline points="2 13 2 10 5 10"/></svg>`;

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'vua xong';
  if (m < 60) return `${m} phut truoc`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} gio truoc`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hom qua';
  return `${d} ngay truoc`;
}

function badges(doc) {
  const pins = doc.pinned  ? `<span class="doc-badge doc-badge--pin"  title="Da ghim">${ICON_PIN}</span>` : '';
  const favs = doc.favorite ? `<span class="doc-badge doc-badge--fav" title="Yeu thich">${ICON_STAR}</span>` : '';
  const sync = doc.driveSyncStatus === 'synced' ? `<span class="doc-badge doc-badge--sync" title="Da dong bo Drive">${ICON_SYNC}</span>` : '';
  return pins + favs + sync;
}

function docRow(doc) {
  return `
    <div class="doc-row" data-doc-id="${doc.id}" role="button" tabindex="0" aria-label="Mo tai lieu: ${doc.title}">
      <div class="doc-row-icon" aria-hidden="true">${ICON_DOC}</div>
      <div class="doc-row-body">
        <div class="doc-row-title-wrap">
          <span class="doc-row-title">${doc.title}</span>
          <span class="doc-row-badges">${badges(doc)}</span>
        </div>
        <div class="doc-row-meta">
          <span>${doc.builderName ?? 'AI Builder'}</span>
          <span class="doc-meta-dot">&middot;</span>
          <span>${relTime(doc.createdAt)}</span>
          ${doc.tokens?.total ? `<span class="doc-meta-dot">&middot;</span><span>${doc.tokens.total.toLocaleString('vi-VN')} tokens</span>` : ''}
        </div>
      </div>
      <span class="doc-row-arrow" aria-hidden="true">${ICON_ARR}</span>
    </div>
  `;
}

export function render(docs = []) {
  if (!docs.length) return renderEmpty('Chua co tai lieu nao. Tao tai lieu dau tien bang AI Builders.');
  return `<div class="doc-items">${docs.map(docRow).join('')}</div>`;
}

export function renderSection(docs = [], title = '') {
  if (!docs.length) return '';
  return `
    <div class="doc-section">
      <h3 class="doc-section-title">${title}</h3>
      <div class="doc-items">${docs.map(docRow).join('')}</div>
    </div>
  `;
}

export function renderEmpty(message = 'Khong tim thay tai lieu phu hop') {
  return `
    <div class="doc-empty">
      <svg width="42" height="42" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z"/><polyline points="10 2 10 7 15 7"/></svg>
      <p class="doc-empty-title">${message}</p>
    </div>
  `;
}

export function renderPagination({ page, total, limit }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return '';
  const prev = page > 1;
  const next = page < totalPages;
  return `
    <div class="doc-pagination" role="navigation" aria-label="Phan trang">
      <button class="doc-page-btn" id="doc-page-prev" ${prev ? '' : 'disabled'} aria-label="Trang truoc">&#8592;</button>
      <span class="doc-page-info">Trang ${page} / ${totalPages} &nbsp;·&nbsp; ${total} tai lieu</span>
      <button class="doc-page-btn" id="doc-page-next" ${next ? '' : 'disabled'} aria-label="Trang sau">&#8594;</button>
    </div>
  `;
}
