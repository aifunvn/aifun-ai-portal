import { showToast }              from '../components/toast.js';
import { updateWorkspaceSettings } from '../services/settings-service.js';
import { applyBrandColor }         from '../services/theme-service.js';

function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

let _wsId      = null;
let _origState = {};
let _saving    = false;

function _renderPanel(s) {
  const color = s.brand_color || '#6366f1';
  const logo  = s.logo_url   || '';

  return `
    <div class="stt-section">
      <div class="stt-section-title">Logo workspace</div>
      <div class="stt-section-desc">Hiển thị trên Sidebar và tài liệu xuất ra</div>

      <div class="stt-field">
        <label class="stt-label" for="stt-logo-url">URL Logo</label>
        <input id="stt-logo-url" class="stt-input" type="url"
          placeholder="https://example.com/logo.png" value="${_esc(logo)}">
        <div class="stt-field-note">PNG hoặc SVG, nền trong suốt, tối thiểu 64×64px</div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Màu thương hiệu</div>
      <div class="stt-section-desc">Áp dụng làm màu primary toàn app cho workspace này</div>

      <div class="stt-field">
        <label class="stt-label" for="stt-brand-color-hex">Màu chủ đạo</label>
        <div class="stt-color-row">
          <input type="color" id="stt-brand-color-picker"
            class="stt-color-picker" value="${_esc(color)}">
          <input type="text"  id="stt-brand-color-hex"
            class="stt-input stt-input--hex" value="${_esc(color)}"
            maxlength="7" placeholder="#6366f1">
        </div>
        <div class="stt-field-note">Định dạng HEX 6 ký tự, ví dụ: #6366f1</div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-favicon-url">URL Favicon</label>
        <input id="stt-favicon-url" class="stt-input" type="url"
          placeholder="https://example.com/favicon.ico" value="${_esc(s.favicon_url || '')}">
        <div class="stt-field-note">32×32px ICO hoặc PNG (để trống dùng favicon AIFUN mặc định)</div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Xem trước</div>
      <div class="stt-section-desc">Màu sẽ thay đổi ngay sau khi lưu</div>
      <div class="stt-brand-preview">
        <div class="stt-brand-preview-bar" id="stt-preview-bar" style="background:${_esc(color)}">
          <div class="stt-preview-logo-wrap" id="stt-preview-logo-wrap">
            ${logo
              ? `<img src="${_esc(logo)}" alt="Logo" class="stt-preview-logo">`
              : `<div class="stt-preview-initials">A</div>`
            }
          </div>
          <span class="stt-preview-name">Tên Workspace</span>
        </div>
        <div class="stt-brand-preview-caption">Sidebar · Navbar</div>
      </div>

      <div class="stt-actions" style="margin-top:20px">
        <button class="stt-btn stt-btn--ghost"   id="stt-cancel-brand" type="button">Huỷ</button>
        <button class="stt-btn stt-btn--primary" id="stt-save-brand"   type="button" disabled>
          Lưu thương hiệu
        </button>
      </div>
    </div>`;
}

function _getValues() {
  return {
    logo_url:    (document.getElementById('stt-logo-url')?.value        ?? '').trim(),
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

function _syncPreview() {
  const hex  = document.getElementById('stt-brand-color-hex')?.value ?? '#6366f1';
  const logo = (document.getElementById('stt-logo-url')?.value ?? '').trim();
  const bar  = document.getElementById('stt-preview-bar');
  const wrap = document.getElementById('stt-preview-logo-wrap');

  if (bar && /^#[0-9a-f]{6}$/i.test(hex)) bar.style.background = hex;
  if (wrap) {
    wrap.innerHTML = logo
      ? `<img src="${_esc(logo)}" alt="Logo" class="stt-preview-logo">`
      : `<div class="stt-preview-initials">A</div>`;
  }
}

function _onColorPickerInput() {
  const picker = document.getElementById('stt-brand-color-picker');
  const hexEl  = document.getElementById('stt-brand-color-hex');
  if (picker && hexEl) hexEl.value = picker.value;
  _syncPreview();
  _updateSaveBtn();
}

function _onHexInput() {
  const hexEl  = document.getElementById('stt-brand-color-hex');
  const picker = document.getElementById('stt-brand-color-picker');
  if (hexEl && picker && /^#[0-9a-f]{6}$/i.test(hexEl.value)) {
    picker.value = hexEl.value;
  }
  _syncPreview();
  _updateSaveBtn();
}

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
    _origState = { ..._origState, ...values };
    if (btn) btn.disabled = true;
    applyBrandColor(values.brand_color);
    showToast('Đã lưu thương hiệu workspace', 'success');
  } else {
    if (btn) btn.disabled = false;
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

function _reset() {
  const logoEl    = document.getElementById('stt-logo-url');
  const colorPick = document.getElementById('stt-brand-color-picker');
  const colorHex  = document.getElementById('stt-brand-color-hex');
  const faviconEl = document.getElementById('stt-favicon-url');
  if (logoEl)    logoEl.value    = _origState.logo_url    ?? '';
  if (colorPick) colorPick.value = _origState.brand_color ?? '#6366f1';
  if (colorHex)  colorHex.value  = _origState.brand_color ?? '#6366f1';
  if (faviconEl) faviconEl.value = _origState.favicon_url ?? '';
  _syncPreview();
  _updateSaveBtn();
}

function _wire() {
  document.getElementById('stt-brand-color-picker')?.addEventListener('input', _onColorPickerInput);
  document.getElementById('stt-brand-color-hex')?.addEventListener('input', _onHexInput);
  document.getElementById('stt-logo-url')?.addEventListener('input', () => { _syncPreview(); _updateSaveBtn(); });
  document.getElementById('stt-favicon-url')?.addEventListener('input', _updateSaveBtn);
  document.getElementById('stt-save-brand')?.addEventListener('click', _save);
  document.getElementById('stt-cancel-brand')?.addEventListener('click', _reset);
}

export function loadBranding(wsId, settings) {
  const panel = document.getElementById('stt-panel-branding');
  if (!panel) return;
  _wsId      = wsId;
  _origState = {
    logo_url:    settings.logo_url    ?? '',
    brand_color: settings.brand_color ?? '#6366f1',
    favicon_url: settings.favicon_url ?? '',
  };
  panel.innerHTML = _renderPanel(settings);
  _wire();
}
