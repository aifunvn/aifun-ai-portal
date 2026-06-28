import { showToast }              from '../components/toast.js';
import { updateWorkspaceSettings } from '../services/settings-service.js';
import { applyBrandColor }         from '../services/theme-service.js';
import {
  renderLivePreviews,
  updateAllPreviews,
  wirePreviews,
  renderBrowserTab,
  renderThemeInspector,
  updateThemeInspector,
  exportTheme,
} from './settings-branding-preview.js';

function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

// ── Brand presets ──────────────────────────────────────────────
const _PRESETS = [
  { name: 'Blue',   color: '#3b82f6' },
  { name: 'Green',  color: '#10b981' },
  { name: 'Purple', color: '#8b5cf6' },
  { name: 'Orange', color: '#f59e0b' },
  { name: 'Red',    color: '#ef4444' },
];

// ── Module state ───────────────────────────────────────────────
let _wsId        = null;
let _wsName      = 'Workspace';
let _origState   = {};
let _saving      = false;
let _logoDataUrl = null;

// ── Helpers ────────────────────────────────────────────────────
function _effectiveLogo() {
  return _logoDataUrl || (document.getElementById('stt-logo-url')?.value ?? '').trim();
}

function _renderLogoZoneInner(logoSrc) {
  return logoSrc
    ? `<img src="${_esc(logoSrc)}" alt="Logo workspace" class="stt-logo-preview-img">`
    : `<div class="stt-logo-fallback" aria-label="Logo mặc định">A</div>`;
}

function _renderPresets(activeColor) {
  return _PRESETS.map((p) => {
    const active = p.color.toLowerCase() === (activeColor ?? '').toLowerCase();
    return `<button
      class="stt-preset${active ? ' stt-preset--active' : ''}"
      data-color="${p.color}"
      title="${p.name}"
      type="button"
      aria-label="Màu ${p.name}"
      style="background:${p.color}"
    ></button>`;
  }).join('');
}

// ── Render ─────────────────────────────────────────────────────
function _renderPanel(s) {
  const color   = s.brand_color || '#6366f1';
  const logo    = s.logo_url    || '';
  const favicon = s.favicon_url || '';

  return `
    <div class="stt-section">
      <div class="stt-section-title">Logo workspace</div>
      <div class="stt-section-desc">Hiển thị trên Sidebar và tài liệu xuất ra. PNG hoặc SVG, nền trong suốt.</div>

      <div class="stt-logo-zone">
        <div class="stt-logo-zone-preview" id="stt-logo-zone-preview">
          ${_renderLogoZoneInner(logo)}
        </div>
        <div class="stt-logo-zone-body">
          <div class="stt-logo-zone-actions">
            <label class="stt-btn stt-btn--ghost stt-btn--sm" for="stt-logo-file">Tải lên</label>
            <input type="file" id="stt-logo-file" accept="image/png,image/svg+xml"
              style="display:none" aria-label="Chọn file logo">
            <button class="stt-btn stt-btn--ghost stt-btn--sm" id="stt-logo-remove"
              type="button" style="${logo ? '' : 'display:none'}">Xóa logo</button>
          </div>
          <div class="stt-logo-zone-note">Tối thiểu 64×64px · Tối đa 2MB · PNG hoặc SVG</div>
          <div class="stt-logo-url-row">
            <span class="stt-logo-url-label">hoặc nhập URL</span>
            <input id="stt-logo-url" class="stt-input stt-input--sm" type="url"
              placeholder="https://example.com/logo.png" value="${_esc(logo)}">
          </div>
        </div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Màu thương hiệu</div>
      <div class="stt-section-desc">Áp dụng làm màu primary toàn app cho workspace này</div>

      <div class="stt-field">
        <label class="stt-label">Preset màu</label>
        <div class="stt-presets" role="group" aria-label="Chọn màu preset" id="stt-presets">
          ${_renderPresets(color)}
        </div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-brand-color-hex">Màu tuỳ chỉnh</label>
        <div class="stt-color-row">
          <input type="color" id="stt-brand-color-picker" class="stt-color-picker" value="${_esc(color)}">
          <input type="text"  id="stt-brand-color-hex"
            class="stt-input stt-input--hex" value="${_esc(color)}" maxlength="7" placeholder="#6366f1">
        </div>
        <div class="stt-field-note">Định dạng HEX 6 ký tự, ví dụ: #6366f1</div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-favicon-url">URL Favicon</label>
        <input id="stt-favicon-url" class="stt-input" type="url"
          placeholder="https://example.com/favicon.ico" value="${_esc(favicon)}">
        <div class="stt-field-note">32×32px ICO hoặc PNG (để trống dùng favicon AIFUN mặc định)</div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Xem trước</div>
      <div class="stt-section-desc">Cập nhật theo thời gian thực — không cần lưu để xem</div>
      ${renderLivePreviews(color, logo, _wsName, favicon)}
    </div>

    <div class="stt-section">
      ${renderThemeInspector(color)}
    </div>

    <div class="stt-section">
      <div class="stt-actions stt-actions--spread">
        <button class="stt-btn stt-btn--ghost" id="stt-export-theme" type="button">
          ↓ Export theme.json
        </button>
        <div style="display:flex;gap:8px">
          <button class="stt-btn stt-btn--ghost"   id="stt-cancel-brand" type="button">Huỷ</button>
          <button class="stt-btn stt-btn--primary" id="stt-save-brand"   type="button" disabled>
            Lưu thương hiệu
          </button>
        </div>
      </div>
    </div>`;
}

// ── Form state ─────────────────────────────────────────────────
function _getValues() {
  return {
    logo_url:    _effectiveLogo(),
    brand_color: (document.getElementById('stt-brand-color-hex')?.value ?? '').trim() || '#6366f1',
    favicon_url: (document.getElementById('stt-favicon-url')?.value     ?? '').trim(),
  };
}

function _isDirty() {
  const v = _getValues();
  return v.logo_url    !== (_origState.logo_url    ?? '')
      || v.brand_color !== (_origState.brand_color ?? '#6366f1')
      || v.favicon_url !== (_origState.favicon_url ?? '');
}

function _updateSaveBtn() {
  const btn = document.getElementById('stt-save-brand');
  if (btn) btn.disabled = !_isDirty();
}

// ── Sync all live previews ─────────────────────────────────────
function _syncAll() {
  const hex  = document.getElementById('stt-brand-color-hex')?.value ?? '#6366f1';
  updateAllPreviews(hex, _effectiveLogo(), _wsName);
  updateThemeInspector(hex);
}

// ── Logo zone helpers ──────────────────────────────────────────
function _setLogo(logoSrc) {
  const zonePreview = document.getElementById('stt-logo-zone-preview');
  const removeBtn   = document.getElementById('stt-logo-remove');
  if (zonePreview) zonePreview.innerHTML = _renderLogoZoneInner(logoSrc);
  if (removeBtn)   removeBtn.style.display = logoSrc ? '' : 'none';
  _syncAll();
}

function _syncColorInputs(hex) {
  const picker = document.getElementById('stt-brand-color-picker');
  const hexEl  = document.getElementById('stt-brand-color-hex');
  if (picker) picker.value = hex;
  if (hexEl)  hexEl.value  = hex;
}

function _syncPresetHighlight(hex) {
  document.querySelectorAll('.stt-preset').forEach((btn) => {
    btn.classList.toggle('stt-preset--active',
      btn.dataset.color.toLowerCase() === (hex ?? '').toLowerCase());
  });
}

// ── Event handlers ─────────────────────────────────────────────
function _onColorPickerInput() {
  const hex = document.getElementById('stt-brand-color-picker')?.value ?? '';
  const hexEl = document.getElementById('stt-brand-color-hex');
  if (hexEl) hexEl.value = hex;
  _syncPresetHighlight(hex);
  _syncAll();
  _updateSaveBtn();
}

function _onHexInput() {
  const hex = document.getElementById('stt-brand-color-hex')?.value ?? '';
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const picker = document.getElementById('stt-brand-color-picker');
    if (picker) picker.value = hex;
  }
  _syncPresetHighlight(hex);
  _syncAll();
  _updateSaveBtn();
}

function _onPresetClick(color) {
  _syncColorInputs(color);
  _syncPresetHighlight(color);
  _syncAll();
  _updateSaveBtn();
}

function _onFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('File quá lớn. Tối đa 2MB.', 'error');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    _logoDataUrl = ev.target.result;
    const urlEl = document.getElementById('stt-logo-url');
    if (urlEl) urlEl.value = '';
    _setLogo(_logoDataUrl);
    _updateSaveBtn();
  };
  reader.readAsDataURL(file);
}

function _onLogoUrlInput() {
  _logoDataUrl = null;
  const fileEl = document.getElementById('stt-logo-file');
  if (fileEl) fileEl.value = '';
  _setLogo(_effectiveLogo());
  _updateSaveBtn();
}

function _onLogoRemove() {
  _logoDataUrl = null;
  const urlEl  = document.getElementById('stt-logo-url');
  const fileEl = document.getElementById('stt-logo-file');
  if (urlEl)  urlEl.value  = '';
  if (fileEl) fileEl.value = '';
  _setLogo('');
  _updateSaveBtn();
}

// ── Save / Reset ───────────────────────────────────────────────
async function _save() {
  if (_saving) return;
  const values = _getValues();
  _saving = true;
  const btn = document.getElementById('stt-save-brand');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

  const ok = await updateWorkspaceSettings(_wsId, values);

  _saving = false;
  if (btn) btn.textContent = 'Lưu thương hiệu';

  if (ok) {
    _origState   = { ..._origState, ...values };
    _logoDataUrl = null;
    if (btn) btn.disabled = true;
    applyBrandColor(values.brand_color);
    showToast('Đã lưu thương hiệu workspace', 'success');
  } else {
    if (btn) btn.disabled = false;
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

function _reset() {
  _logoDataUrl = null;
  const origColor = _origState.brand_color ?? '#6366f1';
  _syncColorInputs(origColor);
  _syncPresetHighlight(origColor);
  const urlEl    = document.getElementById('stt-logo-url');
  const fileEl   = document.getElementById('stt-logo-file');
  const faviconEl = document.getElementById('stt-favicon-url');
  if (urlEl)    urlEl.value    = _origState.logo_url    ?? '';
  if (fileEl)   fileEl.value   = '';
  if (faviconEl) faviconEl.value = _origState.favicon_url ?? '';
  _setLogo(_origState.logo_url ?? '');
  _syncAll();
  _updateSaveBtn();
}

// ── Wire ───────────────────────────────────────────────────────
function _wire() {
  document.getElementById('stt-brand-color-picker')?.addEventListener('input', _onColorPickerInput);
  document.getElementById('stt-brand-color-hex')?.addEventListener('input', _onHexInput);
  document.getElementById('stt-logo-url')?.addEventListener('input', _onLogoUrlInput);
  document.getElementById('stt-logo-file')?.addEventListener('change', _onFileChange);
  document.getElementById('stt-logo-remove')?.addEventListener('click', _onLogoRemove);
  document.getElementById('stt-favicon-url')?.addEventListener('input', () => { _syncAll(); _updateSaveBtn(); });
  document.getElementById('stt-save-brand')?.addEventListener('click', _save);
  document.getElementById('stt-cancel-brand')?.addEventListener('click', _reset);
  document.getElementById('stt-export-theme')?.addEventListener('click', () => {
    exportTheme(_getValues(), _wsId, _wsName);
  });
  document.getElementById('stt-presets')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.stt-preset');
    if (btn?.dataset.color) _onPresetClick(btn.dataset.color);
  });
  wirePreviews();
}

// ── Public API ─────────────────────────────────────────────────
export function loadBranding(wsId, settings, wsName) {
  const panel = document.getElementById('stt-panel-branding');
  if (!panel) return;
  _wsId        = wsId;
  _wsName      = wsName || 'Workspace';
  _logoDataUrl = null;
  _origState   = {
    logo_url:    settings.logo_url    ?? '',
    brand_color: settings.brand_color ?? '#6366f1',
    favicon_url: settings.favicon_url ?? '',
  };
  panel.innerHTML = _renderPanel(settings);
  _wire();
}
