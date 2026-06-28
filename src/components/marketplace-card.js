import { render as renderBtn } from './install-button.js';
import { getIcon }            from './builder-launcher.js';

const PLAN_COLOR = {
  free:     'mp-plan--free',
  starter:  'mp-plan--starter',
  pro:      'mp-plan--pro',
  business: 'mp-plan--business',
};

const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };

export function render(item, { isInstalled = false, isAccessible = true } = {}) {
  const planCls = PLAN_COLOR[item.plan] ?? '';
  const featuredBadge = item.is_featured
    ? `<span class="mp-featured-badge">Noi bat</span>`
    : '';

  return `
    <div class="mp-card ${isInstalled ? 'mp-card--installed' : ''}" data-item-id="${item.id}">
      <div class="mp-card-header">
        <div class="mp-card-icon">${getIcon(item.icon)}</div>
        <div class="mp-card-badges">
          <span class="mp-plan-badge ${planCls}">${PLAN_LABEL[item.plan] ?? item.plan}</span>
          ${featuredBadge}
        </div>
      </div>
      <div class="mp-card-body">
        <h3 class="mp-card-name">${item.name}</h3>
        <p class="mp-card-desc">${item.description ?? ''}</p>
        <span class="mp-card-cat">${item.category}</span>
      </div>
      <div class="mp-card-footer">
        ${renderBtn(item, { isInstalled, isAccessible })}
      </div>
    </div>
  `;
}
