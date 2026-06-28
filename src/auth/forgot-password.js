import { supabase } from '../lib/supabase.js';
import { router } from '../router/router.js';
import { AUTH_CONFIG } from '../config/auth.js';

export function render() {
  return `
    <div class="auth-root">
      <div class="auth-card">
        <div class="auth-logo">
          <img src="/logo.svg" alt="AIFUN OS" class="auth-logo-img">
          <span class="auth-logo-name">AIFUN OS</span>
        </div>

        <h1 class="auth-heading">Quên mật khẩu</h1>
        <p class="auth-subheading">Nhập email để nhận link đặt lại mật khẩu.</p>

        <div class="auth-error-banner" role="alert" aria-live="polite" hidden></div>

        <form class="auth-form" data-auth-form="forgot-password" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="forgot-email">Email</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              class="auth-input"
              placeholder="ban@congty.com"
              autocomplete="email"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <button type="submit" class="auth-btn auth-btn--primary">
            Gửi link đặt lại mật khẩu
          </button>

          <button type="button" class="auth-btn auth-btn--ghost" data-nav="/auth/login">
            Quay lại đăng nhập
          </button>
        </form>

        <div data-forgot-success hidden>
          <div class="auth-success-icon" aria-hidden="true">📧</div>
          <p class="auth-success-title">Kiểm tra email của bạn</p>
          <p class="auth-success-body">
            Chúng tôi đã gửi link đặt lại mật khẩu đến <strong data-sent-email></strong>.
            Vui lòng kiểm tra hộp thư đến (và thư mục spam).
          </p>
          <button type="button" class="auth-btn auth-btn--ghost" data-nav="/auth/login">
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const form = document.querySelector('[data-auth-form="forgot-password"]');
  const banner = document.querySelector('.auth-error-banner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = form.email.value.trim();
    const emailErr = form.querySelector('#forgot-email + .auth-error');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.email.classList.add('is-error');
      emailErr.textContent = 'Vui lòng nhập email hợp lệ.';
      emailErr.hidden = false;
      return;
    }

    setLoading(form, true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_CONFIG.redirectBase}/#/auth/reset-password`,
    });

    setLoading(form, false);

    if (error) {
      showBanner(banner, 'Gửi email thất bại. Vui lòng thử lại.');
    } else {
      showSuccess(email);
    }
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.nav));
  });
}

function showSuccess(email) {
  document.querySelector('[data-auth-form="forgot-password"]').hidden = true;
  const success = document.querySelector('[data-forgot-success]');
  success.querySelector('[data-sent-email]').textContent = email;
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
    ? '<span class="auth-spinner"></span> Đang gửi...'
    : 'Gửi link đặt lại mật khẩu';
}
