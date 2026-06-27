import { workspaceStore }  from '../stores/workspace-store.js';
import {
  listDocuments, getDocument, deleteDocument,
  getPinnedDocuments, getRecentDocuments,
  toggleFavorite, togglePinned, updateDriveSync,
  getVersionHistory,
}                          from '../services/document-service.js';
import {
  render as renderList, renderSection, renderEmpty, renderPagination,
}                          from '../components/document-list.js';
import { render as renderDoc, initView } from '../components/document-view.js';
import { can }             from '../services/permission-service.js';
import { showToast }       from '../components/toast.js';

const PAGE_SIZE   = 20;
const SORT_LABELS = {
  newest:     'Moi nhat',
  oldest:     'Cu nhat',
  title_asc:  'Ten A→Z',
  title_desc: 'Ten Z→A',
  favorites:  'Yeu thich truoc',
};

const BUILDER_FILTERS = [
  { id: 'all',            label: 'Tat ca' },
  { id: 'prompt-builder', label: 'Prompt' },
  { id: 'sop-builder',    label: 'SOP' },
  { id: 'youtube-builder',label: 'YouTube' },
  { id: 'email-builder',  label: 'Email' },
  { id: 'sales-builder',  label: 'Sales' },
];

// ── Page state ────────────────────────────────────────────────────────────────
let _wsId        = '_default';
let _query       = '';
let _filter      = 'all';
let _sort        = 'newest';
let _page        = 1;
let _total       = 0;
let _unsub       = null;

function _esc(s) { return (s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

// ── Toolbar HTML ──────────────────────────────────────────────────────────────

function _renderControls() {
  const filterChips = BUILDER_FILTERS.map((f) => `
    <button class="doc-filter-chip ${_filter === f.id ? 'doc-filter-chip--active' : ''}"
            data-filter="${f.id}">${f.label}</button>
  `).join('');

  const sortOptions = Object.entries(SORT_LABELS).map(([val, label]) =>
    `<option value="${val}" ${_sort === val ? 'selected' : ''}>${label}</option>`
  ).join('');

  return `
    <div class="doc-controls">
      <div class="doc-search-wrap">
        <input class="doc-search" id="doc-search" type="search"
               placeholder="Tim kiem tai lieu..." value="${_esc(_query)}" autocomplete="off"
               aria-label="Tim kiem tai lieu">
      </div>
      <div class="doc-filter-row">
        <div class="doc-filter-chips" role="group" aria-label="Loc theo builder">${filterChips}</div>
        <select class="doc-sort-select" id="doc-sort" aria-label="Sap xep">
          ${sortOptions}
        </select>
      </div>
    </div>
  `;
}

// ── List view ─────────────────────────────────────────────────────────────────

async function showList() {
  const root = document.getElementById('docs-content');
  if (!root) return;

  if (!can('documents:read')) {
    root.innerHTML = `
      <div class="doc-page-header"><h2 class="doc-page-title">Tai lieu</h2></div>
      <div class="doc-empty" style="margin-top:24px">
        <p class="doc-empty-title">Ban khong co quyen xem tai lieu</p>
        <p class="doc-empty-desc">Lien he quan tri vien de duoc cap quyen.</p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="doc-page-header">
      <h2 class="doc-page-title">Tai lieu</h2>
      <p class="doc-page-subtitle">Tat ca tai lieu AI da tao trong workspace nay</p>
    </div>
    ${_renderControls()}
    <div class="doc-list-area">
      <div class="doc-loading"><div class="spinner"></div></div>
    </div>
  `;

  _wireControls();

  const offset = (_page - 1) * PAGE_SIZE;
  const [{ docs, total }, pinned, recent] = await Promise.all([
    listDocuments(_wsId, { query: _query, filter: _filter, sort: _sort, limit: PAGE_SIZE, offset }),
    _page === 1 && !_query ? getPinnedDocuments(_wsId).catch(() => []) : Promise.resolve([]),
    _page === 1 && !_query ? getRecentDocuments(_wsId).catch(() => []) : Promise.resolve([]),
  ]);
  _total = total;

  const listArea = root.querySelector('.doc-list-area');
  if (!listArea) return;

  if (!docs.length && !pinned.length && !recent.length) {
    listArea.innerHTML = renderEmpty(_query ? `Khong tim thay tai lieu cho "${_query}"` : undefined);
    return;
  }

  // Filter out pinned/recent from main list to avoid duplication
  const pinnedIds = new Set(pinned.map((d) => d.id));
  const recentIds = new Set(recent.map((d) => d.id));
  const mainDocs  = docs.filter((d) => !pinnedIds.has(d.id));

  listArea.innerHTML = `
    ${renderSection(pinned, '📌 Da ghim')}
    ${renderSection(recent.filter((d) => !pinnedIds.has(d.id)), '🕐 Mo gan day')}
    ${_page > 1 || _query || _filter !== 'all'
        ? ''
        : mainDocs.length ? '<h3 class="doc-section-title">Tat ca tai lieu</h3>' : ''}
    ${mainDocs.length ? renderList(mainDocs) : (pinned.length || recent.length ? '' : renderEmpty())}
    ${renderPagination({ page: _page, total: _total, limit: PAGE_SIZE })}
  `;

  _wireRows();
  _wirePagination();
}

// ── Controls wiring ───────────────────────────────────────────────────────────

function _wireControls() {
  let _debounce = null;
  document.getElementById('doc-search')?.addEventListener('input', (e) => {
    clearTimeout(_debounce);
    _debounce = setTimeout(() => { _query = e.target.value.trim(); _page = 1; showList(); }, 320);
  });

  document.querySelectorAll('.doc-filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => { _filter = chip.dataset.filter; _page = 1; showList(); });
  });

  document.getElementById('doc-sort')?.addEventListener('change', (e) => {
    _sort = e.target.value; _page = 1; showList();
  });
}

function _wireRows() {
  document.querySelectorAll('.doc-row[data-doc-id]').forEach((row) => {
    row.addEventListener('click',   () => openDoc(row.dataset.docId));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(row.dataset.docId); }
    });
  });
}

function _wirePagination() {
  document.getElementById('doc-page-prev')?.addEventListener('click', () => { _page--; showList(); });
  document.getElementById('doc-page-next')?.addEventListener('click', () => { _page++; showList(); });
}

// ── Document view ─────────────────────────────────────────────────────────────

async function openDoc(docId) {
  const root = document.getElementById('docs-content');
  if (!root) return;

  root.innerHTML = `<div class="doc-loading"><div class="spinner"></div></div>`;

  const [doc, versions] = await Promise.all([
    getDocument(_wsId, docId),
    getVersionHistory(docId).catch(() => []),
  ]);
  if (!doc) { showList(); return; }

  const canDelete = can('documents:delete');
  root.innerHTML  = renderDoc(doc, { canDelete });

  initView(doc, versions, {
    canDelete,
    onBack:     () => showList(),
    onDelete:   async (id) => {
      await deleteDocument(id, _wsId);
      showToast('Da xoa tai lieu', 'success');
      showList();
    },
    onFavorite: async (val) => {
      await toggleFavorite(docId, _wsId, val);
      showToast(val ? '★ Da them vao yeu thich' : 'Da bo yeu thich', 'info');
    },
    onPin: async (val) => {
      await togglePinned(docId, _wsId, val);
      showToast(val ? '📌 Da ghim tai lieu' : 'Da bo ghim', 'info');
    },
    onSync: async () => {
      if (doc.docUrl) { window.open(doc.docUrl, '_blank'); return; }
      showToast('Tai lieu chua co lien ket Google Drive', 'warn');
      await updateDriveSync(docId, 'error').catch(() => {});
    },
    onRestore: async (ver) => {
      const verDoc = versions.find((v) => v.version === ver);
      if (!verDoc) return;
      showToast(`Dang khoi phuc phien ban v${ver}...`, 'info');
      const { saveDocument } = await import('../services/document-service.js');
      saveDocument({ ...doc, content: verDoc.content, title: verDoc.title, version: (doc.version ?? 1) + 1 });
      await openDoc(docId);
    },
  });
}

// ── Page lifecycle ────────────────────────────────────────────────────────────

export function render() {
  return `<div id="docs-content" class="doc-page"></div>`;
}

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  _unsub = workspaceStore.subscribe(({ workspace }) => {
    if (!document.getElementById('docs-content')) return;
    _wsId  = workspace?.id ?? '_default';
    _query = ''; _filter = 'all'; _sort = 'newest'; _page = 1;
    showList();
  });
}
