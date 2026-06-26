import { getBuilders, getBuilder } from '../services/builder-registry-service.js';
import { render as launcherRender, initLauncher, getIcon } from '../components/builder-launcher.js';

const ICON_ARR = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 11 9 7 5 3"/></svg>`;

let _unsub = null;

export function render() {
  return `<div id="bld-content" class="bld-page"></div>`;
}

// ─── Grid view ────────────────────────────────────────────────────────────────

async function showGrid() {
  const root = document.getElementById('bld-content');
  if (!root) return;

  root.innerHTML = `
    <div class="bld-page-header">
      <h2 class="bld-page-title">AI Builders</h2>
      <p class="bld-page-subtitle">Chon mot Builder de tao tai lieu bang AI</p>
    </div>
    <div class="bld-loading"><div class="spinner"></div></div>
  `;

  let schemas;
  try {
    schemas = await getBuilders();
  } catch (err) {
    root.querySelector('.bld-loading').innerHTML =
      `<p class="bld-load-error">Khong the tai danh sach Builders. Vui long thu lai.</p>`;
    return;
  }

  root.innerHTML = `
    <div class="bld-page-header">
      <h2 class="bld-page-title">AI Builders</h2>
      <p class="bld-page-subtitle">Chon mot Builder de tao tai lieu bang AI</p>
    </div>
    <div class="bld-grid">
      ${schemas.map(renderSchemaCard).join('')}
    </div>
  `;

  root.querySelectorAll('.bld-card[data-builder-id]').forEach((card) => {
    card.addEventListener('click',   () => showBuilder(card.dataset.builderId));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showBuilder(card.dataset.builderId); }
    });
  });
}

function renderSchemaCard(schema) {
  return `
    <div class="bld-card" data-builder-id="${schema.id}" role="button" tabindex="0" aria-label="Mo ${schema.name}">
      <div class="bld-card-icon" aria-hidden="true">${getIcon(schema.icon)}</div>
      <div class="bld-card-body">
        <div class="bld-card-meta">
          <span class="bld-tag">${schema.category}</span>
          ${schema.plan !== 'free' ? `<span class="bld-plan-badge">${schema.plan}</span>` : ''}
        </div>
        <h3 class="bld-card-name">${schema.name}</h3>
        <p class="bld-card-desc">${schema.description}</p>
      </div>
      <span class="bld-card-arrow" aria-hidden="true">${ICON_ARR}</span>
    </div>
  `;
}

// ─── Builder detail view ──────────────────────────────────────────────────────

async function showBuilder(builderId) {
  const schema = await getBuilder(builderId);
  if (!schema) return;

  const root = document.getElementById('bld-content');
  if (!root) return;

  root.innerHTML = launcherRender(schema);
  initLauncher(schema, { onBack: showGrid });
}

// ─── Page lifecycle ───────────────────────────────────────────────────────────

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  showGrid();
}
