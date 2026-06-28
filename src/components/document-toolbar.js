import { render as renderExport } from './document-export.js';

const ICON_BACK   = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>`;
const ICON_DELETE = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><rect x="3" y="4" width="10" height="10" rx="1"/></svg>`;
const ICON_INFO   = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><line x1="8" y1="11" x2="8" y2="8"/><line x1="8" y1="5" x2="8.01" y2="5"/></svg>`;
const ICON_COPY   = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="9" height="10" rx="1"/><path d="M11 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v10a1 1 0 001 1h1"/></svg>`;

export function render({ canDelete = true } = {}) {
  return `
    <div class="doc-toolbar">
      <button class="doc-toolbar-back" id="doc-toolbar-back" aria-label="Quay lai danh sach tai lieu">
        ${ICON_BACK} Tat ca tai lieu
      </button>
      <div class="doc-toolbar-actions">
        <button class="btn btn-secondary btn-sm" id="doc-toolbar-copy" title="Sao chep noi dung">
          ${ICON_COPY} Sao chep
        </button>
        ${renderExport()}
        <button class="btn btn-secondary btn-sm" id="doc-toolbar-meta" aria-label="Thong tin tai lieu" title="Metadata">
          ${ICON_INFO}
        </button>
        ${canDelete ? `
          <button class="btn btn-danger btn-sm" id="doc-toolbar-delete" aria-label="Xoa tai lieu">
            ${ICON_DELETE} Xoa
          </button>` : ''}
      </div>
    </div>
  `;
}
