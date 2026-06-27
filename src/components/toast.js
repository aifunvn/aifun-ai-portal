// Toast notification system.
// Usage: showToast('message', 'success' | 'info' | 'warn' | 'error')
// Stacks up to 4 toasts, auto-dismisses after 4 seconds.

const MAX_TOASTS = 4;
const TTL_MS     = 4000;

let _container = null;

function _getContainer() {
  if (_container && document.contains(_container)) return _container;
  _container = document.createElement('div');
  _container.id = 'toast-container';
  _container.setAttribute('role', 'region');
  _container.setAttribute('aria-label', 'Thong bao');
  _container.setAttribute('aria-live', 'polite');
  Object.assign(_container.style, {
    position: 'fixed',
    bottom:   '24px',
    right:    '24px',
    zIndex:   '9999',
    display:  'flex',
    flexDirection: 'column',
    gap:      '8px',
    pointerEvents: 'none',
  });
  document.body.appendChild(_container);
  return _container;
}

export function showToast(message, type = 'info') {
  const container = _getContainer();

  // Evict oldest if at cap
  while (container.children.length >= MAX_TOASTS) {
    container.firstChild?.remove();
  }

  const COLOR = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    warn:    { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    error:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  };
  const ICON = {
    success: '✓', info: 'ℹ', warn: '⚠', error: '✕',
  };

  const c = COLOR[type] ?? COLOR.info;
  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  Object.assign(toast.style, {
    background:   c.bg,
    border:       `1.5px solid ${c.border}`,
    color:        c.text,
    borderRadius: '10px',
    padding:      '10px 16px',
    fontSize:     '0.875rem',
    fontWeight:   '500',
    fontFamily:   'inherit',
    boxShadow:    '0 4px 12px rgba(0,0,0,.1)',
    pointerEvents: 'auto',
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    maxWidth:     '320px',
    animation:    'toast-in .18s ease',
  });

  toast.innerHTML = `<span style="font-weight:700;flex-shrink:0">${ICON[type] ?? ICON.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Inject keyframes once
  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `@keyframes toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .25s ease';
    setTimeout(() => toast.remove(), 280);
  }, TTL_MS);
}
