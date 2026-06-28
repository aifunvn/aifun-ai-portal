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

        <div class="auth-success-icon" aria-hidden="true">📬</div>
        <p class="auth-success-title">Xác minh email của bạn</p>
        <p class="auth-success-body">
          Chúng tôi đã gửi link xác minh đến email của bạn.
          Vui lòng kiểm tra hộp thư đến và nhấn vào link để kích hoạt tài khoản.
        </p>

        <div class="auth-info-box" aria-live="polite">
          Không nhận được email? Kiểm tra thư mục <strong>Spam</strong> hoặc gửi lại bên dưới.
        </div>

        <div class="auth-error-banner" role="alert" aria-live="polite" hidden></div>

        <button type="button" class="auth-btn auth-btn--primary" data-action="resend">
          Gửi lại email xác minh
        </button>

        <button type="button" class="auth-btn auth-btn--ghost" data-nav="/auth/login">
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  `;
}

export function init() {
  const banner = document.querySelector('.auth-error-banner');

  document.querySelector('[data-action="resend"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.navigate('/auth/login');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="auth-spinner"></span> Đang gửi...';

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });

    btn.disabled = false;
    btn.textContent = 'Gửi lại email xác minh';

    if (error) {
      banner.textContent = 'Gửi lại thất bại. Vui lòng thử lại sau.';
      banner.hidden = false;
    } else {
      banner.textContent = '';
      banner.hidden = true;
      const info = document.querySelector('.auth-info-box');
      info.textContent = 'Email xác minh đã được gửi lại. Vui lòng kiểm tra hộp thư.';
    }
  });

  document.querySelector('[data-nav]').addEventListener('click', () => router.navigate('/auth/login'));
}
