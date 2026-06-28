import { getBuilders, getBuilder }                 from '../services/builder-registry-service.js';
import { render as launcherRender, initLauncher, getIcon } from '../components/builder-launcher.js';
import { can, isBuilderAccessible }               from '../services/permission-service.js';

const ICON_ARR  = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 11 9 7 5 3"/></svg>`;
const ICON_LOCK = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="8" height="6" rx="1"/><path d="M5 6V4a2 2 0 014 0v2"/></svg>`;

let _unsub = null;

export function render() {
  return `<div id="bld-content" class="bld-page"></div>`;
}

// ─── Grid view ────────────────────────────────────────────────────────────────

async function showGrid() {
  const root = document.getElementById('bld-content');
  if (!root) return;

  if (!can('builders:read')) {
    root.innerHTML = `
      <div class="bld-page-header">
        <h2 class="bld-page-title">AI Builders</h2>
      </div>
      <div class="doc-empty" style="margin-top:24px">
        <p class="doc-empty-title">Bạn không có quyền truy cập AI Builders</p>
        <p class="doc-empty-desc">Liên hệ quản trị viên để được cấp quyền.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="bld-page-header">
      <h2 class="bld-page-title">AI Builders</h2>
      <p class="bld-page-subtitle">Chọn một Builder để tạo tài liệu bằng AI</p>
    </div>
    <div class="bld-loading"><div class="spinner"></div></div>
  `;

  let schemas;
  try {
    schemas = await getBuilders();
    if (schemas.length === 0) {
      root.innerHTML = `
        <div class="bld-page-header">
          <h2 class="bld-page-title">AI Builders</h2>
          <p class="bld-page-subtitle">Chọn một Builder để tạo tài liệu bằng AI</p>
        </div>
        <div class="doc-empty" style="margin-top:24px">
          <p class="doc-empty-title">Không tìm thấy Builder nào</p>
          <p class="doc-empty-desc">Vui lòng thử lại sau.</p>
        </div>
      `;
      return;
    }
  } catch {
    root.querySelector('.bld-loading').innerHTML =
      `<p class="bld-load-error">Không thể tải danh sách Builders. Vui lòng thử lại.</p>`;
    return;
  }

  root.innerHTML = `
    <div class="bld-page-header">
      <h2 class="bld-page-title">AI Builders</h2>
      <p class="bld-page-subtitle">Chọn một Builder để tạo tài liệu bằng AI</p>
    </div>
    <div class="bld-grid">
      ${schemas.map(renderSchemaCard).join('')}
    </div>
  `;

  root.querySelectorAll('.bld-card[data-builder-id]').forEach((card) => {
    card.addEventListener('click',   () => _onCardClick(card.dataset.builderId));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _onCardClick(card.dataset.builderId); }
    });
  });
}

function renderSchemaCard(schema) {
  const accessible = isBuilderAccessible(schema.id);
  const lockedCls  = accessible ? '' : 'bld-card--locked';
  const lockBadge  = accessible ? '' : `<span class="bld-lock-badge" title="Nâng cấp gói để mở khóa">${ICON_LOCK} Khóa</span>`;

  return `
    <div class="bld-card ${lockedCls}" data-builder-id="${schema.id}"
         role="button" tabindex="0" aria-label="Mở ${schema.name}"
         ${accessible ? '' : 'aria-disabled="true"'}>
      <div class="bld-card-icon" aria-hidden="true">${getIcon(schema.icon)}</div>
      <div class="bld-card-body">
        <div class="bld-card-meta">
          <span class="bld-tag">${schema.category}</span>
          ${schema.plan !== 'free' ? `<span class="bld-plan-badge">${schema.plan}</span>` : ''}
          ${lockBadge}
        </div>
        <h3 class="bld-card-name">${schema.name}</h3>
        <p class="bld-card-desc">${schema.description}</p>
      </div>
      <span class="bld-card-arrow" aria-hidden="true">${accessible ? ICON_ARR : ICON_LOCK}</span>
    </div>
  `;
}

function _onCardClick(builderId) {
  if (!isBuilderAccessible(builderId)) {
    _showUpgradeMessage(builderId);
    return;
  }
  showBuilder(builderId);
}

function _showUpgradeMessage(builderId) {
  const root = document.getElementById('bld-content');
  if (!root) return;
  const existing = root.querySelector('.bld-upgrade-toast');
  if (existing) { existing.remove(); }

  const toast = document.createElement('div');
  toast.className = 'bld-upgrade-toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <strong>Builder này yêu cầu gói cao hơn.</strong>
    Nâng cấp lên Starter hoặc Pro để sử dụng ${builderId}.
  `;
  root.prepend(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── Builder detail view ──────────────────────────────────────────────────────

async function showBuilder(builderId) {
  const schema = await getBuilder(builderId);
  if (!schema) return;

  const root = document.getElementById('bld-content');
  if (!root) return;

  root.innerHTML = launcherRender(schema);

  // Disable generate if user lacks builders:run
  if (!can('builders:run')) {
    const btn = document.getElementById('bld-generate');
    if (btn) {
      btn.disabled = true;
      btn.title    = 'Bạn không có quyền chạy Builder';
    }
  }

  initLauncher(schema, { onBack: showGrid });
}

// ─── Page lifecycle ───────────────────────────────────────────────────────────

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  showGrid();
}
