import { supabase } from '../lib/supabase.js';
import { router } from '../router/router.js';

async function onAuthStateChange(event, session) {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    router.navigate('/dashboard');
  }

  if (event === 'SIGNED_OUT') {
    router.navigate('/auth/login');
  }
}

async function init() {
  supabase.auth.onAuthStateChange(onAuthStateChange);

  const { data: { session } } = await supabase.auth.getSession();

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
