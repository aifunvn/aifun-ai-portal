import { supabase } from '../lib/supabase.js';
import { router } from '../router/router.js';

export function render() {
  return `
    <div class="auth-root">
      <div class="auth-card">
        <div class="auth-logo">
          <img src="/logo.svg" alt="AIFUN OS" class="auth-logo-img">
          <span class="auth-logo-name">AIFUN OS</span>
        </div>

        <h1 class="auth-heading">Đặt lại mật khẩu</h1>
        <p class="auth-subheading">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <div class="auth-error-banner" role="alert" aria-live="polite" hidden></div>

        <form class="auth-form" data-auth-form="reset-password" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="reset-password">Mật khẩu mới</label>
            <input
              id="reset-password"
              name="password"
              type="password"
              class="auth-input"
              placeholder="Tối thiểu 8 ký tự"
              autocomplete="new-password"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="reset-confirm">Xác nhận mật khẩu mới</label>
            <input
              id="reset-confirm"
              name="confirm"
              type="password"
              class="auth-input"
              placeholder="Nhập lại mật khẩu mới"
              autocomplete="new-password"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <button type="submit" class="auth-btn auth-btn--primary">
            Đặt lại mật khẩu
          </button>
        </form>

        <div data-reset-success hidden>
          <div class="auth-success-icon" aria-hidden="true">✅</div>
          <p class="auth-success-title">Mật khẩu đã được cập nhật</p>
          <p class="auth-success-body">Mật khẩu mới của bạn đã được lưu. Bạn có thể đăng nhập ngay bây giờ.</p>
          <button type="button" class="auth-btn auth-btn--primary" data-nav="/auth/login">
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const form = document.querySelector('[data-auth-form="reset-password"]');
  const banner = document.querySelector('.auth-error-banner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const password = form.password.value;
    const confirm = form.confirm.value;
    const passErr = form.querySelector('#reset-password + .auth-error');
    const confErr = form.querySelector('#reset-confirm + .auth-error');

    let valid = true;

    if (password.length < 8) {
      form.password.classList.add('is-error');
      passErr.textContent = 'Mật khẩu tối thiểu 8 ký tự.';
      passErr.hidden = false;
      valid = false;
    }

    if (password !== confirm) {
      form.confirm.classList.add('is-error');
      confErr.textContent = 'Mật khẩu xác nhận không khớp.';
      confErr.hidden = false;
      valid = false;
    }

    if (!valid) return;

    setLoading(form, true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(form, false);

    if (error) {
      showBanner(banner, 'Cập nhật mật khẩu thất bại. Vui lòng thử lại.');
    } else {
      showSuccess();
    }
  });
}

function showSuccess() {
  document.querySelector('[data-auth-form="reset-password"]').hidden = true;
  const success = document.querySelector('[data-reset-success]');
  success.hidden = false;
  success.querySelector('[data-nav]').addEventListener('click', () => router.navigate('/auth/login'));
}

function showBanner(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function clearErrors() {
  document.querySelectorAll('.auth-input.is-error').forEach((i) => i.classList.remove('is-error'));
  document.querySelectorAll('.auth-error').forEach((e) => { e.hidden = true; e.textContent = ''; });
  const banner = document.querySelector('.auth-error-banner');
  if (banner) { banner.hidden = true; banner.textContent = ''; }
}

function setLoading(form, loading) {
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="auth-spinner"></span> Đang cập nhật...'
    : 'Đặt lại mật khẩu';
}
