function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function render(builder) {
  return `
    <div class="bs-playground">
      <div class="bs-field">
        <label for="bs-pg-input">Dữ liệu mẫu (mô phỏng nội dung form)</label>
        <textarea id="bs-pg-input" class="bs-input bs-textarea-code" rows="5"
          placeholder="Nhập nội dung mẫu để test prompt..."></textarea>
      </div>
      <button class="bs-btn bs-btn--primary" id="bs-pg-run">Chạy thử</button>
      <div id="bs-pg-output" class="bs-pg-output" aria-live="polite"></div>
    </div>
  `;
}

export function renderResult(result) {
  return `
    <div class="bs-pg-result">
      <div class="bs-pg-result-meta">
        <span>Provider: ${esc(result.provider)}</span>
        <span>Model: ${esc(result.model ?? '—')}</span>
        <span>Tokens: ${result.tokens?.total ?? 0}</span>
        <span>${result.responseTimeMs} ms</span>
      </div>
      <pre class="bs-pg-content">${esc(result.content)}</pre>
    </div>
  `;
}

export function renderError(message) {
  return `<p class="bs-pg-error" role="alert">Lỗi khi chạy thử: ${esc(message)}</p>`;
}

export function renderLoading() {
  return `<div class="bs-pg-loading"><div class="spinner"></div><span>Đang chạy AI...</span></div>`;
}
