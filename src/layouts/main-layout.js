import { renderSidebar, initSidebar, updateActiveNav } from './sidebar.js';
import { renderTopbar, initTopbar, updatePageTitle } from './topbar.js';

export function renderShell() {
  return `
    <div class="app-shell">
      <div class="sb-overlay" id="sb-overlay" aria-hidden="true"></div>
      ${renderSidebar()}
      <div class="app-main">
        ${renderTopbar()}
        <main class="page-content" id="page-content" role="main" aria-live="polite"></main>
      </div>
    </div>
  `;
}

export async function initShell() {
  await Promise.all([initSidebar(), initTopbar()]);
}

export function mountPage(path, title, html, initFn) {
  const root = document.getElementById('v4-root');
  if (!root) return;

  if (!root.querySelector('.app-shell')) {
    root.innerHTML = renderShell();
    initShell();
  }

  updateActiveNav(path);
  updatePageTitle(title);

  const content = document.getElementById('page-content');
  if (content) {
    content.innerHTML = html;
    if (initFn) initFn();
  }
}
