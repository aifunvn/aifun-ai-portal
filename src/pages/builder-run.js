// ── Builder Run Page — Sprint 18D ────────────────────────────────────────────
//
// Route: /run?builderId=<uuid>  (query param — no router changes needed)
//
// Flow:
//   1. init(builderId) reads builder metadata from Supabase
//   2. extractVariables(promptTemplate) auto-generates input form
//   3. User fills form → Run button → runBuilder() streaming
//   4. onChunk → appendChunk (live typewriter output)
//   5. onDone  → setDone (token count, latency, copy button)
//   6. onError → setError (with hint)
//   7. Stop button wires AbortController → aborts fetch mid-stream
//
// Only imports:
//   - builder-studio-db.js   (getBuilderRow — read-only, frozen)
//   - builder-runtime.js     (runBuilder, extractVariables)
//   - builder-run-widget.js  (streaming output widget)
//   - workspace-store.js     (getWorkspace — frozen)
//   - router.js              (navigate — for back button)

import { getBuilderRow }                    from '../services/builder-studio-db.js';
import { runBuilder, extractVariables }      from '../services/builder-runtime.js';
import { initWidget, renderEmpty }           from '../components/builder-run-widget.js';
import { workspaceStore }                    from '../stores/workspace-store.js';

const ICON_MAP = {
  sparkles: '✨', zap: '⚡', brain: '🧠', document: '📄',
  email: '📧', chart: '📊', star: '⭐', cog: '⚙️',
  default: '🤖',
};

// ── Shell HTML ────────────────────────────────────────────────────────────────

export function render(builderId) {
  // builderId used as data attribute so init() can read it
  return `<div id="run-root" class="run-page" data-builder-id="${_esc(builderId ?? '')}"></div>`;
}

// ── Page lifecycle ────────────────────────────────────────────────────────────

export async function init(builderId) {
  const root = document.getElementById('run-root');
  if (!root) return;

  // Loading skeleton while fetching builder metadata
  root.innerHTML = `
    <div class="run-loading" style="max-width:420px;margin-top:40px">
      <div class="run-skel" style="height:20px;width:60%"></div>
      <div class="run-skel" style="height:14px;width:40%"></div>
    </div>
  `;

  let builder;
  try {
    builder = await getBuilderRow(builderId);
  } catch (err) {
    root.innerHTML = `
      <div style="padding:40px 0;text-align:center;color:var(--text-2)">
        <p style="font-size:15px;font-weight:600">Không thể tải Builder</p>
        <p style="font-size:13px">${_esc(err?.message ?? 'Lỗi không xác định')}</p>
        <button class="run-back" id="run-err-back" style="margin-top:16px">← Quay lại</button>
      </div>
    `;
    root.querySelector('#run-err-back')?.addEventListener('click', _goBack);
    return;
  }

  _mount(root, builder);
}

// ── Mount full page ───────────────────────────────────────────────────────────

function _mount(root, builder) {
  const icon    = ICON_MAP[builder.icon] ?? ICON_MAP.default;
  const vars    = extractVariables(builder.promptTemplate ?? '');
  const statusCls = builder.status === 'published' ? 'run-badge--published' : 'run-badge--draft';
  const statusLbl = builder.status === 'published' ? 'Published' : 'Draft';

  root.innerHTML = `
    <div class="run-header">
      <div>
        <button class="run-back" id="run-back-btn">← Builders</button>
        <div class="run-hero">
          <div class="run-icon" aria-hidden="true">${icon}</div>
          <div class="run-meta">
            <h1>${_esc(builder.name)}
              <span class="run-badge ${statusCls}" aria-label="Trạng thái: ${statusLbl}">${statusLbl}</span>
            </h1>
            <p>${_esc(builder.description ?? 'Không có mô tả')}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="run-layout">

      <!-- Left: variable form -->
      <div class="run-form-panel">
        <h2>Nhập thông tin</h2>
        <form id="run-var-form" novalidate>
          ${vars.length ? vars.map(_renderField).join('') : `<p class="run-no-vars">Builder này không yêu cầu nhập liệu thêm.</p>`}
          <div class="run-actions">
            <button type="submit" class="run-btn-run" id="run-btn-run">
              <span id="run-btn-icon">▶</span> Chạy
            </button>
            <button type="button" class="run-btn-stop" id="run-btn-stop" aria-label="Dừng">
              ⏹ Dừng
            </button>
          </div>
        </form>
      </div>

      <!-- Right: streaming output -->
      <div class="run-output-panel" id="run-output-panel">
        <div class="run-output-header">
          <h2>Kết quả AI</h2>
          <div class="run-token-bar" id="run-token-bar" aria-live="polite"></div>
        </div>
        <div class="run-output-body" id="run-output-body">
          ${renderEmpty()}
        </div>
      </div>

    </div>
  `;

  root.querySelector('#run-back-btn')?.addEventListener('click', _goBack);

  const form     = root.querySelector('#run-var-form');
  const runBtn   = root.querySelector('#run-btn-run');
  const stopBtn  = root.querySelector('#run-btn-stop');
  const outPanel = root.querySelector('#run-output-panel');
  const widget   = initWidget(outPanel);

  let _ctrl = null; // AbortController for current run

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect variable values
    const variables = {};
    vars.forEach((name) => {
      const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
      variables[name] = el?.value?.trim() ?? '';
    });

    // Abort any previous run still in-flight
    _ctrl?.abort();
    _ctrl = new AbortController();

    // UI: running state
    runBtn.disabled = true;
    runBtn.querySelector('#run-btn-icon').textContent = '⏳';
    stopBtn.classList.add('visible');

    widget.setLoading();

    const workspaceId = workspaceStore.getWorkspace()?.id ?? null;
    let firstChunk = true;

    try {
      await runBuilder(builder.id, variables, {
        workspaceId,
        signal: _ctrl.signal,
        onChunk(text) {
          if (firstChunk) {
            // Replace loading skeleton with first real content
            firstChunk = false;
          }
          widget.appendChunk(text);
        },
        onDone(result) {
          _resetRunUI(runBtn, stopBtn);
          widget.setDone(result);
        },
        onError(err) {
          _resetRunUI(runBtn, stopBtn);
          if (err?.message?.includes('bị huỷ') || _ctrl?.signal?.aborted) {
            // User stopped — show partial output as-is (already in widget)
            // Just remove the blinking cursor by removing the streaming class
            outPanel.querySelector('.run-streaming')?.classList.remove('run-streaming');
            return;
          }
          widget.setError(err);
        },
      });
    } catch {
      // Errors already handled by onError above
    } finally {
      _ctrl = null;
    }
  });

  stopBtn.addEventListener('click', () => {
    _ctrl?.abort();
    stopBtn.classList.remove('visible');
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _renderField(name) {
  // Heuristic: if variable name suggests multi-line, render <textarea>
  const multiline = /context|content|noidung|background|description|note/i.test(name);
  const label     = _toLabel(name);
  const id        = `run-var-${_esc(name)}`;

  return `
    <div class="run-field">
      <label for="${id}">
        ${_esc(label)}
        <span class="run-field-hint">({{${_esc(name)}}})</span>
      </label>
      ${multiline
        ? `<textarea id="${id}" name="${_esc(name)}" class="run-textarea" rows="3" placeholder="Nhập ${_esc(label).toLowerCase()}..."></textarea>`
        : `<input id="${id}" name="${_esc(name)}" type="text" class="run-input" placeholder="Nhập ${_esc(label).toLowerCase()}...">`
      }
    </div>
  `;
}

function _toLabel(name) {
  // snake_case / camelCase → "Tên Biến" style
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function _resetRunUI(runBtn, stopBtn) {
  runBtn.disabled = false;
  runBtn.querySelector('#run-btn-icon').textContent = '▶';
  stopBtn.classList.remove('visible');
}

function _goBack() {
  window.history.back();
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
