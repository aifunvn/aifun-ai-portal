import { listDocuments } from '../services/document-service.js';

const ICON_DOC = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z"/><polyline points="10 2 10 7 15 7"/></svg>`;
const ICON_ARR = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 11 9 7 5 3"/></svg>`;

function relTime(iso) {
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

function docRow(doc) {
  return `
    <div class="doc-row" data-doc-id="${doc.id}" role="button" tabindex="0" aria-label="Mo tai lieu: ${doc.title}">
      <div class="doc-row-icon" aria-hidden="true">${ICON_DOC}</div>
      <div class="doc-row-body">
        <div class="doc-row-title">${doc.title}</div>
        <div class="doc-row-meta">${doc.builderName ?? 'AI Builder'} &middot; ${relTime(doc.createdAt)}</div>
      </div>
      <span class="doc-row-arrow" aria-hidden="true">${ICON_ARR}</span>
    </div>
  `;
}

export function render(workspaceId, query = '') {
  const docs = listDocuments(workspaceId, { query });

  if (!docs.length) {
    const msg = query ? 'Khong tim thay tai lieu phu hop' : 'Chua co tai lieu nao';
    const sub = query ? '' : '<p class="doc-empty-desc">Tao tai lieu dau tien bang AI Builders</p>';
    return `
      <div class="doc-empty">
        <svg width="42" height="42" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z"/><polyline points="10 2 10 7 15 7"/></svg>
        <p class="doc-empty-title">${msg}</p>
        ${sub}
      </div>
    `;
  }

  return `<div class="doc-items">${docs.map(docRow).join('')}</div>`;
}
