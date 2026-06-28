import { userStore }                        from '../stores/user-store.js';
import { supabase }                          from '../lib/supabase.js';
import { updateProfile }                     from '../services/settings-service.js';
import { showToast }                         from '../components/toast.js';

// ─── helpers ──────────────────────────────────────────────────
function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _friendlyPwdError(msg) {
  if (!msg) return 'Không thể đổi mật khẩu. Vui lòng thử lại sau.';
  const m = msg.toLowerCase();
  if (m.includes('at least 6') || m.includes('at least 8'))
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (m.includes('different from') || m.includes('same as'))
    return 'Mật khẩu mới phải khác mật khẩu cũ.';
  if (m.includes('not confirmed'))
    return 'Vui lòng xác nhận email trước khi đổi mật khẩu.';
  if (m.includes('session') || m.includes('not authenticated'))
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể đổi mật khẩu. Vui lòng thử lại sau.';
}

// ─── skeleton ─────────────────────────────────────────────────
function _renderSkeleton() {
  return `
    <div class="stt-section" aria-busy="true" aria-label="Đang tải hồ sơ">
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--medium"></div>
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--short"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
    </div>`;
}

// ─── render ───────────────────────────────────────────────────
function _renderPanel(profile) {
  const avatar = profile.avatarUrl
    ? `<img class="stt-avatar" src="${_esc(profile.avatarUrl)}" alt="Ảnh đại diện" id="stt-avatar-img">`
    : `<div class="stt-avatar" id="stt-avatar-initials">${_esc(profile.initials ?? '?')}</div>`;

  return `
    <div class="stt-section">
      <div class="stt-section-title">Thông tin cá nhân</div>
      <div class="stt-section-desc">Tên hiển thị và ảnh đại diện trong workspace</div>

      <div class="stt-avatar-row">
        ${avatar}
        <div class="stt-avatar-info">
          <div class="stt-avatar-label" id="stt-avatar-name">${_esc(profile.fullName ?? '—')}</div>
          <div class="stt-avatar-hint">Upload ảnh đại diện sẽ ra mắt trong phiên bản tiếp theo</div>
        </div>
      </div>

      <div class="stt-field">
        <label class="stt-label" for="stt-profile-name">
          Tên hiển thị <span class="stt-label-hint">bắt buộc</span>
        </label>
        <input id="stt-profile-name" class="stt-input" type="text" maxlength="80"
          value="${_esc(profile.fullName ?? '')}" autocomplete="name">
        <div class="stt-field-error" id="stt-profile-name-err" role="alert" style="display:none"></div>
      </div>

      <div class="stt-field">
        <label class="stt-label">Email</label>
        <div class="stt-readonly-row">
          ${_esc(profile.email ?? '—')}
          <span class="stt-readonly-badge">Chỉ đọc</span>
        </div>
        <div class="stt-field-note">Email được quản lý bởi hệ thống xác thực, không thể thay đổi tại đây.</div>
      </div>

      <div class="stt-actions">
        <button class="stt-btn stt-btn--primary" id="stt-save-profile" type="button" disabled>
          Lưu hồ sơ
        </button>
      </div>
    </div>

    <div class="stt-section">
      <div class="stt-section-title">Bảo mật</div>
      <div class="stt-section-desc">Quản lý mật khẩu tài khoản</div>

      <div class="stt-pwd-row">
        <div class="stt-pwd-info">
          <div class="stt-pwd-label">Mật khẩu</div>
          <div class="stt-pwd-hint">Đặt mật khẩu mạnh để bảo vệ tài khoản</div>
        </div>
        <button class="stt-btn stt-btn--ghost" id="stt-pwd-toggle" type="button">Đổi mật khẩu</button>
      </div>

      <div id="stt-pwd-form" style="display:none;margin-top:16px">
        <div class="stt-field">
          <label class="stt-label" for="stt-new-pwd">Mật khẩu mới</label>
          <input id="stt-new-pwd" class="stt-input" type="password"
            placeholder="Tối thiểu 8 ký tự" autocomplete="new-password">
          <div class="stt-field-error" id="stt-pwd-err" role="alert" style="display:none"></div>
        </div>
        <div class="stt-field">
          <label class="stt-label" for="stt-confirm-pwd">Xác nhận mật khẩu mới</label>
          <input id="stt-confirm-pwd" class="stt-input" type="password"
            placeholder="Nhập lại mật khẩu mới" autocomplete="new-password">
        </div>
        <div class="stt-actions">
          <button class="stt-btn stt-btn--ghost"  id="stt-pwd-cancel" type="button">Huỷ</button>
          <button class="stt-btn stt-btn--primary" id="stt-pwd-save"   type="button" disabled>
            Cập nhật mật khẩu
          </button>
        </div>
      </div>
    </div>`;
}

// ─── state ────────────────────────────────────────────────────
let _saving    = false;
let _pwdSaving = false;
let _origName  = '';

// ─── realtime helpers ──────────────────────────────────────────
function _onNameInput() {
  const el  = document.getElementById('stt-profile-name');
  const err = document.getElementById('stt-profile-name-err');
  const btn = document.getElementById('stt-save-profile');
  const val = (el?.value ?? '').trim();

  const valid   = val.length >= 2;
  const changed = val !== _origName;

  if (!valid && val.length > 0) {
    if (err) { err.textContent = 'Tên phải có ít nhất 2 ký tự.'; err.style.display = 'block'; }
    el?.classList.add('stt-input--error');
  } else {
    if (err) err.style.display = 'none';
    el?.classList.remove('stt-input--error');
  }

  if (btn) btn.disabled = !valid || !changed;
}

function _onPwdInput() {
  const newPwd  = document.getElementById('stt-new-pwd')?.value  ?? '';
  const confirm = document.getElementById('stt-confirm-pwd')?.value ?? '';
  const err     = document.getElementById('stt-pwd-err');
  const btn     = document.getElementById('stt-pwd-save');

  if (err) err.style.display = 'none';

  const newOk    = newPwd.length >= 8;
  const matchOk  = newPwd === confirm;
  const bothFill = confirm.length > 0;

  if (bothFill && !matchOk) {
    if (err) { err.textContent = 'Mật khẩu xác nhận không khớp.'; err.style.display = 'block'; }
  }

  if (btn) btn.disabled = !(newOk && matchOk && bothFill);
}

// ─── actions ──────────────────────────────────────────────────
async function _save() {
  if (_saving) return;
  const el  = document.getElementById('stt-profile-name');
  const err = document.getElementById('stt-profile-name-err');
  const name = (el?.value ?? '').trim();

  if (name.length < 2) {
    if (err) { err.textContent = 'Tên phải có ít nhất 2 ký tự.'; err.style.display = 'block'; }
    el?.classList.add('stt-input--error');
    el?.focus();
    return;
  }

  _saving = true;
  const btn = document.getElementById('stt-save-profile');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

  const profile = userStore.getProfile();
  const ok = await updateProfile({ fullName: name, avatarUrl: profile?.avatarUrl ?? null });

  _saving = false;
  if (btn) { btn.textContent = 'Lưu hồ sơ'; }

  if (ok) {
    _origName = name;
    btn.disabled = true;
    const updated = userStore.getProfile();
    const avatarName = document.getElementById('stt-avatar-name');
    const avatarInit = document.getElementById('stt-avatar-initials');
    if (avatarName) avatarName.textContent = updated?.fullName ?? name;
    if (avatarInit) avatarInit.textContent = updated?.initials ?? name.slice(0, 2).toUpperCase();
    showToast('Đã cập nhật hồ sơ', 'success');
  } else {
    if (btn) btn.disabled = false;
    showToast('Không thể lưu. Vui lòng thử lại.', 'error');
  }
}

async function _changePwd() {
  if (_pwdSaving) return;
  const newPwd  = document.getElementById('stt-new-pwd')?.value  ?? '';
  const confirm = document.getElementById('stt-confirm-pwd')?.value ?? '';
  const err     = document.getElementById('stt-pwd-err');
  const showErr = (msg) => { if (err) { err.textContent = msg; err.style.display = 'block'; } };

  if (newPwd.length < 8)  { showErr('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
  if (newPwd !== confirm)  { showErr('Mật khẩu xác nhận không khớp.'); return; }
  if (err) err.style.display = 'none';

  _pwdSaving = true;
  const btn = document.getElementById('stt-pwd-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang cập nhật…'; }

  const { error } = await supabase.auth.updateUser({ password: newPwd });

  _pwdSaving = false;
  if (btn) { btn.textContent = 'Cập nhật mật khẩu'; }

  if (error) {
    if (btn) btn.disabled = false;
    showErr(_friendlyPwdError(error.message));
  } else {
    const form = document.getElementById('stt-pwd-form');
    if (form) form.style.display = 'none';
    document.getElementById('stt-new-pwd').value     = '';
    document.getElementById('stt-confirm-pwd').value = '';
    if (err) err.style.display = 'none';
    showToast('Đã đổi mật khẩu thành công', 'success');
  }
}

function _resetPwdForm() {
  const form = document.getElementById('stt-pwd-form');
  if (form) form.style.display = 'none';
  const np = document.getElementById('stt-new-pwd');
  const cp = document.getElementById('stt-confirm-pwd');
  const er = document.getElementById('stt-pwd-err');
  const btn = document.getElementById('stt-pwd-save');
  if (np)  np.value = '';
  if (cp)  cp.value = '';
  if (er)  er.style.display = 'none';
  if (btn) btn.disabled = true;
}

// ─── wire ─────────────────────────────────────────────────────
function _wire() {
  document.getElementById('stt-profile-name')?.addEventListener('input', _onNameInput);
  document.getElementById('stt-new-pwd')?.addEventListener('input', _onPwdInput);
  document.getElementById('stt-confirm-pwd')?.addEventListener('input', _onPwdInput);
  document.getElementById('stt-save-profile')?.addEventListener('click', _save);
  document.getElementById('stt-pwd-toggle')?.addEventListener('click', () => {
    const form = document.getElementById('stt-pwd-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('stt-pwd-cancel')?.addEventListener('click', _resetPwdForm);
  document.getElementById('stt-pwd-save')?.addEventListener('click', _changePwd);
}

// ─── public ───────────────────────────────────────────────────
export async function loadProfile() {
  const panel = document.getElementById('stt-panel-profile');
  if (!panel) return;
  panel.innerHTML = _renderSkeleton();
  const profile = userStore.getProfile();
  const p = profile ?? { fullName: '—', email: '—', initials: '?', avatarUrl: null };
  _origName = p.fullName ?? '';
  panel.innerHTML = _renderPanel(p);
  _wire();
}
