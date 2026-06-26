import { supabase } from '../lib/supabase.js';
import { router } from '../router/router.js';
import { render as renderLogin, init as initLogin } from '../auth/login.js';
import { render as renderRegister, init as initRegister } from '../auth/register.js';
import { render as renderForgot, init as initForgot } from '../auth/forgot-password.js';
import { render as renderReset, init as initReset } from '../auth/reset-password.js';
import { render as renderVerify, init as initVerify } from '../auth/verify-email.js';

function mount(html, initFn) {
  const root = document.getElementById('v4-root');
  if (!root) return;
  root.innerHTML = html;
  if (initFn) initFn();
}

async function onAuthStateChange(event, session) {
  if (event === 'PASSWORD_RECOVERY') {
    router.navigate('/auth/reset-password');
    return;
  }

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (router.current()?.startsWith('/auth')) {
      router.navigate('/dashboard');
    }
    return;
  }

  if (event === 'SIGNED_OUT') {
    router.navigate('/auth/login');
  }
}

async function init() {
  supabase.auth.onAuthStateChange(onAuthStateChange);

  const { data: { session } } = await supabase.auth.getSession();

  router.register('/auth/login',            () => mount(renderLogin(),    initLogin));
  router.register('/auth/register',         () => mount(renderRegister(), initRegister));
  router.register('/auth/forgot-password',  () => mount(renderForgot(),   initForgot));
  router.register('/auth/reset-password',   () => mount(renderReset(),    initReset));
  router.register('/auth/verify-email',     () => mount(renderVerify(),   initVerify));

  router.register('/dashboard', () => {
    const root = document.getElementById('v4-root');
    if (root) root.innerHTML = '<p style="padding:2rem">Dashboard — Sprint 2</p>';
  });

  router.register('*', () => {
    if (session) {
      router.navigate('/dashboard');
    } else {
      router.navigate('/auth/login');
    }
  });

  router.init();
}

init();
