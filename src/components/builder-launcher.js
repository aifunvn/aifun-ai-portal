import { renderForm, getFormData, initForm, showErrors } from './form-renderer.js';
import { render as chatOutput, initChatOutput } from './chat-output.js';
import { validate }       from '../services/validation-service.js';
import { createAdapter }  from '../services/builder-registry-service.js';
import { runBuilder }     from '../services/runtime-service.js';
import { listProviders }  from '../services/provider-service.js';

const ICON_BACK = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 13 5 8 10 3"/></svg>`;
const ICON_GEN  = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 1l1.5 4.5L13.5 7l-4.5 1.5L7.5 13l-1.5-4.5L1.5 7l4.5-1.5L7.5 1z"/></svg>`;

const ICON_MAP = {
  sparkle:  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"/><circle cx="19" cy="4" r="1.5"/><circle cx="6" cy="19" r="1"/></svg>`,
  document: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  video:    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="15" height="16" rx="2"/><polygon points="22 8 17 12 22 16 22 8" fill="currentColor" stroke="none"/></svg>`,
};

export function getIcon(name) {
  return ICON_MAP[name] ?? ICON_MAP.sparkle;
}

function renderProviderSelector() {
  const providers = listProviders();
  const options   = providers.map((p) =>
    `<option value="${p.id}">${p.label}</option>`,
  ).join('');
  return `
    <div class="bld-provider-row">
      <label class="bld-provider-label" for="bld-provider">Provider AI</label>
      <select class="field-input bld-provider-sel" id="bld-provider" aria-label="Chon provider AI">
        ${options}
      </select>
    </div>
  `;
}

export function render(schema) {
  return `
    <button class="bld-back" id="bld-back" aria-label="Quay lai danh sach">
      ${ICON_BACK} Tat ca Builders
    </button>

    <div class="bld-detail-header">
      <div class="bld-detail-icon" aria-hidden="true">${getIcon(schema.icon)}</div>
      <div>
        <h2 class="bld-detail-name">${schema.name}</h2>
        <p class="bld-detail-desc">${schema.description}</p>
      </div>
    </div>

    <div class="bld-body">
      <div class="bld-form-panel">
        ${renderForm(schema)}
        ${renderProviderSelector()}
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
}

export function initLauncher(schema, { onBack }) {
  document.getElementById('bld-back')?.addEventListener('click', onBack);
  initForm(schema);
  document.getElementById('bld-generate')?.addEventListener('click', () => handleGenerate(schema));
}

// ─── Generate pipeline ────────────────────────────────────────────────────────

async function handleGenerate(schema) {
  const formData = getFormData(schema);
  const { valid, errors } = validate(schema, formData);

  if (!valid) {
    showErrors(errors);
    return;
  }

  const selectedProvider = document.getElementById('bld-provider')?.value ?? 'mock';

  const generateBtn = document.getElementById('bld-generate');
  if (generateBtn) { generateBtn.innerHTML = 'Dang tao...'; generateBtn.disabled = true; }
  _updateOutput('thinking');

  try {
    const adapter = createAdapter(schema);
    const result  = await runBuilder(adapter, formData, { provider: selectedProvider });
    _updateOutput(result);
  } catch (err) {
    _updateOutput({ error: err.message ?? 'Loi khong xac dinh. Vui long thu lai.' });
  } finally {
    if (generateBtn) {
      generateBtn.innerHTML = `${ICON_GEN} Tao ngay`;
      generateBtn.disabled  = false;
    }
  }
}

function _updateOutput(state) {
  const panel = document.getElementById('bld-output-panel');
  if (!panel) return;
  panel.innerHTML = chatOutput(state);
  if (state !== 'idle' && state !== 'thinking' && !state?.error) {
    initChatOutput(state.content);
    if (state.fallback) _showFallbackNote(state.fallbackReason);
  }
}

function _showFallbackNote(reason) {
  const footer = document.querySelector('.co-footer');
  if (!footer) return;
  const note = document.createElement('p');
  note.className    = 'output-fallback-note';
  note.textContent  = `Claude khong kha dung — da dung Mock. Ly do: ${reason ?? 'Loi khong xac dinh'}`;
  footer.appendChild(note);
}
