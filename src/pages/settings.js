import { workspaceStore }        from '../stores/workspace-store.js';
import { can }                   from '../services/permission-service.js';
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from '../services/settings-service.js';
import { showToast }             from '../components/toast.js';
import { loadProfile }           from './settings-profile.js';

let _wsId     = null;
let _settings = null;
let _saving   = false;
let _unsub    = null;

// ── Utilities ─────────────────────────────────────────────────
function _esc(s) {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function _canWrite() { return can('settings:write'); }

// ── Skeleton ──────────────────────────────────────────────────
function _renderSkeleton() {
  return `
    <div class="stt-section" aria-busy="true" aria-label="Đang tải cài đặt">
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--medium"></div>
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--short"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
    </div>
    <div class="stt-section">
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--medium"></div>
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--short"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
    </div>`;
}

// ── Workspace tab: render ─────────────────────────────────────
function _renderWorkspacePanel(s, readOnly) {
  const ro = readOnly ? 'disabled' : '';
  return `
    <div class="stt-section">
      <div class="stt-section-title">Thông tin Workspace</div>
      <div class="stt-section-desc">Tên và mô tả hiển thị của workspace</div>

      <div class="stt-field">
        <label class="stt-label" for="stt-display-name">
          Tên workspace
          <span class="stt-label-hint">bắt buộc</span>
        </label>
        <input
          id="stt-display-name"
          class="stt-input"
          type="text"
          maxlength="50"
          placeholder="VD: AIFUN Sales Team"
          value="${_esc(s.display_name)}"
          autocomplete="organization"
          ${ro}
        >
        <div
          class="stt-field-error"
          id="stt-name-err"
          role="alert"
          style="display:none"
        ></div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-description">Mô tả</label>
        <textarea
          id="stt-description"
          class="stt-textarea"
          maxlength="200"
          placeholder="Mô tả ngắn về workspace (tối đa 200 ký tự)"
          ${ro}
        >${_esc(s.description)}</textarea>
        <div class="stt-field-note">Tối đa 200 ký tự</div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Cài đặt AI</div>
      <div class="stt-section-desc">Múi giờ và ngôn ngữ mặc định khi tạo tài liệu bằng AI</div>

      <div class="stt-field">
        <label class="stt-label" for="stt-timezone">Múi giờ</label>
        <select id="stt-timezone" class="stt-select" ${ro}>
          <option value="Asia/Ho_Chi_Minh" ${s.timezone === 'Asia/Ho_Chi_Minh' ? 'selected' : ''}>Việt Nam (UTC+7)</option>
          <option value="Asia/Bangkok"     ${s.timezone === 'Asia/Bangkok'     ? 'selected' : ''}>Bangkok (UTC+7)</option>
          <option value="Asia/Singapore"   ${s.timezone === 'Asia/Singapore'   ? 'selected' : ''}>Singapore (UTC+8)</option>
          <option value="Asia/Tokyo"       ${s.timezone === 'Asia/Tokyo'       ? 'selected' : ''}>Tokyo (UTC+9)</option>
          <option value="UTC"              ${s.timezone === 'UTC'              ? 'selected' : ''}>UTC</option>
        </select>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-ai-language">Ngôn ngữ AI</label>
        <select id="stt-ai-language" class="stt-select" ${ro}>
          <option value="vi" ${s.ai_language === 'vi' ? 'selected' : ''}>Tiếng Việt</option>
          <option value="en" ${s.ai_language === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>

      ${readOnly
        ? `<p class="stt-field-note" style="margin-top:8px">Chỉ Owner và Admin mới có thể thay đổi cài đặt workspace.</p>`
        : `<div class="stt-actions">
             <button class="stt-btn stt-btn--ghost"    id="stt-cancel-ws" type="button">Huỷ</button>
             <button class="stt-btn stt-btn--primary"  id="stt-save-ws"   type="button" disabled>Lưu thay đổi</button>
           </div>`
      }
    </div>`;
}

// ── Workspace tab: form helpers ───────────────────────────────
function _getFormValues() {
  return {
    display_name: (document.getElementById('stt-display-name')?.value ?? '').trim(),
    description:  (document.getElementById('stt-description')?.value  ?? '').trim(),
    timezone:     document.getElementById('stt-timezone')?.value     ?? 'Asia/Ho_Chi_Minh',
    ai_language:  document.getElementById('stt-ai-language')?.value  ?? 'vi',
  };
}

function _isDirty() {
  if (!_settings) return false;
  const v = _getFormValues();
  return v.display_name !== (_settings.display_name ?? '')
    || v.description  !== (_settings.description  ?? '')
    || v.timezone     !== (_settings.timezone     ?? 'Asia/Ho_Chi_Minh')
    || v.ai_language  !== (_settings.ai_language  ?? 'vi');
}

function _updateSaveBtn() {
  const btn = document.getElementById('stt-save-ws');
  if (btn) btn.disabled = !_isDirty();
}

function _validate(values) {
  const errEl   = document.getElementById('stt-name-err');
  const inputEl = document.getElementById('stt-display-name');
  if (!errEl || !inputEl) return true;

  if (values.display_name.length < 2) {
    errEl.textContent = 'Tên workspace phải có ít nhất 2 ký tự.';
    errEl.style.display = 'block';
    inputEl.classList.add('stt-input--error');
    inputEl.focus();
    return false;
  }

  errEl.style.display = 'none';
  inputEl.classList.remove('stt-input--error');
  return true;
}

function _resetForm() {
  if (!_settings) return;
  const els = {
    'stt-display-name': _settings.display_name,
    'stt-description':  _settings.description,
    'stt-timezone':     _settings.timezone,
    'stt-ai-language':  _settings.ai_language,
  };
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  const errEl   = document.getElementById('stt-name-err');
  const inputEl = document.getElementById('stt-display-name');
  if (errEl)   errEl.style.display = 'none';
  if (inputEl) inputEl.classList.remove('stt-input--error');
  _updateSaveBtn();
}

async function _saveWorkspace() {
  if (_saving) return;
  const values = _getFormValues();
  if (!_validate(values)) return;

  _saving = true;
  const btn = document.getElementById('stt-save-ws');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

  const ok = await updateWorkspaceSettings(_wsId, values);

  _saving = false;
  if (btn) { btn.disabled = false; btn.textContent = 'Lưu thay đổi'; }

  if (ok) {
    _settings = { ..._settings, ...values };
    _updateSaveBtn();
    showToast('Đã lưu cài đặt workspace', 'success');
  } else {
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

function _wireWorkspace() {
  document.getElementById('stt-save-ws')?.addEventListener('click', _saveWorkspace);
  document.getElementById('stt-cancel-ws')?.addEventListener('click', _resetForm);
  ['stt-display-name', 'stt-description'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', _updateSaveBtn);
  });
  ['stt-timezone', 'stt-ai-language'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', _updateSaveBtn);
  });
}

async function _loadWorkspace() {
  const panel = document.getElementById('stt-panel-workspace');
  if (!panel) return;

  panel.innerHTML = _renderSkeleton();
  _settings = await getWorkspaceSettings(_wsId);

  // workspace_settings row may not exist yet — seed display_name from store
  if (!_settings.display_name) {
    const ws = workspaceStore.getWorkspace();
    if (ws?.name) _settings = { ..._settings, display_name: ws.name };
  }

  panel.innerHTML = _renderWorkspacePanel(_settings, !_canWrite());
  _wireWorkspace();
}

// ── Tab switching ─────────────────────────────────────────────
let _profileLoaded = false;

function _switchTab(tabName) {
  document.querySelectorAll('.stt-tab').forEach(function(btn) {
    var active = btn.dataset.tab === tabName;
    btn.classList.toggle('stt-tab--active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.stt-panel').forEach(function(panel) {
    panel.classList.toggle('stt-panel--active', panel.id === 'stt-panel-' + tabName);
  });
  if (tabName === 'profile' && !_profileLoaded) {
    _profileLoaded = true;
    loadProfile();
  }
}

// ── Page shell ────────────────────────────────────────────────
function _renderShell() {
  return '<div class="stt-page">'
    + '<div class="stt-page-header">'
    + '<h2 class="stt-page-title">Cài đặt</h2>'
    + '<p class="stt-page-subtitle">Quản lý cấu hình workspace và hồ sơ cá nhân</p>'
    + '</div>'
    + '<div class="stt-tabs" role="tablist">'
    + '<button class="stt-tab stt-tab--active" role="tab" aria-selected="true" aria-controls="stt-panel-workspace" id="stt-tab-workspace" data-tab="workspace" type="button">Workspace</button>'
    + '<button class="stt-tab" role="tab" aria-selected="false" aria-controls="stt-panel-profile" id="stt-tab-profile" data-tab="profile" type="button">Hồ sơ</button>'
    + '</div>'
    + '<div id="stt-panel-workspace" class="stt-panel stt-panel--active" role="tabpanel" aria-labelledby="stt-tab-workspace"></div>'
    + '<div id="stt-panel-profile" class="stt-panel" role="tabpanel" aria-labelledby="stt-tab-profile"></div>'
    + '</div>';
}

function _wireShell() {
  document.querySelectorAll('.stt-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { _switchTab(btn.dataset.tab); });
  });
}

function _mountPage() {
  const root = document.getElementById('stt-root');
  if (!root) return;
  _profileLoaded = false;
  root.innerHTML = _renderShell();
  _wireShell();
  _loadWorkspace();
}

// ── Init logic (shared by render auto-init and external callers) ──
function _startSubscription() {
  if (_unsub) { _unsub(); _unsub = null; }

  _unsub = workspaceStore.subscribe(({ workspace }) => {
    const newId = workspace?.id ?? '_default';
    if (newId === _wsId) return;
    _wsId     = newId;
    _settings = null;
    _mountPage();
  });
}

// ── Public exports ────────────────────────────────────────────
// app.js only imports render() for /settings and does not call init().
// queueMicrotask ensures _startSubscription runs AFTER mountPage sets innerHTML,
// so #stt-root exists in the DOM when _mountPage() looks for it.
export function render() {
  queueMicrotask(_startSubscription);
  return `<div id="stt-root"></div>`;
}

export function init() {
  _startSubscription();
}
