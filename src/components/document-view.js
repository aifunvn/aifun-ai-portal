import { renderMarkdown }                    from './markdown-viewer.js';
import { render as renderToolbar }           from './document-toolbar.js';
import { render as renderMeta, initMetadata } from './document-metadata.js';
import { initExport }                         from './document-export.js';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function render(doc, { canDelete = true } = {}) {
  const tokenBadge    = doc.tokens?.total
    ? `<span class="doc-meta-badge">${doc.tokens.total.toLocaleString('vi-VN')} tokens</span>` : '';
  const providerBadge = doc.provider
    ? `<span class="doc-meta-badge">${doc.provider}${doc.model ? ' · ' + doc.model : ''}</span>` : '';
  const docUrlLink    = doc.docUrl
    ? `<a class="doc-meta-badge doc-gdocs-link" href="${doc.docUrl}" target="_blank" rel="noopener">Google Docs ↗</a>` : '';
  const verBadge      = `<span class="doc-meta-badge">v${doc.version ?? 1}</span>`;
  const favBadge      = doc.favorite ? `<span class="doc-meta-badge doc-meta-badge--fav">★ Yeu thich</span>` : '';

  return `
    <div class="doc-view-shell">
      <div class="doc-view-main" id="doc-view-main">
        <div class="doc-view">
          ${renderToolbar({ canDelete })}
          <div class="doc-view-header">
            <h2 class="doc-view-title">${doc.title}</h2>
            <div class="doc-view-meta">
              <span class="doc-builder-tag">${doc.builderName ?? 'AI Builder'}</span>
              <span class="doc-meta-sep">&middot;</span>
              <span>${formatDate(doc.createdAt)}</span>
              ${verBadge}${tokenBadge}${providerBadge}${favBadge}${docUrlLink}
            </div>
          </div>
          <div class="doc-view-body" id="doc-view-body">
            ${renderMarkdown(doc.content ?? '')}
          </div>
        </div>
      </div>
      <div class="doc-meta-sidebar" id="doc-meta-sidebar" hidden>
        <!-- populated by showMeta() -->
      </div>
    </div>
  `;
}

export function initView(doc, versions = [], { onBack, onDelete, onFavorite, onPin, onSync, onRestore, canDelete = true }) {
  // Back
  document.getElementById('doc-toolbar-back')?.addEventListener('click', onBack);

  // Copy
  document.getElementById('doc-toolbar-copy')?.addEventListener('click', async () => {
    const btn = document.getElementById('doc-toolbar-copy');
    try {
      await navigator.clipboard.writeText(doc.content ?? '');
      if (btn) { btn.textContent = 'Da sao chep'; setTimeout(() => { if (btn) btn.innerHTML = btn.innerHTML.replace('Da sao chep', 'Sao chep'); }, 2000); }
    } catch { if (btn) btn.textContent = 'Loi'; }
  });

  // Export dropdown
  initExport(doc);

  // Metadata toggle
  let _metaOpen = false;
  const metaBtn     = document.getElementById('doc-toolbar-meta');
  const metaSidebar = document.getElementById('doc-meta-sidebar');
  const viewMain    = document.getElementById('doc-view-main');

  function showMeta() {
    if (!metaSidebar) return;
    metaSidebar.innerHTML = renderMeta(doc, versions);
    metaSidebar.hidden = false;
    viewMain?.classList.add('doc-view-main--narrow');
    initMetadata(doc, {
      onFavorite: (val) => { doc.favorite = val; onFavorite(val); showMeta(); },
      onPin:      (val) => { doc.pinned  = val; onPin(val);      showMeta(); },
      onSync:     ()    => onSync(),
      onRestore:  (ver) => onRestore(ver),
    });
  }

  function hideMeta() {
    if (!metaSidebar) return;
    metaSidebar.hidden = true;
    viewMain?.classList.remove('doc-view-main--narrow');
  }

  metaBtn?.addEventListener('click', () => {
    _metaOpen = !_metaOpen;
    metaBtn.classList.toggle('btn--active', _metaOpen);
    _metaOpen ? showMeta() : hideMeta();
  });

  // Delete
  if (canDelete) {
    document.getElementById('doc-toolbar-delete')?.addEventListener('click', async () => {
      if (!confirm(`Xoa tai lieu "${doc.title}"?\nHanh dong nay khong the hoan tac.`)) return;
      const btn = document.getElementById('doc-toolbar-delete');
      if (btn) { btn.textContent = 'Dang xoa...'; btn.disabled = true; }
      await onDelete(doc.id);
    });
  }
}
