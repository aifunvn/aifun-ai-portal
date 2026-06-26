import { renderMarkdown } from './markdown-viewer.js';
import { render as renderToolbar } from './document-toolbar.js';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function render(doc, { canDelete = true } = {}) {
  const tokenBadge = doc.tokens?.total
    ? `<span class="doc-meta-badge">${doc.tokens.total.toLocaleString('vi-VN')} tokens</span>`
    : '';
  const providerBadge = doc.provider
    ? `<span class="doc-meta-badge">${doc.provider}</span>`
    : '';
  const docUrlLink = doc.docUrl
    ? `<a class="doc-meta-badge doc-gdocs-link" href="${doc.docUrl}" target="_blank" rel="noopener">Google Docs ↗</a>`
    : '';

  return `
    <div class="doc-view">
      ${renderToolbar({ canDelete })}
      <div class="doc-view-header">
        <h2 class="doc-view-title">${doc.title}</h2>
        <div class="doc-view-meta">
          <span class="doc-builder-tag">${doc.builderName ?? 'AI Builder'}</span>
          <span class="doc-meta-sep">&middot;</span>
          <span>${formatDate(doc.createdAt)}</span>
          ${tokenBadge}
          ${providerBadge}
          ${docUrlLink}
        </div>
      </div>
      <div class="doc-view-body">
        ${renderMarkdown(doc.content)}
      </div>
    </div>
  `;
}

export function initView(doc, { onBack, onDelete, canDelete = true }) {
  document.getElementById('doc-toolbar-back')?.addEventListener('click', onBack);

  document.getElementById('doc-toolbar-copy')?.addEventListener('click', async () => {
    const btn = document.getElementById('doc-toolbar-copy');
    try {
      await navigator.clipboard.writeText(doc.content ?? '');
      if (btn) { btn.textContent = 'Da sao chep'; setTimeout(() => { if (btn) btn.textContent = 'Sao chep'; }, 2000); }
    } catch (_) {
      if (btn) btn.textContent = 'Loi sao chep';
    }
  });

  document.getElementById('doc-toolbar-export')?.addEventListener('click', () => {
    exportTxt(doc.title, doc.content);
  });

  document.getElementById('doc-toolbar-delete')?.addEventListener('click', async () => {
    if (!confirm(`Xoa tai lieu "${doc.title}"?\nHanh dong nay khong the hoan tac.`)) return;
    const btn = document.getElementById('doc-toolbar-delete');
    if (btn) { btn.textContent = 'Dang xoa...'; btn.disabled = true; }
    await onDelete(doc.id);
  });
}

function exportTxt(title, content) {
  const safe = (title ?? 'tai-lieu').replace(/[^\w\s-]/g, '_');
  const blob  = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement('a'), { href: url, download: `${safe}.txt` });
  a.click();
  URL.revokeObjectURL(url);
}
