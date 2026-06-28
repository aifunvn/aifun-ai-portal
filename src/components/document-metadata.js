// Right-side metadata panel for document view.
// Shows: prompt, provider, model, tokens, cost, version history, drive sync.

const ICON_STAR_FILL = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.9 3.9L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1L2 5.6l4.1-.7z"/></svg>`;
const ICON_STAR      = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 1l1.9 3.9L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1L2 5.6l4.1-.7z"/></svg>`;
const ICON_PIN_FILL  = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 2.5l4 4-2 2-3-1-3.5 3.5-1.5 2-2-2 2-1.5L7 6l-1-3z"/></svg>`;
const ICON_PIN       = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9.5 2.5l4 4-2 2-3-1-3.5 3.5-1.5 2-2-2 2-1.5L7 6l-1-3z"/></svg>`;
const ICON_DRIVE     = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12L5.5 5l3.5 7H2z"/><path d="M14 12H9l-2.5-4h6L14 12z"/><path d="M8 2l2.5 4H5.5L8 2z"/></svg>`;
const ICON_HISTORY   = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><polyline points="8 5 8 8 10 10"/></svg>`;

const SYNC_LABELS = { none: 'Chua dong bo', syncing: 'Dang dong bo...', synced: 'Da dong bo', error: 'Loi dong bo' };
const SYNC_COLORS = { none: 'var(--text-3)', syncing: 'var(--c-warning)', synced: 'var(--c-success)', error: 'var(--c-danger)' };

function _fmt(n) { return (n ?? 0).toLocaleString('vi-VN'); }
function _fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function render(doc, versions = []) {
  const syncColor = SYNC_COLORS[doc.driveSyncStatus] ?? SYNC_COLORS.none;
  const syncLabel = SYNC_LABELS[doc.driveSyncStatus] ?? SYNC_LABELS.none;

  const versionRows = versions.length
    ? versions.map((v) => `
        <div class="meta-ver-row ${v.version === doc.version ? 'meta-ver-row--active' : ''}"
             data-restore-version="${v.version}">
          <span class="meta-ver-num">v${v.version}</span>
          <span class="meta-ver-date">${_fmtDate(v.createdAt)}</span>
          ${v.version !== doc.version ? `<button class="meta-ver-restore" data-version="${v.version}">Khoi phuc</button>` : '<span class="meta-ver-current">Hien tai</span>'}
        </div>`).join('')
    : `<p class="meta-no-versions">Chua co lich su phien ban</p>`;

  return `
    <aside class="doc-meta-panel" id="doc-meta-panel" aria-label="Thong tin tai lieu">
      <div class="meta-section">
        <div class="meta-actions-row">
          <button class="meta-icon-btn ${doc.favorite ? 'meta-icon-btn--active' : ''}" id="meta-btn-favorite"
                  aria-label="${doc.favorite ? 'Bo yeu thich' : 'Them vao yeu thich'}" title="${doc.favorite ? 'Bo yeu thich' : 'Yeu thich'}">
            ${doc.favorite ? ICON_STAR_FILL : ICON_STAR}
          </button>
          <button class="meta-icon-btn ${doc.pinned ? 'meta-icon-btn--active meta-icon-btn--pin' : ''}" id="meta-btn-pin"
                  aria-label="${doc.pinned ? 'Bo ghim' : 'Ghim tai lieu'}" title="${doc.pinned ? 'Bo ghim' : 'Ghim'}">
            ${doc.pinned ? ICON_PIN_FILL : ICON_PIN}
          </button>
        </div>
      </div>

      <div class="meta-section">
        <h4 class="meta-section-title">Thong tin</h4>
        <dl class="meta-dl">
          <dt>Builder</dt>    <dd>${doc.builderName ?? '—'}</dd>
          <dt>Provider</dt>   <dd>${doc.provider ?? '—'}</dd>
          <dt>Model</dt>      <dd class="meta-mono">${doc.model ?? '—'}</dd>
          <dt>Phien ban</dt>  <dd>v${doc.version ?? 1}</dd>
          <dt>Tokens</dt>     <dd>${_fmt(doc.tokens?.total)} (${_fmt(doc.tokens?.prompt)}↑ / ${_fmt(doc.tokens?.completion)}↓)</dd>
          <dt>Chi phi</dt>    <dd>$${(doc.costUsd ?? 0).toFixed(4)}</dd>
          <dt>Tao luc</dt>    <dd>${_fmtDate(doc.createdAt)}</dd>
          <dt>Mo gan nhat</dt><dd>${_fmtDate(doc.lastOpened)}</dd>
        </dl>
      </div>

      ${doc.prompt ? `
      <div class="meta-section">
        <h4 class="meta-section-title">Prompt da dung</h4>
        <div class="meta-prompt">${doc.prompt.slice(0, 400)}${doc.prompt.length > 400 ? '…' : ''}</div>
      </div>` : ''}

      <div class="meta-section">
        <h4 class="meta-section-title">${ICON_DRIVE} Google Drive</h4>
        <div class="meta-drive-row">
          <span class="meta-drive-status" style="color:${syncColor}">${syncLabel}</span>
          ${doc.docUrl
            ? `<a class="btn btn-sm btn-secondary meta-drive-link" href="${doc.docUrl}" target="_blank" rel="noopener">Mo Drive ↗</a>`
            : `<button class="btn btn-sm btn-secondary" id="meta-btn-sync">Dong bo</button>`}
        </div>
      </div>

      <div class="meta-section">
        <h4 class="meta-section-title">${ICON_HISTORY} Lich su phien ban</h4>
        <div class="meta-versions">${versionRows}</div>
      </div>
    </aside>
  `;
}

export function initMetadata(doc, { onFavorite, onPin, onSync, onRestore }) {
  document.getElementById('meta-btn-favorite')?.addEventListener('click', () => onFavorite(!doc.favorite));
  document.getElementById('meta-btn-pin')?.addEventListener('click', () => onPin(!doc.pinned));
  document.getElementById('meta-btn-sync')?.addEventListener('click', () => onSync());

  document.querySelectorAll('.meta-ver-restore').forEach((btn) => {
    btn.addEventListener('click', () => onRestore(parseInt(btn.dataset.version, 10)));
  });
}
