const ICON_BACK = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>`;

export function render() {
  return `
    <div class="doc-toolbar">
      <button class="doc-toolbar-back" id="doc-toolbar-back" aria-label="Quay lai danh sach tai lieu">
        ${ICON_BACK} Tat ca tai lieu
      </button>
      <div class="doc-toolbar-actions">
        <button class="btn btn-secondary" id="doc-toolbar-copy">Sao chep</button>
        <button class="btn btn-secondary" id="doc-toolbar-export">Xuat .txt</button>
      </div>
    </div>
  `;
}
