import { workspaceStore } from '../stores/workspace-store.js';
import { getDocument } from '../services/document-service.js';
import { render as renderList } from '../components/document-list.js';
import { render as renderDoc, initView } from '../components/document-view.js';

let _unsub       = null;
let _searchQuery = '';

export function render() {
  return `<div id="docs-content" class="doc-page"></div>`;
}

// ─── List view ────────────────────────────────────────────────────────────────

function showList(workspaceId, query = '') {
  const root = document.getElementById('docs-content');
  if (!root) return;
  _searchQuery = query;

  root.innerHTML = `
    <div class="doc-page-header">
      <h2 class="doc-page-title">Tai lieu</h2>
      <p class="doc-page-subtitle">Tat ca tai lieu AI da tao trong workspace nay</p>
    </div>
    <div class="doc-search-wrap">
      <input class="doc-search" id="doc-search" type="search"
        placeholder="Tim kiem tai lieu..." value="${query}" autocomplete="off">
    </div>
    ${renderList(workspaceId, query)}
  `;

  const searchEl = document.getElementById('doc-search');
  let _debounce  = null;
  searchEl?.addEventListener('input', () => {
    clearTimeout(_debounce);
    _debounce = setTimeout(() => showList(workspaceId, searchEl.value.trim()), 300);
  });

  root.querySelectorAll('.doc-row[data-doc-id]').forEach((row) => {
    row.addEventListener('click',   () => openDoc(workspaceId, row.dataset.docId));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(workspaceId, row.dataset.docId); }
    });
  });
}

// ─── Document view ────────────────────────────────────────────────────────────

function openDoc(workspaceId, docId) {
  const doc  = getDocument(workspaceId, docId);
  const root = document.getElementById('docs-content');
  if (!doc || !root) return;

  root.innerHTML = renderDoc(doc);
  initView(doc, {
    onBack: () => showList(workspaceId, _searchQuery),
  });
}

// ─── Page lifecycle ───────────────────────────────────────────────────────────

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  _unsub = workspaceStore.subscribe(({ workspace }) => {
    if (!document.getElementById('docs-content')) return;
    showList(workspace?.id ?? '_default', '');
  });
}
