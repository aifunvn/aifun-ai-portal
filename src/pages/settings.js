import { workspaceStore }        from '../stores/workspace-store.js';
import { can }                   from '../services/permission-service.js';
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  getProfile,
  updateProfile,
  sendPasswordReset,
} from '../services/settings-service.js';
import { showToast }             from '../components/toast.js';

// ── Module state ──────────────────────────────────────────────
let _wsId         = null;
let _settings     = null;
let _saving       = false;
let _profile      = null;
let _savingPro    = false;
let _unsub        = null;

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
             <button class="stt-btn stt-btn--primary"  id="stt-save-ws"   type="button">Lưu thay đổi</button>
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
    showToast('Đã lưu cài đặt workspace', 'success');
  } else {
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

// ── Workspace tab: wire + load ────────────────────────────────
function _wireWorkspace() {
  document.getElementById('stt-save-ws')?.addEventListener('click', _saveWorkspace);
  document.getElementById('stt-cancel-ws')?.addEventListener('click', _resetForm);
}

async function _loadWorkspace() {
  const panel = document.getElementById('stt-panel-workspace');
  if (!panel) return;

  panel.innerHTML = _renderSkeleton();
  _settings = await getWorkspaceSettings(_wsId);
  panel.innerHTML = _renderWorkspacePanel(_settings, !_canWrite());
  _wireWorkspace();
}

// ── Profile tab: render ───────────────────────────────────────
function _renderProfilePanel(p) {
  const avatarContent = p.avatarUrl
    ? `<img id="stt-avatar-img" class="stt-avatar" src="${_esc(p.avatarUrl)}" alt="Avatar"
           onerror="this.style.display='none';document.getElementById('stt-avatar-init').style.display='flex'">`
    : '';
  const initStyle = p.avatarUrl ? 'display:none' : '';

  return `
    <div class="stt-section">
      <div class="stt-section-title">Thông tin cá nhân</div>
      <div class="stt-section-desc">Họ tên và ảnh đại diện hiển thị trong workspace</div>

      <div class="stt-avatar-row">
        <div style="position:relative;flex-shrink:0">
          ${avatarContent}
          <div id="stt-avatar-init" class="stt-avatar" style="${initStyle}" aria-hidden="true">
            ${_esc(p.initials)}
          </div>
        </div>
        <div class="stt-avatar-info">
          <div class="stt-avatar-label">${_esc(p.fullName)}</div>
          <div class="stt-avatar-hint">Nhập URL ảnh bên dưới để cập nhật avatar</div>
        </div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-full-name">Họ và tên</label>
        <input
          id="stt-full-name"
          class="stt-input"
          type="text"
          maxlength="80"
          placeholder="VD: Nguyễn Văn A"
          value="${_esc(p.fullName)}"
          autocomplete="name"
        >
        <div class="stt-field-error" id="stt-name-pro-err" role="alert" style="display:none"></div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-avatar-url">URL ảnh đại diện</label>
        <input
          id="stt-avatar-url"
          class="stt-input"
          type="url"
          placeholder="https://..."
          value="${_esc(p.avatarUrl ?? '')}"
          autocomplete="photo"
        >
        <div class="stt-field-error" id="stt-avatar-err" role="alert" style="display:none"></div>
        <div class="stt-field-note">Hỗ trợ JPG, PNG, WebP. Để trống để dùng chữ viết tắt.</div>
      </div>

      <div class="stt-actions">
        <button class="stt-btn stt-btn--ghost"   id="stt-cancel-pro" type="button">Huỷ</button>
        <button class="stt-btn stt-btn--primary"  id="stt-save-pro"   type="button">Lưu Profile</button>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Email đăng nhập</div>
      <div class="stt-section-desc">Email được dùng để xác thực tài khoản</div>
      <div class="stt-field">
        <label class="stt-label" for="stt-email">Email</label>
        <div class="stt-readonly-row" id="stt-email" aria-readonly="true">
          ${_esc(p.email)}
          <span class="stt-readonly-badge">Không đổi được</span>
        </div>
        <div class="stt-field-note">Để thay đổi email, vui lòng liên hệ hỗ trợ.</div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-pwd-row">
        <div class="stt-pwd-info">
          <div class="stt-pwd-label">Mật khẩu</div>
          <div class="stt-pwd-hint">Gửi email đặt lại mật khẩu về địa chỉ đã đăng ký</div>
        </div>
        <button class="stt-btn stt-btn--ghost" id="stt-reset-pwd" type="button">
          Đổi mật khẩu
        </button>
      </div>
    </div>`;
}

// ── Profile tab: avatar live preview ─────────────────────────
function _wireAvatarPreview() {
  const urlInput = document.getElementById('stt-avatar-url');
  if (!urlInput) return;

  urlInput.addEventListener('input', () => {
    const url = urlInput.value.trim();
    const imgEl  = document.getElementById('stt-avatar-img');
    const initEl = document.getElementById('stt-avatar-init');

    if (!url) {
      if (imgEl)  { imgEl.style.display  = 'none'; }
      if (initEl) { initEl.style.display = 'flex'; }
      return;
    }

    if (!imgEl) {
      // Create img element if it doesn't exist yet
      const newImg = document.createElement('img');
      newImg.id        = 'stt-avatar-img';
      newImg.className = 'stt-avatar';
      newImg.alt       = 'Avatar';
      newImg.onerror   = () => {
        newImg.style.display = 'none';
        if (initEl) initEl.style.display = 'flex';
      };
      newImg.src = url;
      initEl?.parentNode?.insertBefore(newImg, initEl);
      if (initEl) initEl.style.display = 'none';
    } else {
      imgEl.src           = url;
      imgEl.style.display = '';
      imgEl.onerror       = () => {
        imgEl.style.display = 'none';
        if (initEl) initEl.style.display = 'flex';
      };
      if (initEl) initEl.style.display = 'none';
    }
  });
}

// ── Profile tab: validate ─────────────────────────────────────
function _validateProfile() {
  const nameVal   = (document.getElementById('stt-full-name')?.value ?? '').trim();
  const avatarVal = (document.getElementById('stt-avatar-url')?.value ?? '').trim();
  const nameErr   = document.getElementById('stt-name-pro-err');
  const avatarErr = document.getElementById('stt-avatar-err');
  const nameInput = document.getElementById('stt-full-name');
  const avatarInput = document.getElementById('stt-avatar-url');

  let valid = true;

  if (nameVal.length < 2) {
    if (nameErr)   { nameErr.textContent = 'Họ tên phải có ít nhất 2 ký tự.'; nameErr.style.display = 'block'; }
    if (nameInput) { nameInput.classList.add('stt-input--error'); nameInput.focus(); }
    valid = false;
  } else {
    if (nameErr)   { nameErr.style.display = 'none'; }
    if (nameInput) { nameInput.classList.remove('stt-input--error'); }
  }

  if (avatarVal && !/^https?:\/\/.+/.test(avatarVal)) {
    if (avatarErr)   { avatarErr.textContent = 'URL không hợp lệ. Phải bắt đầu bằng http:// hoặc https://'; avatarErr.style.display = 'block'; }
    if (avatarInput) { avatarInput.classList.add('stt-input--error'); }
    valid = false;
  } else {
    if (avatarErr)   { avatarErr.style.display = 'none'; }
    if (avatarInput) { avatarInput.classList.remove('stt-input--error'); }
  }

  return valid;
}

// ── Profile tab: save ─────────────────────────────────────────
async function _saveProfile() {
  if (_savingPro) return;
  if (!_validateProfile()) return;

  const fullName  = (document.getElementById('stt-full-name')?.value  ?? '').trim();
  const avatarUrl = (document.getElementById('stt-avatar-url')?.value ?? '').trim();

  _savingPro = true;
  const btn = document.getElementById('stt-save-pro');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

  const ok = await updateProfile({ fullName, avatarUrl: avatarUrl || null });

  _savingPro = false;
  if (btn) { btn.disabled = false; btn.textContent = 'Lưu Profile'; }

  if (ok) {
    _profile = { ..._profile, fullName, avatarUrl: avatarUrl || null };
    showToast('Đã lưu thông tin cá nhân', 'success');
  } else {
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

// ── Profile tab: cancel (reset to saved) ─────────────────────
function _resetProfile() {
  if (!_profile) return;
  const nameEl   = document.getElementById('stt-full-name');
  const avatarEl = document.getElementById('stt-avatar-url');
  if (nameEl)   nameEl.value   = _profile.fullName  ?? '';
  if (avatarEl) avatarEl.value = _profile.avatarUrl ?? '';

  // Reset avatar preview to saved state
  const urlInput = document.getElementById('stt-avatar-url');
  if (urlInput) urlInput.dispatchEvent(new Event('input'));

  const nameErr   = document.getElementById('stt-name-pro-err');
  const avatarErr = document.getElementById('stt-avatar-err');
  const nameInput = document.getElementById('stt-full-name');
  const avatarInput = document.getElementById('stt-avatar-url');
  if (nameErr)    nameErr.style.display   = 'none';
  if (avatarErr)  avatarErr.style.display = 'none';
  if (nameInput)  nameInput.classList.remove('stt-input--error');
  if (avatarInput) avatarInput.classList.remove('stt-input--error');
}

// ── Profile tab: password reset ───────────────────────────────
async function _handlePasswordReset() {
  const btn = document.getElementById('stt-reset-pwd');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi…'; }

  const ok = await sendPasswordReset();

  if (btn) { btn.disabled = false; btn.textContent = 'Đổi mật khẩu'; }

  if (ok) {
    showToast('Email đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư.', 'success');
  } else {
    showToast('Không thể gửi email. Vui lòng thử lại.', 'error');
  }
}

// ── Profile tab: wire + load ──────────────────────────────────
function _wireProfile() {
  document.getElementById('stt-save-pro')?.addEventListener('click', _saveProfile);
  document.getElementById('stt-cancel-pro')?.addEventListener('click', _resetProfile);
  document.getElementById('stt-reset-pwd')?.addEventListener('click', _handlePasswordReset);
  _wireAvatarPreview();
}

async function _loadProfile() {
  const panel = document.getElementById('stt-panel-profile');
  if (!panel) return;
  panel.innerHTML = _renderSkeleton();
  _profile = await getProfile();
  if (!_profile) {
    panel.innerHTML = `<div class="stt-section"><p class="stt-field-note">Không thể tải thông tin cá nhân.</p></div>`;
    return;
  }
  panel.innerHTML = _renderProfilePanel(_profile);
  _wireProfile();
}

// ── Tab switching ─────────────────────────────────────────────
function _switchTab(targetTab) {
  document.querySelectorAll('.stt-tab').forEach((t) => {
    const isActive = t.dataset.tab === targetTab;
    t.classList.toggle('stt-tab--active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll('.stt-panel').forEach((p) => {
    p.classList.toggle('stt-panel--active', p.id === `stt-panel-${targetTab}`);
  });
}

// ── Page shell ────────────────────────────────────────────────
function _renderShell() {
  return `
    <div class="stt-page">
      <div class="stt-page-header">
        <h2 class="stt-page-title">Cài đặt</h2>
        <p class="stt-page-subtitle">Quản lý thông tin và cấu hình workspace của bạn</p>
      </div>

      <div class="stt-tabs" role="tablist" aria-label="Cài đặt">
        <button
          class="stt-tab stt-tab--active"
          role="tab" aria-selected="true"
          aria-controls="stt-panel-workspace"
          id="stt-tab-workspace"
          data-tab="workspace"
          type="button"
        >Workspace</button>
        <button
          class="stt-tab"
          role="tab" aria-selected="false"
          aria-controls="stt-panel-profile"
          id="stt-tab-profile"
          data-tab="profile"
          type="button"
        >Profile</button>
      </div>

      <div id="stt-panel-workspace" class="stt-panel stt-panel--active"
           role="tabpanel" aria-labelledby="stt-tab-workspace"></div>

      <div id="stt-panel-profile" class="stt-panel"
           role="tabpanel" aria-labelledby="stt-tab-profile"></div>
    </div>`;
}

function _wireShell() {
  document.querySelectorAll('.stt-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      _switchTab(tab);
      if (tab === 'profile' && !_profile) _loadProfile();
    });
  });
}

function _mountPage() {
  const root = document.getElementById('stt-root');
  if (!root) return;
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
