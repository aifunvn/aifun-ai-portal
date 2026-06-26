import { workspaceStore } from '../stores/workspace-store.js';
import { switchWorkspace } from '../services/workspace-service.js';

const CHEVRON = `<svg class="sb-ws-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 5 7 9 11 5"/></svg>`;
const CHECK   = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 7 6 11 12 3"/></svg>`;

export function render() {
  return `
    <div class="sb-ws">
      <button class="sb-ws-trigger" id="ws-trigger" aria-expanded="false" aria-haspopup="listbox">
        <span class="sb-ws-avatar" id="ws-initial">A</span>
        <span class="sb-ws-name"   id="ws-name">Đang tải...</span>
        ${CHEVRON}
      </button>
      <div class="sb-ws-dropdown" id="ws-dropdown" role="listbox">
        <div id="ws-options-list"></div>
        <div class="sb-ws-divider"></div>
        <button class="sb-ws-option" id="ws-new-btn" role="option" aria-selected="false">
          + Tạo workspace mới
        </button>
      </div>
    </div>
  `;
}

function renderOptions(workspaces, current) {
  const el = document.getElementById('ws-options-list');
  if (!el) return;
  el.innerHTML = workspaces.map((ws) => `
    <button class="sb-ws-option ${ws.id === current?.id ? 'is-active' : ''}"
            data-ws-id="${ws.id}" role="option"
            aria-selected="${ws.id === current?.id}">
      <span class="sb-ws-avatar">${ws.initial}</span>
      <span>${ws.name}</span>
      ${ws.id === current?.id ? CHECK : ''}
    </button>
  `).join('');

  el.querySelectorAll('[data-ws-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchWorkspace(btn.dataset.wsId);
      closeDropdown();
    });
  });
}

function closeDropdown() {
  document.getElementById('ws-dropdown')?.classList.remove('is-open');
  document.getElementById('ws-trigger')?.setAttribute('aria-expanded', 'false');
}

export function init() {
  const trigger  = document.getElementById('ws-trigger');
  const dropdown = document.getElementById('ws-dropdown');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  document.getElementById('ws-new-btn')?.addEventListener('click', () => {
    closeDropdown();
    window.location.hash = '/settings';
  });

  workspaceStore.subscribe(({ workspace, workspaces }) => {
    const initial = document.getElementById('ws-initial');
    const name    = document.getElementById('ws-name');
    if (initial) initial.textContent = workspace?.initial ?? '?';
    if (name)    name.textContent    = workspace?.name    ?? 'Workspace';
    renderOptions(workspaces, workspace);
  });
}
