// Pin to 2.44.4 — last stable release before iceberg-js was introduced as a
// transitive dep of @supabase/realtime-js@2.108.x. That dep's onboarding.js
// calls getImageMode on an undefined context at module eval time, crashing V4.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm';
import { AUTH_CONFIG } from '../config/auth.js';

export const supabase = createClient(
  AUTH_CONFIG.supabaseUrl,
  AUTH_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: { params: { eventsPerSecond: 2 } },
  }
);
