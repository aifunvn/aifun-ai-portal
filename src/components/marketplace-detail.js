import { render as renderBtn } from './install-button.js';
import { getIcon }            from './builder-launcher.js';

const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };

const ICON_BACK = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>`;

export function render(item, { isInstalled = false, isAccessible = true } = {}) {
  return `
    <div class="mp-detail">
      <button class="mp-detail-back" id="mp-detail-back" aria-label="Quay lai Marketplace">
        ${ICON_BACK} Tat ca Builders
      </button>

      <div class="mp-detail-header">
        <div class="mp-detail-icon">${getIcon(item.icon)}</div>
        <div class="mp-detail-meta">
          <h2 class="mp-detail-name">${item.name}</h2>
          <div class="mp-detail-badges">
            <span class="mp-plan-badge mp-plan--${item.plan}">${PLAN_LABEL[item.plan] ?? item.plan}</span>
            <span class="mp-detail-cat">${item.category}</span>
            ${item.is_featured ? `<span class="mp-featured-badge">Noi bat</span>` : ''}
          </div>
        </div>
        <div class="mp-detail-action">
          ${renderBtn(item, { isInstalled, isAccessible })}
        </div>
      </div>

      <p class="mp-detail-desc">${item.description ?? ''}</p>

      <div class="mp-detail-info">
        <div class="mp-detail-info-row">
          <span class="mp-detail-info-label">Phien ban</span>
          <span class="mp-detail-info-val">${item.version ?? '1.0.0'}</span>
        </div>
        <div class="mp-detail-info-row">
          <span class="mp-detail-info-label">Goi toi thieu</span>
          <span class="mp-detail-info-val">${PLAN_LABEL[item.plan] ?? item.plan}</span>
        </div>
        <div class="mp-detail-info-row">
          <span class="mp-detail-info-label">Danh muc</span>
          <span class="mp-detail-info-val">${item.category}</span>
        </div>
        <div class="mp-detail-info-row">
          <span class="mp-detail-info-label">Trang thai</span>
          <span class="mp-detail-info-val ${isInstalled ? 'mp-status--installed' : ''}">
            ${isInstalled ? '✓ Da cai dat' : 'Chua cai dat'}
          </span>
        </div>
      </div>
    </div>
  `;
}

export function initDetail({ onBack, onInstall, onUninstall }) {
  document.getElementById('mp-detail-back')?.addEventListener('click', onBack);

  document.querySelector('[data-install]')?.addEventListener('click', (e) => {
    const itemId = e.currentTarget.dataset.install;
    if (itemId) onInstall(itemId);
  });

  document.querySelector('[data-uninstall]')?.addEventListener('click', (e) => {
    const itemId = e.currentTarget.dataset.uninstall;
    if (itemId) onUninstall(itemId);
  });
}
