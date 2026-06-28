import { workspaceStore } from '../stores/workspace-store.js';
import { listHistory }    from '../services/ai-history-service.js';
import {
  render as renderList, renderEmpty, renderPagination,
} from '../components/history-list.js';

const PAGE_SIZE = 20;

const BUILDER_OPTIONS = [
  { id: 'all',             label: 'Tất cả Builder' },
  { id: 'prompt-builder',  label: 'Prompt Optimizer' },
  { id: 'sop-builder',     label: 'SOP Builder' },
  { id: 'youtube-builder', label: 'YouTube Script' },
  { id: 'email-builder',   label: 'Email Automation' },
  { id: 'sales-builder',   label: 'Sales Script' },
];

const PROVIDER_OPTIONS = [
  { id: 'all',    label: 'Tất cả Provider' },
  { id: 'claude', label: 'Claude' },
  { id: 'mock',   label: 'Mock' },
];

const STATUS_OPTIONS = [
  { id: 'all',       label: 'Tất cả trạng thái' },
  { id: 'completed', label: 'Thành công' },
  { id: 'failed',    label: 'Thất bại' },
  { id: 'fallback',  label: 'Fallback' },
];

// ── Page state ────────────────────────────────────────────────────────────────
let _wsId     = '_default';
let _query    = '';
let _builder  = 'all';
let _provider = 'all';
let _status   = 'all';
let _dateFrom = '';
let _dateTo   = '';
let _page     = 1;
let _total    = 0;
let _unsub    = null;

function _esc(s) { return (s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function _opts(list, val) {
  return list.map((o) => `<option value="${o.id}" ${val === o.id ? 'selected' : ''}>${o.label}</option>`).join('');
}

// ── Controls HTML ─────────────────────────────────────────────────────────────

function _renderControls() {
  return `
    <div class="hist-controls">
      <div class="hist-search-wrap">
        <input class="doc-search" id="hist-search" type="search"
               placeholder="Tìm builder, provider, model..." value="${_esc(_query)}"
               autocomplete="off" aria-label="Tìm kiếm lịch sử AI">
      </div>
      <div class="hist-filter-row">
        <select class="doc-sort-select" id="hist-filter-builder" aria-label="Lọc builder">
          ${_opts(BUILDER_OPTIONS, _builder)}
        </select>
        <select class="doc-sort-select" id="hist-filter-provider" aria-label="Lọc provider">
          ${_opts(PROVIDER_OPTIONS, _provider)}
        </select>
        <select class="doc-sort-select" id="hist-filter-status" aria-label="Lọc trạng thái">
          ${_opts(STATUS_OPTIONS, _status)}
        </select>
        <input class="hist-date-input" id="hist-date-from" type="date"
               value="${_esc(_dateFrom)}" aria-label="Từ ngày">
        <input class="hist-date-input" id="hist-date-to" type="date"
               value="${_esc(_dateTo)}" aria-label="Đến ngày">
      </div>
    </div>
  `;
}

// ── List view ─────────────────────────────────────────────────────────────────

async function showList() {
  const root = document.getElementById('hist-content');
  if (!root) return;

  root.innerHTML = `
    <div class="doc-page-header">
      <h2 class="doc-page-title">Lịch sử AI</h2>
      <p class="doc-page-subtitle">Toàn bộ yêu cầu AI đã thực hiện trong workspace</p>
    </div>
    ${_renderControls()}
    <div class="hist-list-area">
      <div class="doc-loading"><div class="spinner"></div></div>
    </div>
  `;

  _wireControls();

  const offset = (_page - 1) * PAGE_SIZE;
  const { requests, total } = await listHistory(_wsId, {
    query:    _query,
    builder:  _builder,
    provider: _provider,
    status:   _status,
    dateFrom: _dateFrom || null,
    dateTo:   _dateTo   ? _dateTo + 'T23:59:59Z' : null,
    sort:     'newest',
    limit:    PAGE_SIZE,
    offset,
  });
  _total = total;

  const area = root.querySelector('.hist-list-area');
  if (!area) return;

  if (!requests.length) {
    area.innerHTML = renderEmpty(
      _query ? `Không tìm thấy kết quả cho "${_query}"` : undefined,
    );
    return;
  }

  area.innerHTML = renderList(requests) + renderPagination({ page: _page, total, limit: PAGE_SIZE });
  _wirePagination();
}

// ── Wiring ────────────────────────────────────────────────────────────────────

function _wireControls() {
  let _deb = null;
  document.getElementById('hist-search')?.addEventListener('input', (e) => {
    clearTimeout(_deb);
    _deb = setTimeout(() => { _query = e.target.value.trim(); _page = 1; showList(); }, 320);
  });

  document.getElementById('hist-filter-builder')?.addEventListener('change', (e) => {
    _builder = e.target.value; _page = 1; showList();
  });
  document.getElementById('hist-filter-provider')?.addEventListener('change', (e) => {
    _provider = e.target.value; _page = 1; showList();
  });
  document.getElementById('hist-filter-status')?.addEventListener('change', (e) => {
    _status = e.target.value; _page = 1; showList();
  });
  document.getElementById('hist-date-from')?.addEventListener('change', (e) => {
    _dateFrom = e.target.value; _page = 1; showList();
  });
  document.getElementById('hist-date-to')?.addEventListener('change', (e) => {
    _dateTo = e.target.value; _page = 1; showList();
  });
}

function _wirePagination() {
  document.getElementById('hist-page-prev')?.addEventListener('click', () => { _page--; showList(); });
  document.getElementById('hist-page-next')?.addEventListener('click', () => { _page++; showList(); });
}

// ── Page lifecycle ────────────────────────────────────────────────────────────

export function render() {
  return `<div id="hist-content" class="doc-page"></div>`;
}

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  _unsub = workspaceStore.subscribe(({ workspace }) => {
    if (!document.getElementById('hist-content')) return;
    _wsId = workspace?.id ?? '_default';
    _query = ''; _builder = 'all'; _provider = 'all';
    _status = 'all'; _dateFrom = ''; _dateTo = '';
    _page = 1;
    showList();
  });
}
