# Sprint 15 — Organization Center — Release Notes

**Status:** ✅ STABLE — Authentication & Session modules frozen
**Branch:** develop-v4
**Date:** 30/06/2026

---

## Summary

Sprint 15 ships the Organization Center (Members, Teams, Roles, Invitations, Activity, Audit) on top of 4 new database migrations, and fixes a critical boot/session-persistence defect in V4 discovered during E2E testing.

## Database Migrations (009 → 012)

| # | Migration | Tables | Status |
|---|---|---|---|
| 009 | Organizations | `organizations`, `organization_members` | PASS |
| 010 | Teams | `teams`, `team_members` | PASS |
| 011 | Invitations | `invitations` | PASS |
| 012 | Activity + Audit | `activity_logs`, `audit_logs` (partitioned) | PASS |

A post-migration RLS hotfix was required: `organization_members` policies caused infinite recursion (a policy querying its own table). Fixed with 4 `SECURITY DEFINER` helper functions (`_aifun_is_org_member`, `_aifun_is_org_manager`, `_aifun_is_org_admin`, `_aifun_is_team_lead`) that bypass RLS internally, applied across all 7 org-related tables.

## Boot & Session Persistence Fixes

E2E testing (A1/A2) surfaced a chain of boot defects, root-caused and fixed in order:

1. **`@iceberg-js` / `onboarding.js` crash** — a transitive dependency of `@supabase/realtime-js` called `Capacitor.registerPlugin()` at module-eval time, throwing in browsers with no native Capacitor and killing the entire ES module chain before boot could signal ready. Fixed with a `window.Capacitor` no-op stub in `v4.html`, set before any module script loads.
2. **Slow CDN load** — `jsdelivr.net` was intermittently slow enough to exceed the original 2s boot timeout. Switched to `esm.sh` (better APAC performance) and raised the timeout to 15s as a safety margin.
3. **`supabase.auth.getSession()` / `getUser()` hanging indefinitely** — observed hanging forever, every reload, with no thrown error. Root cause not fully isolated (default `navigator.locks` cross-tab coordination is the leading suspect); mitigated structurally rather than chased further:
   - Every SDK auth call is now raced against a 4s timeout (`getSessionSafe()` / `getUserSafe()` in `src/lib/supabase.js`).
   - On timeout, the app falls back to reading the already-persisted token directly from `localStorage` instead of treating a hang as "logged out." **Storage is never cleared on a timeout** — a hung promise is not proof of an invalid session.
   - A no-op `lock` option was added to the Supabase client config to bypass `navigator.locks` entirely (V4 doesn't need cross-tab session coordination yet).
4. **Engine hydrate silently skipped** — `_ensureEngine()` used a boolean guard set *before* the actual async work resolved. If `onAuthStateChange('SIGNED_IN')` and the main boot flow raced to call it, the second caller could return early while the first call was still hung in the background, silently skipping workspace/user/org hydration. Fixed by sharing a single in-flight promise so every caller awaits the same real completion.

## Architecture Notes (carry forward)

- `src/lib/supabase.js` is now the single source of truth for hang-proof auth access. Any new code that needs the current session or user **must** use `getSessionSafe()` / `getUserSafe()` — never call `supabase.auth.getSession()` / `getUser()` directly.
- Boot timeout in `v4.html` is 15s. `window.__aifunBootReady()` is called immediately on `app.js` module execution, independent of how long auth/session hydration takes — the boot spinner only guards against module load failure, not slow auth.

## Out of Scope / Carried Forward

- Root cause of the underlying `getSession()`/`getUser()` hang was not fully isolated (suspected `navigator.locks` or extension interference) — the timeout+fallback mitigation is considered sufficient for Sprint 15 but should be revisited if Supabase SDK is upgraded.
- Full 50-item E2E checklist (W, O, M, T, R, I, AC, AU, REG, X sections) — Authentication (A1–A5) is the only section explicitly verified in this sprint's session. Remaining sections pending separate verification pass.

## Freeze Notice

Authentication & Session modules (`src/lib/supabase.js`, `src/app/app.js` auth/engine logic, `src/services/workspace-service.js`) are **frozen** as of this release. Do not modify without a confirmed bug report — this logic was hardened through extensive live debugging and is sensitive to regression.
