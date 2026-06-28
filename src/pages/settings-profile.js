import { userStore }   from '../stores/user-store.js';
import { supabase }    from '../lib/supabase.js';
import { updateProfile } from '../services/user-profile-service.js';
import { showToast }   from '../components/toast.js';

function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _renderSkeleton() {
  return `
    <div class="stt-section" aria-busy="true">
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--medium"></div>
      <div class="stt-skeleton stt-skeleton--line stt-skeleton--short"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
      <div class="stt-skeleton stt-skeleton--input stt-skeleton--full"></div>
    </div>`;
}

function _renderPanel(profile) {
  const avatar = profile.avatarUrl
    ? `<img class="stt-avatar" src="${_esc(profile.avatarUrl)}" alt="Ảnh đại diện">`
    : `<div class="stt-avatar">${_esc(profile.initials ?? '?')}</div>`;

  return `
    <div class="stt-section">
      <div class="stt-section-title">Thông tin cá nhân</div>
      <div class="stt-section-desc">Tên hiển thị và ảnh đại diện trong workspace</div>
      <div class="stt-avatar-row">
        ${avatar}
        <div class="stt-avatar-info">
          <div class="stt-avatar-label">${_esc(profile.fullName ?? '—')}</div>
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
        <button class="stt-btn stt-btn--primary" id="stt-save-profile" type="button">Lưu hồ sơ</button>
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
          <input id="stt-new-pwd" class="stt-input" type="password" placeholder="Tối thiểu 8 ký tự" autocomplete="new-password">
          <div class="stt-field-error" id="stt-pwd-err" role="alert" style="display:none"></div>
        </div>
        <div class="stt-field">
          <label class="stt-label" for="stt-confirm-pwd">Xác nhận mật khẩu mới</label>
          <input id="stt-confirm-pwd" class="stt-input" type="password" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password">
        </div>
        <div class="stt-actions">
          <button class="stt-btn stt-btn--ghost"  id="stt-pwd-cancel" type="button">Huỷ</button>
          <button class="stt-btn stt-btn--primary" id="stt-pwd-save"   type="button">Cập nhật mật khẩu</button>
        </div>
      </div>
    </div>`;
}

let _saving = false;

async function _save() {
  if (_saving) return;
  const nameEl = document.getElementById('stt-profile-name');
  const errEl  = document.getElementById('stt-profile-name-err');
  const name   = (nameEl?.value ?? '').trim();

  if (name.length < 2) {
    if (errEl) { errEl.textContent = 'Tên phải có ít nhất 2 ký tự.'; errEl.style.display = 'block'; }
    nameEl?.classList.add('stt-input--error');
    nameEl?.focus();
    return;
  }
  if (errEl) errEl.style.display = 'none';
  nameEl?.classList.remove('stt-input--error');

  _saving = true;
  const btn = document.getElementById('stt-save-profile');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

  const profile = userStore.getProfile();
  const ok = await updateProfile(profile?.id, { full_name: name, avatar_url: profile?.avatarUrl ?? null });

  _saving = false;
  if (btn) { btn.disabled = false; btn.textContent = 'Lưu hồ sơ'; }
  showToast(ok ? 'Đã cập nhật hồ sơ' : 'Không thể lưu. Vui lòng thử lại.', ok ? 'success' : 'error');
}

async function _changePwd() {
  const newPwd  = document.getElementById('stt-new-pwd')?.value  ?? '';
  const confirm = document.getElementById('stt-confirm-pwd')?.value ?? '';
  const errEl   = document.getElementById('stt-pwd-err');
  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };

  if (newPwd.length < 8) { showErr('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
  if (newPwd !== confirm) { showErr('Mật khẩu xác nhận không khớp.'); return; }
  if (errEl) errEl.style.display = 'none';

  const btn = document.getElementById('stt-pwd-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang cập nhật…'; }

  const { error } = await supabase.auth.updateUser({ password: newPwd });

  if (btn) { btn.disabled = false; btn.textContent = 'Cập nhật mật khẩu'; }

  if (error) {
    showErr('Không thể đổi mật khẩu: ' + error.message);
  } else {
    const form = document.getElementById('stt-pwd-form');
    if (form) form.style.display = 'none';
    document.getElementById('stt-new-pwd').value     = '';
    document.getElementById('stt-confirm-pwd').value = '';
    showToast('Đã đổi mật khẩu thành công', 'success');
  }
}

function _wire() {
  document.getElementById('stt-save-profile')?.addEventListener('click', _save);
  document.getElementById('stt-pwd-toggle')?.addEventListener('click', () => {
    const form = document.getElementById('stt-pwd-form');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('stt-pwd-cancel')?.addEventListener('click', () => {
    const form = document.getElementById('stt-pwd-form');
    if (form) form.style.display = 'none';
    const np = document.getElementById('stt-new-pwd');
    const cp = document.getElementById('stt-confirm-pwd');
    const er = document.getElementById('stt-pwd-err');
    if (np) np.value = '';
    if (cp) cp.value = '';
    if (er) er.style.display = 'none';
  });
  document.getElementById('stt-pwd-save')?.addEventListener('click', _changePwd);
}

export async function loadProfile() {
  const panel = document.getElementById('stt-panel-profile');
  if (!panel) return;
  panel.innerHTML = _renderSkeleton();
  const profile = userStore.getProfile();
  panel.innerHTML = _renderPanel(
    profile ?? { fullName: '—', email: '—', initials: '?', avatarUrl: null }
  );
  _wire();
}
