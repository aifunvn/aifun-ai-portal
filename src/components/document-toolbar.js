const ICON_BACK   = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>`;
const ICON_DELETE = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M6 7v5M10 7v5"/><rect x="3" y="4" width="10" height="10" rx="1"/></svg>`;

export function render({ canDelete = true } = {}) {
  return `
    <div class="doc-toolbar">
      <button class="doc-toolbar-back" id="doc-toolbar-back" aria-label="Quay lai danh sach tai lieu">
        ${ICON_BACK} Tat ca tai lieu
      </button>
      <div class="doc-toolbar-actions">
        <button class="btn btn-secondary" id="doc-toolbar-copy">Sao chep</button>
        <button class="btn btn-secondary" id="doc-toolbar-export">Xuat .txt</button>
        ${canDelete ? `
          <button class="btn btn-danger" id="doc-toolbar-delete" aria-label="Xoa tai lieu">
            ${ICON_DELETE} Xoa
          </button>` : ''}
      </div>
    </div>
  `;
}
