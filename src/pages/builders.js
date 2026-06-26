import { BUILDERS, getBuilder } from '../builders/index.js';
import { render as renderCard } from '../components/builder-card.js';
import { render as renderForm, initForm, validate, getData } from '../components/builder-form.js';
import { render as chatOutput, initChatOutput } from '../components/chat-output.js';
import { runBuilder } from '../services/runtime-service.js';

const ICON_BACK = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>`;
const ICON_GEN  = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 1l1.5 4.5L13.5 7l-4.5 1.5L7.5 13l-1.5-4.5L1.5 7l4.5-1.5L7.5 1z"/></svg>`;

let _unsub = null;

export function render() {
  return `<div id="bld-content" class="bld-page"></div>`;
}

// ─── Grid view ────────────────────────────────────────────────────────────────

function showGrid() {
  const root = document.getElementById('bld-content');
  if (!root) return;

  root.innerHTML = `
    <div class="bld-page-header">
      <h2 class="bld-page-title">AI Builders</h2>
      <p class="bld-page-subtitle">Chon mot Builder de tao tai lieu bang AI</p>
    </div>
    <div class="bld-grid">
      ${BUILDERS.map(renderCard).join('')}
    </div>
  `;

  root.querySelectorAll('.bld-card[data-builder-id]').forEach((card) => {
    card.addEventListener('click',   () => showBuilder(card.dataset.builderId));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showBuilder(card.dataset.builderId); }
    });
  });
}

// ─── Builder detail view ──────────────────────────────────────────────────────

function showBuilder(builderId) {
  const builder = getBuilder(builderId);
  if (!builder) return;

  const root = document.getElementById('bld-content');
  if (!root) return;

  root.innerHTML = `
    <button class="bld-back" id="bld-back" aria-label="Quay lai danh sach">
      ${ICON_BACK} Tat ca Builders
    </button>

    <div class="bld-detail-header">
      <div class="bld-detail-icon" aria-hidden="true">${builder.iconSvg}</div>
      <div>
        <h2 class="bld-detail-name">${builder.name}</h2>
        <p class="bld-detail-desc">${builder.description}</p>
      </div>
    </div>

    <div class="bld-body">
      <div class="bld-form-panel">
        ${renderForm(builder)}
        <div class="bld-form-actions">
          <button class="btn btn-primary" id="bld-generate">
            ${ICON_GEN} Tao ngay
          </button>
        </div>
      </div>
      <div class="bld-output-panel" id="bld-output-panel">
        ${chatOutput('idle')}
      </div>
    </div>
  `;

  document.getElementById('bld-back')?.addEventListener('click', showGrid);
  initForm(builder);
  document.getElementById('bld-generate')?.addEventListener('click', () => handleGenerate(builder));
}

// ─── Generate ─────────────────────────────────────────────────────────────────

async function handleGenerate(builder) {
  const { valid } = validate(builder);
  if (!valid) return;

  const formData    = getData(builder);
  const generateBtn = document.getElementById('bld-generate');

  if (generateBtn) { generateBtn.innerHTML = 'Dang tao...'; generateBtn.disabled = true; }
  updateOutput('thinking');

  try {
    const result = await runBuilder(builder, formData);
    updateOutput(result);
  } catch (err) {
    updateOutput({ error: err.message ?? 'Loi khong xac dinh' });
  } finally {
    if (generateBtn) {
      generateBtn.innerHTML = `${ICON_GEN} Tao ngay`;
      generateBtn.disabled  = false;
    }
  }
}

function updateOutput(state) {
  const panel = document.getElementById('bld-output-panel');
  if (!panel) return;
  panel.innerHTML = chatOutput(state);
  if (state !== 'idle' && state !== 'thinking' && !state?.error) {
    initChatOutput(state.content);
  }
}

// ─── Page lifecycle ───────────────────────────────────────────────────────────

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  showGrid();
}
