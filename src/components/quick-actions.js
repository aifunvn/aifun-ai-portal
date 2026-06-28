const ICON_SOP  = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1H4a1 1 0 00-1 1v11a1 1 0 001 1h7a1 1 0 001-1V5l-3-4z"/><polyline points="9 1 9 5 13 5"/><line x1="5" y1="9" x2="9" y2="9"/></svg>`;
const ICON_PEN  = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 1.5l3 3L5 13H2v-3L10.5 1.5z"/></svg>`;
const ICON_MAIL = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="13" height="9" rx="1"/><polyline points="1 4 7.5 9 14 4"/></svg>`;
const ICON_SHOP = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 1L3 5v8a1 1 0 001 1h7a1 1 0 001-1V5L10 1H5z"/><line x1="3" y1="5" x2="12" y2="5"/><path d="M9 8a2 2 0 01-4 0"/></svg>`;

const ACTIONS = [
  { label: 'Tạo SOP mới',      icon: ICON_SOP,  to: '/builders',    primary: true },
  { label: 'Tạo Content',       icon: ICON_PEN,  to: '/builders',    primary: false },
  { label: 'Tạo Email',         icon: ICON_MAIL, to: '/builders',    primary: false },
  { label: 'Thêm AI Builder',   icon: ICON_SHOP, to: '/marketplace', primary: false },
];

export function render() {
  const buttons = ACTIONS.map((a) => `
    <button class="qa-btn${a.primary ? ' qa-btn--primary' : ''}" data-nav-to="${a.to}" aria-label="${a.label}">
      ${a.icon}
      <span>${a.label}</span>
    </button>
  `).join('');
  return `<div class="qa-row">${buttons}</div>`;
}

export function init() {
  document.querySelectorAll('#dash-qa .qa-btn[data-nav-to]').forEach((btn) => {
    btn.addEventListener('click', () => { window.location.hash = btn.dataset.navTo; });
  });
}
