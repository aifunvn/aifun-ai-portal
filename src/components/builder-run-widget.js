// ── Builder Run Widget — Sprint 18D ──────────────────────────────────────────
//
// Reusable streaming output widget. Handles all visual states:
//   empty → loading → streaming → done | error
//
// Used by:
//   - src/pages/builder-run.js  (Run page)
//   - Can be embedded in Builder Studio Playground in Sprint 19
//
// initWidget(el, { onRun }) returns a controller with:
//   .setLoading()           — show skeleton before first chunk arrives
//   .appendChunk(text)      — append streamed text (idempotent, order-safe)
//   .setDone(result)        — freeze output, show metadata + copy button
//   .setError(err)          — show error state
//   .reset()                — back to empty state

// ── Render helpers ────────────────────────────────────────────────────────────

export function renderEmpty() {
  return `
    <div class="run-empty" aria-live="polite">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      <p>Nhập thông tin và nhấn <strong>Chạy</strong> để bắt đầu.</p>
    </div>
  `;
}

export function renderLoading() {
  return `
    <div class="run-loading" aria-busy="true" aria-label="Đang xử lý...">
      <div class="run-skel"></div>
      <div class="run-skel"></div>
      <div class="run-skel"></div>
    </div>
  `;
}

export function renderError(err) {
  const msg  = err?.message ?? String(err ?? 'Lỗi không xác định');
  const hint = _errorHint(msg);
  return `
    <div class="run-error" role="alert">
      <span class="run-error-icon" aria-hidden="true">⚠️</span>
      <div class="run-error-body">
        <p>${_esc(msg)}</p>
        ${hint ? `<small>${_esc(hint)}</small>` : ''}
      </div>
    </div>
  `;
}

// ── Widget controller ─────────────────────────────────────────────────────────

/**
 * Wire up dynamic behaviour on the output panel.
 *
 * @param {HTMLElement} el       - the .run-output-panel root element
 * @param {Object}      options
 * @param {Function}    options.onCopy - optional hook called after text is copied
 * @returns {{ setLoading, appendChunk, setDone, setError, reset, getText }}
 */
export function initWidget(el, { onCopy } = {}) {
  const body = el.querySelector('.run-output-body');
  const tokenBar = el.querySelector('.run-token-bar');
  if (!body) throw new Error('initWidget: .run-output-body not found');

  let _streamEl  = null; // <div class="run-stream-text">
  let _streaming = false;

  function setLoading() {
    _streaming = false;
    _streamEl  = null;
    body.innerHTML = renderLoading();
    _setTokens('');
  }

  function appendChunk(text) {
    if (!_streamEl) {
      body.innerHTML = '';
      _streamEl = document.createElement('div');
      _streamEl.className = 'run-stream-text run-streaming';
      _streamEl.setAttribute('aria-live', 'polite');
      body.appendChild(_streamEl);
      _streaming = true;
    }
    _streamEl.textContent += text;
    // Auto-scroll only when user hasn't scrolled up manually
    if (body.scrollHeight - body.scrollTop - body.clientHeight < 80) {
      body.scrollTop = body.scrollHeight;
    }
  }

  function setDone(result) {
    _streaming = false;
    if (_streamEl) {
      _streamEl.classList.remove('run-streaming');
    }

    // Token + latency metadata
    const tokens  = result?.tokens  ?? {};
    const ms      = result?.ms      ?? 0;
    const model   = result?.model   ?? '';
    const metaEl = document.createElement('div');
    metaEl.className = 'run-done-meta';
    metaEl.innerHTML = `
      <span><strong>${tokens.total ?? '—'}</strong> tokens</span>
      <span><strong>${ms ? (ms / 1000).toFixed(1) + 's' : '—'}</strong> thời gian</span>
      ${model ? `<span>Model: <strong>${_esc(model)}</strong></span>` : ''}
      <button class="run-copy-btn" data-copy>Sao chép</button>
    `;
    body.appendChild(metaEl);

    // Copy button
    metaEl.querySelector('[data-copy]')?.addEventListener('click', () => {
      const text = _streamEl?.textContent ?? result?.text ?? '';
      navigator.clipboard?.writeText(text).then(() => {
        const btn = metaEl.querySelector('[data-copy]');
        if (btn) {
          btn.textContent = 'Đã sao chép!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Sao chép';
            btn.classList.remove('copied');
          }, 2000);
        }
        onCopy?.();
      }).catch(() => {});
    });

    if (tokenBar) _setTokens(`${tokens.total ?? 0} tokens · ${ms ? (ms / 1000).toFixed(1) + 's' : ''}`);
  }

  function setError(err) {
    _streaming = false;
    _streamEl  = null;
    body.innerHTML = renderError(err);
    _setTokens('');
  }

  function reset() {
    _streaming = false;
    _streamEl  = null;
    body.innerHTML = renderEmpty();
    _setTokens('');
  }

  function getText() {
    return _streamEl?.textContent ?? '';
  }

  function _setTokens(text) {
    if (!tokenBar) return;
    tokenBar.textContent = text;
  }

  return { setLoading, appendChunk, setDone, setError, reset, getText };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _errorHint(msg) {
  const m = msg.toLowerCase();
  if (m.includes('hết thời gian') || m.includes('timeout'))
    return 'GAS đang xử lý lâu. Thử rút ngắn prompt hoặc giảm max_tokens.';
  if (m.includes('không thể kết nối') || m.includes('network'))
    return 'Kiểm tra kết nối mạng và thử lại.';
  if (m.includes('42501') || m.includes('permission denied'))
    return 'Bạn không có quyền chạy Builder này.';
  if (m.includes('sprint 19') || m.includes('chưa được triển khai'))
    return 'Provider này dự kiến hỗ trợ trong Sprint 19.';
  return '';
}
