function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// state: 'empty' | 'loading' | { content, tokens, provider } | { error }
export function render(state) {
  if (state === 'empty') {
    return `
      <div class="output-empty">
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 8l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9z"/>
        </svg>
        <p class="output-empty-title">Prompt Preview</p>
        <p class="output-empty-desc">Điền form và nhấn "Tạo ngay" để xem kết quả.</p>
      </div>
    `;
  }

  if (state === 'loading') {
    return `
      <div class="output-loading" aria-live="polite" aria-label="Đang tạo prompt">
        <div class="spinner" role="status"></div>
        <p>Đang tạo prompt...</p>
      </div>
    `;
  }

  if (state?.error) {
    return `
      <div class="output-error" role="alert">
        <p class="output-error-title">Có lỗi xảy ra</p>
        <p class="output-error-msg">${escHtml(state.error)}</p>
      </div>
    `;
  }

  const tokens  = state?.tokens;
  const escaped = escHtml(state?.content ?? '');

  return `
    <div class="output-ready">
      <div class="output-content-wrap">
        <pre id="output-text" class="output-text">${escaped}</pre>
      </div>
      <div class="output-footer">
        ${tokens ? `<span class="output-tokens">${tokens.total.toLocaleString('vi-VN')} tokens</span>` : ''}
        <div class="output-actions">
          <button class="btn btn-secondary" id="output-copy">Sao chép</button>
          <button class="btn btn-primary"   id="output-save">Lưu tài liệu</button>
        </div>
      </div>
    </div>
  `;
}

export function initOutput() {
  const copyBtn = document.getElementById('output-copy');
  const saveBtn = document.getElementById('output-save');
  const textEl  = document.getElementById('output-text');

  copyBtn?.addEventListener('click', async () => {
    const content = textEl?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(content);
      copyBtn.textContent = 'Đã sao chép ✓';
    } catch {
      copyBtn.textContent = 'Thử lại';
    }
    setTimeout(() => { copyBtn.textContent = 'Sao chép'; }, 2200);
  });

  saveBtn?.addEventListener('click', async () => {
    saveBtn.textContent = 'Đang lưu...';
    saveBtn.disabled    = true;
    await new Promise((r) => setTimeout(r, 700));
    saveBtn.textContent = 'Đã lưu ✓';
    setTimeout(() => {
      saveBtn.textContent = 'Lưu tài liệu';
      saveBtn.disabled    = false;
    }, 2500);
  });
}
