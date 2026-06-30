// esm.sh CDN — faster than jsdelivr.net for Vietnam (better APAC edge nodes).
// Capacitor stub in v4.html handles the iceberg-js / onboarding.js issue so
// version pinning is less critical, but keeping 2.39.3 for stability.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { AUTH_CONFIG } from '../config/auth.js';

// Default browser lock uses navigator.locks to serialize getSession() across
// tabs. That lock can deadlock permanently (observed: getSession() hangs
// forever, every reload, with no error) when another tab/extension holds it
// uncleanly. V4 doesn't need cross-tab session coordination yet, so use a
// no-op lock — getSession() runs immediately instead of waiting on the lock.
async function _noopLock(_name, _acquireTimeout, fn) {
  return fn();
}

export const supabase = createClient(
  AUTH_CONFIG.supabaseUrl,
  AUTH_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: _noopLock,
    },
    realtime: { params: { eventsPerSecond: 2 } },
  }
);

// ── Hang-proof session/user accessors ───────────────────────────────────────
// supabase.auth.getSession()/getUser() can hang indefinitely with no error
// in this environment. Every call site that needs the current user races the
// SDK call against a timeout, falling back to the token supabase-js already
// persisted to localStorage. Reading storage is never destructive — a hung
// SDK call is not proof the session is invalid.
function _withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => {
      console.warn(`[AIFUN] ${label} timed out after ${ms}ms — using cached session`);
      resolve(undefined);
    }, ms)),
  ]);
}

function _readStoredSession() {
  let keys;
  try { keys = Object.keys(localStorage); } catch (_) { return null; }
  const key = keys.find((k) => k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1);
  if (!key) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    const session = parsed?.currentSession ?? parsed; // shape varies by sdk version
    const expiresAt = session?.expires_at;
    if (session?.access_token && (!expiresAt || expiresAt * 1000 > Date.now())) {
      return session;
    }
  } catch (_) { /* corrupt entry — treat as no session */ }
  return null;
}

export async function getSessionSafe() {
  const result = await _withTimeout(supabase.auth.getSession(), 4000, 'getSession()');
  if (result) return result.data?.session ?? null;
  return _readStoredSession();
}

export async function getUserSafe() {
  const result = await _withTimeout(supabase.auth.getUser(), 4000, 'getUser()');
  if (result) return result.data?.user ?? null;
  return _readStoredSession()?.user ?? null;
}
