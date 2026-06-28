import { deriveBrandColors } from '../services/theme-service.js';

function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

// ── Token helpers ──────────────────────────────────────────────
function _css(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

// ── Browser Tab mockup ─────────────────────────────────────────
export function renderBrowserTab(wsName, favicon, color) {
  const title  = _esc((wsName || 'Workspace') + ' — AIFUN OS');
  const fav    = favicon
    ? `<img src="${_esc(favicon)}" alt="" class="stt-btab-favicon">`
    : `<div class="stt-btab-fav-dot" style="background:${_esc(color)}"></div>`;
  return `
    <div class="stt-browser-bar">
      <div class="stt-browser-dots">
        <span style="background:#ef4444"></span>
        <span style="background:#f59e0b"></span>
        <span style="background:#10b981"></span>
      </div>
      <div class="stt-browser-addr">${_esc('portal.aifun.ai.vn')}</div>
    </div>
    <div class="stt-btab-row">
      <div class="stt-btab stt-btab--active">
        <div class="stt-btab-inner" id="stt-preview-btab">
          ${fav}
          <span class="stt-btab-title" id="stt-preview-btab-title">${title}</span>
          <span class="stt-btab-x">×</span>
        </div>
      </div>
      <div class="stt-btab">
        <div class="stt-btab-inner" style="opacity:.4">
          <div class="stt-btab-fav-dot" style="background:#94a3b8"></div>
          <span class="stt-btab-title">Tài liệu</span>
        </div>
      </div>
    </div>`;
}

// ── Login mockup ───────────────────────────────────────────────
function _renderLoginMockup(color, logoSrc) {
  const logoHtml = logoSrc
    ? `<img src="${_esc(logoSrc)}" alt="logo" class="stt-mock-logo-img">`
    : `<div class="stt-mock-initials" style="background:${_esc(color)}">A</div>`;
  return `
    <div class="stt-mock-card" id="stt-preview-login">
      <div class="stt-mock-login-header">
        ${logoHtml}
        <span class="stt-mock-app-name">AIFUN OS</span>
      </div>
      <div class="stt-mock-login-body">
        <div class="stt-mock-label">Đăng nhập</div>
        <div class="stt-mock-input"></div>
        <div class="stt-mock-input" style="margin-top:4px"></div>
        <div class="stt-mock-btn" id="stt-preview-login-btn"
          style="background:${_esc(color)}">Đăng nhập</div>
      </div>
    </div>`;
}

// ── Sidebar mockup ─────────────────────────────────────────────
function _renderSidebarMockup(color, logoSrc, wsName) {
  const logoHtml = logoSrc
    ? `<img src="${_esc(logoSrc)}" alt="logo" class="stt-mock-logo-img stt-mock-logo-img--sm">`
    : `<div class="stt-mock-initials stt-mock-initials--sm" style="background:${_esc(color)}">A</div>`;
  const items = ['Dashboard', 'AI Builders', 'Tài liệu', 'Cài đặt'];
  const navItems = items.map((label, i) => `
    <div class="stt-mock-nav-item${i === 0 ? ' stt-mock-nav-item--active' : ''}"
      style="${i === 0 ? `color:${_esc(color)};background:${_esc(color)}18` : ''}">
      ${_esc(label)}
    </div>`).join('');
  return `
    <div class="stt-mock-sidebar" id="stt-preview-sidebar">
      <div class="stt-mock-sidebar-head" style="background:${_esc(color)}"
        id="stt-preview-sidebar-head">
        ${logoHtml}
        <span class="stt-mock-ws-name">${_esc(wsName || 'Workspace')}</span>
      </div>
      <div class="stt-mock-nav">${navItems}</div>
    </div>`;
}

// ── Dashboard header mockup ────────────────────────────────────
function _renderDashMockup(color) {
  return `
    <div class="stt-mock-dash" id="stt-preview-dash">
      <div class="stt-mock-dash-topbar" style="border-top:2px solid ${_esc(color)}">
        <span class="stt-mock-dash-title">☰ Dashboard</span>
        <div class="stt-mock-dash-cta" id="stt-preview-dash-btn"
          style="background:${_esc(color)}">+ Tạo tài liệu</div>
      </div>
      <div class="stt-mock-dash-body">
        <div class="stt-mock-dash-card">
          <div class="stt-mock-dash-stat" style="color:${_esc(color)}">24</div>
          <div class="stt-mock-dash-label">Tài liệu</div>
        </div>
        <div class="stt-mock-dash-card">
          <div class="stt-mock-dash-stat" style="color:${_esc(color)}">5</div>
          <div class="stt-mock-dash-label">SOP</div>
        </div>
        <div class="stt-mock-dash-card">
          <div class="stt-mock-dash-stat" style="color:${_esc(color)}">98%</div>
          <div class="stt-mock-dash-label">Uptime</div>
        </div>
      </div>
    </div>`;
}

// ── Full preview panel ─────────────────────────────────────────
export function renderLivePreviews(color, logoSrc, wsName, favicon) {
  return `
    <div class="stt-preview-tabs">
      <button class="stt-preview-tab stt-preview-tab--active" data-preview="login"   type="button">Đăng nhập</button>
      <button class="stt-preview-tab" data-preview="sidebar"  type="button">Sidebar</button>
      <button class="stt-preview-tab" data-preview="dash"     type="button">Dashboard</button>
    </div>
    <div class="stt-preview-pane" id="stt-preview-pane-login">
      ${_renderLoginMockup(color, logoSrc)}
    </div>
    <div class="stt-preview-pane stt-preview-pane--hidden" id="stt-preview-pane-sidebar">
      ${_renderSidebarMockup(color, logoSrc, wsName)}
    </div>
    <div class="stt-preview-pane stt-preview-pane--hidden" id="stt-preview-pane-dash">
      ${_renderDashMockup(color)}
    </div>
    <div class="stt-preview-browser" id="stt-preview-browser-wrap">
      ${renderBrowserTab(wsName, favicon, color)}
    </div>`;
}

// ── Live DOM updates (no save needed) ─────────────────────────
export function updateAllPreviews(color, logoSrc, wsName) {
  const valid = /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : '#6366f1';

  // Login
  const loginBtn  = document.getElementById('stt-preview-login-btn');
  const loginInitial = document.querySelector('#stt-preview-login .stt-mock-initials');
  if (loginBtn) loginBtn.style.background = valid;
  if (loginInitial) loginInitial.style.background = valid;

  // Sidebar
  const sidebarHead = document.getElementById('stt-preview-sidebar-head');
  const sidebarInitial = document.querySelector('#stt-preview-sidebar .stt-mock-initials--sm');
  const activeNavItem  = document.querySelector('#stt-preview-sidebar .stt-mock-nav-item--active');
  if (sidebarHead)    sidebarHead.style.background = valid;
  if (sidebarInitial) sidebarInitial.style.background = valid;
  if (activeNavItem) {
    activeNavItem.style.color      = valid;
    activeNavItem.style.background = valid + '18';
  }

  // Dashboard
  const dashTopbar = document.querySelector('#stt-preview-dash .stt-mock-dash-topbar');
  const dashBtn    = document.getElementById('stt-preview-dash-btn');
  const dashStats  = document.querySelectorAll('#stt-preview-dash .stt-mock-dash-stat');
  if (dashTopbar) dashTopbar.style.borderTopColor = valid;
  if (dashBtn)    dashBtn.style.background        = valid;
  dashStats.forEach((el) => { el.style.color = valid; });

  // Logo update across all mockups
  if (logoSrc !== undefined) {
    document.querySelectorAll('.stt-preview-pane .stt-mock-logo-img').forEach((img) => {
      img.src = logoSrc;
    });
  }
}

export function wirePreviews() {
  const container = document.querySelector('.stt-preview-tabs');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.stt-preview-tab');
    if (!btn) return;
    const target = btn.dataset.preview;
    document.querySelectorAll('.stt-preview-tab').forEach((b) =>
      b.classList.toggle('stt-preview-tab--active', b.dataset.preview === target));
    document.querySelectorAll('.stt-preview-pane').forEach((p) =>
      p.classList.toggle('stt-preview-pane--hidden', p.id !== `stt-preview-pane-${target}`));
  });
}

// ── Theme Inspector (debug) ────────────────────────────────────
const _INSPECTOR_TOKENS = [
  { label: 'Primary',      prop: '--c-primary',   source: 'brand' },
  { label: 'Primary Hover', prop: '--c-primary-h', source: 'hover' },
  { label: 'Primary Light', prop: '--c-primary-l', source: 'light' },
  { label: 'Background',   prop: '--bg',           source: 'css'   },
  { label: 'Surface',      prop: '--surface',      source: 'css'   },
  { label: 'Text primary', prop: '--text-1',       source: 'css'   },
  { label: 'Success',      prop: '--c-success',    source: 'css'   },
  { label: 'Warning',      prop: '--c-warning',    source: 'css'   },
  { label: 'Danger',       prop: '--c-danger',     source: 'css'   },
];

function _inspectorRow(label, prop, value) {
  return `
    <div class="stt-insp-row" data-prop="${_esc(prop)}">
      <span class="stt-insp-swatch" style="background:${_esc(value)}"></span>
      <code class="stt-insp-prop">${_esc(prop)}</code>
      <span class="stt-insp-value" id="stt-insp-val-${_esc(prop.replace(/--/g,'').replace(/-/g,'_'))}">${_esc(value)}</span>
      <span class="stt-insp-label">${_esc(label)}</span>
    </div>`;
}

export function renderThemeInspector(color) {
  const derived = deriveBrandColors(color);
  const rows = _INSPECTOR_TOKENS.map((t) => {
    const value = t.source === 'brand' ? derived.primary
      : t.source === 'hover'            ? derived.hover
      : t.source === 'light'            ? derived.light
      : _css(t.prop);
    return _inspectorRow(t.label, t.prop, value);
  }).join('');

  return `
    <details class="stt-inspector" id="stt-inspector">
      <summary class="stt-inspector-toggle">
        <span>CSS Variables</span>
        <span class="stt-inspector-badge">debug</span>
      </summary>
      <div class="stt-inspector-body" id="stt-inspector-body">${rows}</div>
    </details>`;
}

export function updateThemeInspector(color) {
  const body = document.getElementById('stt-inspector-body');
  if (!body) return;
  const derived = deriveBrandColors(color);
  _INSPECTOR_TOKENS.forEach((t) => {
    const value = t.source === 'brand' ? derived.primary
      : t.source === 'hover'            ? derived.hover
      : t.source === 'light'            ? derived.light
      : _css(t.prop);
    const id    = 'stt-insp-val-' + t.prop.replace(/--/g, '').replace(/-/g, '_');
    const valEl = document.getElementById(id);
    const row   = valEl?.closest('.stt-insp-row');
    if (valEl) valEl.textContent = value;
    if (row) row.querySelector('.stt-insp-swatch').style.background = value;
  });
}

// ── Theme Export ───────────────────────────────────────────────
export function exportTheme(settings, wsId, wsName) {
  const color   = settings.brand_color || '#6366f1';
  const derived = deriveBrandColors(color);

  const theme = {
    version:     '1.0',
    schema:      'aifun-theme/v1',
    exported_at: new Date().toISOString(),
    workspace:   { id: wsId, name: wsName },
    branding: {
      logo_url:          settings.logo_url    || '',
      favicon_url:       settings.favicon_url || '',
      brand_color:       derived.primary,
      brand_color_hover: derived.hover,
      brand_color_light: derived.light,
    },
    tokens: {
      '--c-primary':   derived.primary,
      '--c-primary-h': derived.hover,
      '--c-primary-l': derived.light,
      '--c-success':   _css('--c-success')  || '#10b981',
      '--c-warning':   _css('--c-warning')  || '#f59e0b',
      '--c-danger':    _css('--c-danger')   || '#ef4444',
      '--bg':          _css('--bg')         || '#f1f5f9',
      '--surface':     _css('--surface')    || '#ffffff',
      '--text-1':      _css('--text-1')     || '#0f172a',
      '--text-2':      _css('--text-2')     || '#475569',
      '--text-3':      _css('--text-3')     || '#94a3b8',
      '--border':      _css('--border')     || '#e2e8f0',
    },
  };

  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'theme.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
