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
let _wsId      = null;
let _settings  = null;
let _saving    = false;
let _profile   = null;
let _savingPro = false;
let _unsub     = null;

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
  const footer = readOnly
    ? '<p class="stt-field-note" style="margin-top:8px">Chỉ Owner và Admin mới có thể thay đổi cài đặt workspace.</p>'
    : '<div class="stt-actions"><button class="stt-btn stt-btn--ghost" id="stt-cancel-ws" type="button">Huỷ</button><button class="stt-btn stt-btn--primary" id="stt-save-ws" type="button">Lưu thay đổi</button></div>';

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

      ${footer}
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
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }

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
  const avatarHtml = p.avatarUrl
    ? '<img id="stt-avatar-img" class="stt-avatar" alt="Avatar">'
    : '';
  const initHtml = '<div id="stt-avatar-init" class="stt-avatar stt-avatar--initials" aria-hidden="true"></div>';

  return `
    <div class="stt-section">
      <div class="stt-section-title">Thông tin cá nhân</div>
      <div class="stt-section-desc">Tên hiển thị và ảnh đại diện của bạn</div>

      <div class="stt-avatar-row">
        <div class="stt-avatar-wrap" id="stt-avatar-wrap">
          ${avatarHtml}
          ${initHtml}
        </div>
        <div class="stt-avatar-meta">
          <div class="stt-field" style="margin-bottom:8px">
            <label class="stt-label" for="stt-avatar-url">URL ảnh đại diện</label>
            <input
              id="stt-avatar-url"
              class="stt-input"
              type="url"
              placeholder="https://example.com/avatar.png"
              autocomplete="off"
            >
          </div>
          <div class="stt-field-note">Nhập URL ảnh và nhấn Preview để xem trước</div>
          <button class="stt-btn stt-btn--ghost" id="stt-avatar-preview" type="button" style="margin-top:6px">Preview</button>
        </div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-full-name">
          Họ và tên
          <span class="stt-label-hint">bắt buộc</span>
        </label>
        <input
          id="stt-full-name"
          class="stt-input"
          type="text"
          maxlength="80"
          placeholder="Nguyễn Văn A"
          autocomplete="name"
        >
        <div class="stt-field-error" id="stt-name-pro-err" role="alert" style="display:none"></div>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Thông tin tài khoản</div>
      <div class="stt-section-desc">Thông tin xác thực từ Supabase Auth — chỉ đọc</div>

      <div class="stt-readonly-row">
        <span class="stt-label">Email</span>
        <span class="stt-readonly-value" id="stt-email-display"></span>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Bảo mật</div>
      <div class="stt-section-desc">Đặt lại mật khẩu qua email</div>

      <div class="stt-pwd-row">
        <div>
          <div class="stt-label">Mật khẩu</div>
          <div class="stt-field-note">Email đặt lại sẽ được gửi đến địa chỉ đăng ký</div>
        </div>
        <button class="stt-btn stt-btn--ghost" id="stt-reset-pwd" type="button">Đặt lại mật khẩu</button>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-actions">
        <button class="stt-btn stt-btn--ghost" id="stt-cancel-pro" type="button">Huỷ</button>
        <button class="stt-btn stt-btn--primary" id="stt-save-pro" type="button">Lưu thay đổi</button>
      </div>
    </div>`;
}

// ── Profile tab: wire + load ──────────────────────────────────
function _updateAvatarPreview(url) {
  const img    = document.getElementById('stt-avatar-img');
  const initEl = document.getElementById('stt-avatar-init');
  if (!initEl) return;

  if (url) {
    if (!img) {
      const newImg = document.createElement('img');
      newImg.id        = 'stt-avatar-img';
      newImg.className = 'stt-avatar';
      newImg.alt       = 'Avatar';
      newImg.addEventListener('error', () => {
        newImg.style.display = 'none';
        initEl.style.display = 'flex';
      });
      newImg.src = url;
      const wrap = document.getElementById('stt-avatar-wrap');
      if (wrap) wrap.insertBefore(newImg, initEl);
    } else {
      img.addEventListener('error', () => {
        img.style.display = 'none';
        initEl.style.display = 'flex';
      });
      img.src = url;
      img.style.display = '';
      initEl.style.display = 'none';
    }
  } else {
    if (img) img.style.display = 'none';
    initEl.style.display = 'flex';
  }
}

function _wireProfile() {
  // Populate fields from _profile
  const p = _profile;
  if (!p) return;

  const nameEl  = document.getElementById('stt-full-name');
  const urlEl   = document.getElementById('stt-avatar-url');
  const emailEl = document.getElementById('stt-email-display');
  const initEl  = document.getElementById('stt-avatar-init');
  const imgEl   = document.getElementById('stt-avatar-img');

  if (nameEl)  nameEl.value       = p.fullName  ?? '';
  if (urlEl)   urlEl.value        = p.avatarUrl ?? '';
  if (emailEl) emailEl.textContent = p.email    ?? '';

  // Avatar initial display
  if (initEl) initEl.textContent = p.initials ?? '';

  if (p.avatarUrl && imgEl) {
    imgEl.addEventListener('error', () => {
      imgEl.style.display = 'none';
      if (initEl) initEl.style.display = 'flex';
    });
    imgEl.src = p.avatarUrl;
    imgEl.style.display = '';
    if (initEl) initEl.style.display = 'none';
  } else {
    if (imgEl)  imgEl.style.display  = 'none';
    if (initEl) initEl.style.display = 'flex';
  }

  // Preview button
  document.getElementById('stt-avatar-preview')?.addEventListener('click', () => {
    const url = (urlEl?.value ?? '').trim();
    _updateAvatarPreview(url);
  });

  // Reset password button
  document.getElementById('stt-reset-pwd')?.addEventListener('click', async () => {
    const btn = document.getElementById('stt-reset-pwd');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi...'; }
    const ok = await sendPasswordReset();
    if (btn) { btn.disabled = false; btn.textContent = 'Đặt lại mật khẩu'; }
    if (ok) {
      showToast('Email đặt lại mật khẩu đã được gửi', 'success');
    } else {
      showToast('Không thể gửi email. Vui lòng thử lại.', 'error');
    }
  });

  // Cancel
  document.getElementById('stt-cancel-pro')?.addEventListener('click', () => {
    if (nameEl) nameEl.value = _profile?.fullName  ?? '';
    if (urlEl)  urlEl.value  = _profile?.avatarUrl ?? '';
    if (initEl) initEl.textContent = _profile?.initials ?? '';
    if (_profile?.avatarUrl) {
      _updateAvatarPreview(_profile.avatarUrl);
    } else {
      if (imgEl)  imgEl.style.display  = 'none';
      if (initEl) initEl.style.display = 'flex';
    }
  });

  // Save
  document.getElementById('stt-save-pro')?.addEventListener('click', _saveProfile);
}

async function _saveProfile() {
  if (_savingPro) return;

  const nameEl = document.getElementById('stt-full-name');
  const urlEl  = document.getElementById('stt-avatar-url');
  const errEl  = document.getElementById('stt-name-pro-err');

  const fullName  = (nameEl?.value ?? '').trim();
  const avatarUrl = (urlEl?.value  ?? '').trim();

  if (fullName.length < 2) {
    if (errEl) { errEl.textContent = 'Tên phải có ít nhất 2 ký tự.'; errEl.style.display = 'block'; }
    nameEl?.focus();
    return;
  }
  if (errEl) errEl.style.display = 'none';

  _savingPro = true;
  const btn = document.getElementById('stt-save-pro');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }

  const ok = await updateProfile({ fullName, avatarUrl });

  _savingPro = false;
  if (btn) { btn.disabled = false; btn.textContent = 'Lưu thay đổi'; }

  if (ok) {
    _profile = { ..._profile, fullName, avatarUrl: avatarUrl || null, initials: _calcInitials(fullName) };
    showToast('Đã lưu thông tin cá nhân', 'success');
  } else {
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

function _calcInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function _loadProfile() {
  const panel = document.getElementById('stt-panel-profile');
  if (!panel) return;

  panel.innerHTML = _renderSkeleton();
  _profile = await getProfile();
  if (!_profile) {
    panel.innerHTML = '<div class="stt-section"><p class="stt-field-note">Không thể tải thông tin. Vui lòng thử lại.</p></div>';
    return;
  }
  panel.innerHTML = _renderProfilePanel(_profile);
  _wireProfile();
}

// ── Tab switching ─────────────────────────────────────────────
let _profileLoaded = false;

function _switchTab(tabName) {
  document.querySelectorAll('.stt-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('stt-tab--active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.stt-panel').forEach((panel) => {
    panel.classList.toggle('stt-panel--active', panel.id === 'stt-panel-' + tabName);
  });
  if (tabName === 'profile' && !_profileLoaded) {
    _profileLoaded = true;
    _loadProfile();
  }
}

// ── Page shell ────────────────────────────────────────────────
function _renderShell() {
  return `
    <div class="stt-page">
      <div class="stt-page-header">
        <h2 class="stt-page-title">Cai dat</h2>
        <p class="stt-page-subtitle">Quan ly thong tin va cau hinh workspace cua ban</p>
      </div>

      <div class="stt-tabs" role="tablist" aria-label="Cai dat">
        <button
          class="stt-tab stt-tab--active"
          role="tab"
          aria-selected="true"
          aria-controls="stt-panel-workspace"
          id="stt-tab-workspace"
          data-tab="workspace"
          type="button"
        >Workspace</button>
        <button
          class="stt-tab"
          role="tab"
          aria-selected="false"
          aria-controls="stt-panel-profile"
          id="stt-tab-profile"
          data-tab="profile"
          type="button"
        >Ho so ca nhan</button>
      </div>

      <div
        id="stt-panel-workspace"
        class="stt-panel stt-panel--active"
        role="tabpanel"
        aria-labelledby="stt-tab-workspace"
      ></div>

      <div
        id="stt-panel-profile"
        class="stt-panel"
        role="tabpanel"
        aria-labelledby="stt-tab-profile"
      ></div>
    </div>`;
}

function _wireShell() {
  document.querySelectorAll('.stt-tab').forEach((btn) => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
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

// ── Init logic ────────────────────────────────────────────────
function _startSubscription() {
  if (_unsub) { _unsub(); _unsub = null; }

  _unsub = workspaceStore.subscribe(({ workspace }) => {
    const newId = workspace?.id ?? '_default';
    if (newId === _wsId) return;
    _wsId     = newId;
    _settings = null;
    _profile  = null;
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
