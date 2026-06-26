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

        <h1 class="auth-heading">Tạo tài khoản</h1>
        <p class="auth-subheading">Bắt đầu miễn phí. Không cần thẻ tín dụng.</p>

        <div class="auth-error-banner" role="alert" aria-live="polite" hidden></div>

        <form class="auth-form" data-auth-form="register" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="reg-name">Họ và tên</label>
            <input
              id="reg-name"
              name="fullName"
              type="text"
              class="auth-input"
              placeholder="Nguyễn Văn A"
              autocomplete="name"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="reg-email">Email</label>
            <input
              id="reg-email"
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
            <label class="auth-label" for="reg-password">Mật khẩu</label>
            <input
              id="reg-password"
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
            <label class="auth-label" for="reg-confirm">Xác nhận mật khẩu</label>
            <input
              id="reg-confirm"
              name="confirm"
              type="password"
              class="auth-input"
              placeholder="Nhập lại mật khẩu"
              autocomplete="new-password"
              required
            >
            <span class="auth-error" role="alert" aria-live="polite" hidden></span>
          </div>

          <button type="submit" class="auth-btn auth-btn--primary">
            Tạo tài khoản
          </button>
        </form>

        <div class="auth-footer">
          Đã có tài khoản?
          <button type="button" class="auth-link" data-nav="/auth/login">Đăng nhập</button>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const form = document.querySelector('[data-auth-form="register"]');
  const banner = document.querySelector('.auth-error-banner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirm.value;

    if (!validateFields(form, fullName, email, password, confirm)) return;

    setLoading(form, true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(form, false);

    if (error) {
      showBanner(banner, mapError(error.message));
    } else {
      router.navigate('/auth/verify-email');
    }
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.nav));
  });
}

function validateFields(form, fullName, email, password, confirm) {
  let valid = true;
  const nameErr  = form.querySelector('#reg-name + .auth-error');
  const emailErr = form.querySelector('#reg-email + .auth-error');
  const passErr  = form.querySelector('#reg-password + .auth-error');
  const confErr  = form.querySelector('#reg-confirm + .auth-error');

  if (!fullName) {
    showFieldError(form.fullName, nameErr, 'Vui lòng nhập họ và tên.');
    valid = false;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError(form.email, emailErr, 'Vui lòng nhập email hợp lệ.');
    valid = false;
  }

  if (password.length < 8) {
    showFieldError(form.password, passErr, 'Mật khẩu tối thiểu 8 ký tự.');
    valid = false;
  }

  if (password !== confirm) {
    showFieldError(form.confirm, confErr, 'Mật khẩu xác nhận không khớp.');
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
    ? '<span class="auth-spinner"></span> Đang tạo tài khoản...'
    : 'Tạo tài khoản';
}

function mapError(msg) {
  if (msg.includes('already registered')) return 'Email này đã được đăng ký.';
  if (msg.includes('Password')) return 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
  return 'Đăng ký thất bại. Vui lòng thử lại.';
}
