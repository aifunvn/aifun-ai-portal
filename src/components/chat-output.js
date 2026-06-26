import { renderMarkdown } from './markdown-viewer.js';
import { router } from '../router/router.js';

const ICON_DOC = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-3-4z"/><polyline points="10 2 10 6 14 6"/></svg>`;

// state: 'idle' | 'thinking' | { content, tokens, doc } | { error }
export function render(state) {
  if (state === 'idle')     return renderIdle();
  if (state === 'thinking') return renderThinking();
  if (state?.error)         return renderError(state.error);
  if (state?.content)       return renderReady(state);
  return renderIdle();
}

function renderIdle() {
  return `
    <div class="co-idle">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 5l2.4 7.2L27.6 15l-7.2 2.4L18 25l-2.4-7.6L8.4 15l7.2-2.4L18 5z"/>
        <circle cx="28" cy="7" r="2"/>
        <circle cx="9"  cy="28" r="1.5"/>
      </svg>
      <p class="co-idle-title">Output sẽ xuất hiện ở đây</p>
      <p class="co-idle-desc">Điền form bên trái rồi nhấn Tạo ngay</p>
    </div>
  `;
}

function renderThinking() {
  return `
    <div class="co-thinking">
      <div class="spinner" role="status" aria-label="Đang tạo nội dung"></div>
      <p class="co-thinking-text">AI đang tạo nội dung...</p>
    </div>
  `;
}

function renderReady({ content, tokens, doc }) {
  const tokenBadge = tokens ? `<span class="co-tokens">${tokens.total.toLocaleString('vi-VN')} tokens</span>` : '';
  return `
    <div class="co-ready">
      <div class="co-header">
        <span class="co-badge">Hoàn thành</span>
        ${tokenBadge}
      </div>
      <div class="co-body">${renderMarkdown(content)}</div>
      <div class="co-footer">
        <button class="btn btn-secondary" id="co-copy">Sao chép</button>
        ${doc ? `<button class="btn btn-primary" id="co-open-doc">${ICON_DOC} Xem tài liệu</button>` : ''}
      </div>
    </div>
  `;
}

function renderError(message) {
  return `
    <div class="co-error" role="alert">
      <p class="co-error-title">Tạo thất bại</p>
      <p class="co-error-msg">${message}</p>
    </div>
  `;
}

export function initChatOutput(content) {
  document.getElementById('co-copy')?.addEventListener('click', async () => {
    const btn = document.getElementById('co-copy');
    try {
      await navigator.clipboard.writeText(content ?? '');
      if (btn) { btn.textContent = 'Da sao chep'; setTimeout(() => { if (btn) btn.textContent = 'Sao chep'; }, 2000); }
    } catch (_) {
      if (btn) btn.textContent = 'Loi sao chep';
    }
  });

  document.getElementById('co-open-doc')?.addEventListener('click', () => {
    router.navigate('/documents');
  });
}
