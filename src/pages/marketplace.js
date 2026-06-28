import { listItems, groupByCategory }     from '../services/marketplace-service.js';
import { listInstalls, install, uninstall } from '../services/install-service.js';
import { workspaceStore }                   from '../stores/workspace-store.js';
import { isBuilderAccessible }              from '../services/permission-service.js';
import { render as renderCard }             from '../components/marketplace-card.js';
import {
  render   as renderDetail,
  initDetail,
}                                           from '../components/marketplace-detail.js';
import { showToast }                        from '../components/toast.js';

// ── State ─────────────────────────────────────────────────────────────────────

let _items      = [];
let _installed  = new Set();
let _query      = '';
let _activeId   = null;   // null = list view; string = detail view

// ── Helpers ───────────────────────────────────────────────────────────────────

function _workspaceId() {
  return workspaceStore.getWorkspace()?.id ?? 'default';
}

function _filtered() {
  if (!_query) return _items;
  const lq = _query.toLowerCase();
  return _items.filter(
    (i) => i.name.toLowerCase().includes(lq) || i.description?.toLowerCase().includes(lq),
  );
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function _renderList() {
  const items  = _filtered();
  const groups = groupByCategory(items);

  if (items.length === 0) {
    return `
      <div class="mp-empty" role="status">
        <div class="mp-empty-icon">🔍</div>
        <p class="mp-empty-title">Khong tim thay builder</p>
        <p class="mp-empty-desc">Thu tu khoa khac hoac xoa bo loc.</p>
      </div>`;
  }

  return Object.entries(groups).map(([cat, catItems]) => `
    <section class="mp-group" aria-label="${cat}">
      <h2 class="mp-group-title">${cat}</h2>
      <div class="mp-grid">
        ${catItems.map((item) => renderCard(item, {
          isInstalled:  _installed.has(item.id),
          isAccessible: isBuilderAccessible(item.id),
        })).join('')}
      </div>
    </section>
  `).join('');
}

function _renderDetail(item) {
  return renderDetail(item, {
    isInstalled:  _installed.has(item.id),
    isAccessible: isBuilderAccessible(item.id),
  });
}

function _paint() {
  const root = document.getElementById('mp-content');
  if (!root) return;

  if (_activeId) {
    const item = _items.find((i) => i.id === _activeId);
    if (!item) { _activeId = null; _paint(); return; }
    root.innerHTML = _renderDetail(item);
    initDetail({
      onBack:      ()   => { _activeId = null; _paint(); },
      onInstall:   (id) => _handleInstall(id),
      onUninstall: (id) => _handleUninstall(id),
    });
  } else {
    root.innerHTML = _renderList();
    _wireListEvents();
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function _wireListEvents() {
  document.querySelectorAll('.mp-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-install],[data-uninstall]')) return;
      const id = card.dataset.itemId;
      if (id) { _activeId = id; _paint(); }
    });
  });

  document.querySelectorAll('[data-install]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _handleInstall(btn.dataset.install);
    });
  });

  document.querySelectorAll('[data-uninstall]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _handleUninstall(btn.dataset.uninstall);
    });
  });
}

async function _handleInstall(itemId) {
  const wsId = _workspaceId();
  _installed.add(itemId);
  _paint();
  await install(wsId, itemId);
  const item = _items.find((i) => i.id === itemId);
  showToast(`Da cai dat ${item?.name ?? itemId}`, 'success');
}

async function _handleUninstall(itemId) {
  const wsId = _workspaceId();
  _installed.delete(itemId);
  _paint();
  await uninstall(wsId, itemId);
  const item = _items.find((i) => i.id === itemId);
  showToast(`Da go ${item?.name ?? itemId}`, 'info');
}

// ── Search ────────────────────────────────────────────────────────────────────

function _wireSearch() {
  const input = document.getElementById('mp-search');
  if (!input) return;
  input.addEventListener('input', () => {
    _query    = input.value.trim();
    _activeId = null;
    _paint();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initMarketplace() {
  const page = document.getElementById('page-content');
  if (!page) return;

  page.innerHTML = `
    <div class="mp-wrapper">
      <header class="mp-header">
        <div>
          <h1 class="mp-title">Builder Marketplace</h1>
          <p class="mp-subtitle">Cai dat cac AI Builder phu hop voi quy trinh cong viec cua ban</p>
        </div>
        <div class="mp-search-wrap">
          <input id="mp-search" class="mp-search" type="search"
                 placeholder="Tim kiem builder…" aria-label="Tim kiem builder">
        </div>
      </header>
      <div id="mp-content" class="mp-content">
        <div class="mp-loading" role="status" aria-live="polite">Dang tai…</div>
      </div>
    </div>
  `;

  _wireSearch();

  const wsId = _workspaceId();
  const [items, installs] = await Promise.all([
    listItems(),
    listInstalls(wsId),
  ]);

  _items     = items;
  _installed = new Set(installs);
  _activeId  = null;

  _paint();
}

// kept for router compatibility (shell calls render() to get initial HTML before initMarketplace)
export function render() {
  return `<div class="mp-wrapper"><div id="mp-content" class="mp-content"><div class="mp-loading">Dang tai…</div></div></div>`;
}
