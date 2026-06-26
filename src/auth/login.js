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

        <h1 class="auth-heading">Đăng nhập</h1>
        <p class="auth-subheading">Chào mừng trở lại. Nhập thông tin tài khoản của bạn.</p>

        <div class="auth-error-banner" role="alert" aria-live="polite" hidden></div>

        <form class="auth-form" data-auth-form="login" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              class="auth-input"
              placeholder="ban@congty.com"
              autocomplete="email"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="login-password">Mật khẩu</label>
            <input
              id="login-password"
              name="password"
              type="password"
              class="auth-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <div class="auth-checkbox-row">
            <input id="login-remember" name="remember" type="checkbox" class="auth-checkbox">
            <label for="login-remember" class="auth-checkbox-label">Ghi nhớ đăng nhập</label>
          </div>

          <div class="auth-forgot-row">
            <button type="button" class="auth-link" data-nav="/auth/forgot-password">
              Quên mật khẩu?
            </button>
          </div>

          <button type="submit" class="auth-btn auth-btn--primary">
            Đăng nhập
          </button>
        </form>

        <div class="auth-footer">
          Chưa có tài khoản?
          <button type="button" class="auth-link" data-nav="/auth/register">Đăng ký ngay</button>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const form = document.querySelector('[data-auth-form="login"]');
  const banner = document.querySelector('.auth-error-banner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!validateFields(form, email, password)) return;

    setLoading(form, true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(form, false);

    if (error) {
      showBanner(banner, mapError(error.message));
    }
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.nav));
  });
}

function validateFields(form, email, password) {
  let valid = true;
  const emailErr = form.querySelector('#login-email + .auth-error');
  const passErr = form.querySelector('#login-password + .auth-error');

  if (!email) {
    showFieldError(form.email, emailErr, 'Vui lòng nhập email.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError(form.email, emailErr, 'Email không hợp lệ.');
    valid = false;
  }

  if (!password) {
    showFieldError(form.password, passErr, 'Vui lòng nhập mật khẩu.');
    valid = false;
  }

  return valid;
}

function showFieldError(input, el, msg) {
  input.classList.add('is-error');
  el.textContent = msg;
  el.hidden = false;
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
    ? '<span class="auth-spinner"></span> Đang đăng nhập...'
    : 'Đăng nhập';
}

function mapError(msg) {
  if (msg.includes('Invalid login')) return 'Email hoặc mật khẩu không đúng.';
  if (msg.includes('Email not confirmed')) return 'Vui lòng xác minh email trước khi đăng nhập.';
  return 'Đăng nhập thất bại. Vui lòng thử lại.';
}
