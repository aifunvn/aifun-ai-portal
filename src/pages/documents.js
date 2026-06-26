import { workspaceStore }  from '../stores/workspace-store.js';
import { listDocuments, getDocument, deleteDocument } from '../services/document-service.js';
import { render as renderList, renderEmpty } from '../components/document-list.js';
import { render as renderDoc, initView }    from '../components/document-view.js';
import { can }                              from '../services/permission-service.js';

let _unsub       = null;
let _searchQuery = '';

export function render() {
  return `<div id="docs-content" class="doc-page"></div>`;
}

// ─── List view ────────────────────────────────────────────────────────────────

async function showList(workspaceId, query = '') {
  const root = document.getElementById('docs-content');
  if (!root) return;
  _searchQuery = query;

  if (!can('documents:read')) {
    root.innerHTML = `
      <div class="doc-page-header">
        <h2 class="doc-page-title">Tài liệu</h2>
      </div>
      <div class="doc-empty" style="margin-top:24px">
        <p class="doc-empty-title">Bạn không có quyền xem tài liệu</p>
        <p class="doc-empty-desc">Liên hệ quản trị viên để được cấp quyền.</p>
      </div>
    `;
    return;
  }

  // Show header + search + spinner immediately
  root.innerHTML = `
    <div class="doc-page-header">
      <h2 class="doc-page-title">Tai lieu</h2>
      <p class="doc-page-subtitle">Tat ca tai lieu AI da tao trong workspace nay</p>
    </div>
    <div class="doc-search-wrap">
      <input class="doc-search" id="doc-search" type="search"
        placeholder="Tim kiem tai lieu..." value="${_esc(query)}" autocomplete="off">
    </div>
    <div class="doc-list-area">
      <div class="doc-loading"><div class="spinner"></div></div>
    </div>
  `;

  _wireSearch(workspaceId);

  let docs;
  try {
    docs = await listDocuments(workspaceId, { query });
  } catch {
    docs = [];
  }

  const listArea = root.querySelector('.doc-list-area');
  if (!listArea) return; // navigated away

  if (docs.length === 0 && query) {
    listArea.innerHTML = renderEmpty('Khong tim thay tai lieu phu hop');
  } else {
    listArea.innerHTML = renderList(docs);
    listArea.querySelectorAll('.doc-row[data-doc-id]').forEach((row) => {
      row.addEventListener('click',   () => openDoc(workspaceId, row.dataset.docId));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(workspaceId, row.dataset.docId); }
      });
    });
  }
}

function _wireSearch(workspaceId) {
  const searchEl = document.getElementById('doc-search');
  if (!searchEl) return;
  let _debounce = null;
  searchEl.addEventListener('input', () => {
    clearTimeout(_debounce);
    _debounce = setTimeout(() => showList(workspaceId, searchEl.value.trim()), 320);
  });
}

// ─── Document view ────────────────────────────────────────────────────────────

async function openDoc(workspaceId, docId) {
  const root = document.getElementById('docs-content');
  if (!root) return;

  const doc = await getDocument(workspaceId, docId);
  if (!doc) { await showList(workspaceId, _searchQuery); return; }

  const canDelete = can('documents:delete');

  root.innerHTML = renderDoc(doc, { canDelete });
  initView(doc, {
    canDelete,
    onBack:   () => showList(workspaceId, _searchQuery),
    onDelete: async (id) => {
      await deleteDocument(id, workspaceId);
      await showList(workspaceId, _searchQuery);
    },
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

function _esc(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
