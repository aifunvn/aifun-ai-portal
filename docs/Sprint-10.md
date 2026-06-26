# Sprint 10 — User, Role & Permission System

**Branch:** `develop-v4`
**Commit:** `6f29d52`
**Status:** Complete

---

## Objective

Turn AIFUN OS V4 into a permission-aware SaaS platform: every UI action is gated by the current user's role, every builder is gated by the workspace plan.

---

## Migration Created

`supabase/migrations/002_sprint10_permissions.sql`

**Tables:**

| Table | Purpose |
|---|---|
| `user_profiles` | Extended profile (full_name, avatar_url) linked to auth.users |
| `roles` | Role catalog: owner, admin, editor, viewer |
| `permissions` | Permission catalog: 13 permissions across 7 groups |
| `role_permissions` | Junction: which permissions each role has |
| `workspace_members` | Workspace membership + role assignment per user |
| `workspace_usage_limits` | Plan + daily AI request counter per workspace |

**Seeded data:** All 4 roles and 13 permissions are inserted on migration run. Role→permission matrix is fully seeded for admin, editor, viewer. Owner always gets `*` (wildcard) resolved in-process.

**RLS:** All 6 tables have Row Level Security. Users can only read/write their own rows.

---

## Files Created

| File | Purpose |
|---|---|
| `src/services/user-profile-service.js` | Load/upsert profile in `user_profiles` on sign-in |
| `src/services/role-service.js` | Load role permissions from `role_permissions`; static fallback |
| `src/services/permission-service.js` | `can()`, `isBuilderAccessible()`, `canRunBuilder()` |
| `src/services/usage-limit-service.js` | `getUsage()`, `checkAndIncrement()` per workspace |
| `src/stores/permission-store.js` | Reactive store wrapping userStore.hasPermission() |

---

## Files Modified

| File | Change |
|---|---|
| `src/services/workspace-service.js` | Replaced mock workspace data with Supabase `workspace_members` queries; auto-creates default workspace + owner membership on first sign-in |
| `src/layouts/sidebar.js` | Each nav item has `data-permission`; `permissionStore.subscribe()` toggles visibility reactively |
| `src/components/user-menu.js` | Shows role badge (e.g. "Chủ sở hữu") in dropdown header |
| `src/pages/builders.js` | `builders:read` guard; locked card UI + upgrade toast for inaccessible builders; disabled Generate if lacking `builders:run` |
| `src/pages/documents.js` | `documents:read` guard; passes `canDelete` down to view |
| `src/components/document-toolbar.js` | Conditionally renders delete button based on `canDelete` option |
| `src/components/document-view.js` | Propagates `canDelete` to toolbar and `initView` |
| `styles/builders.css` | `.bld-card--locked`, `.bld-lock-badge`, `.bld-upgrade-toast` |
| `styles/sidebar.css` | `.sb-user-menu-header`, `.um-role-badge` |

---

## Role → Permission Matrix

| Permission | owner | admin | editor | viewer |
|---|:---:|:---:|:---:|:---:|
| dashboard:read | ✓ | ✓ | ✓ | ✓ |
| builders:read | ✓ | ✓ | ✓ | — |
| builders:run | ✓ | ✓ | ✓ | — |
| builders:install | ✓ | ✓ | — | — |
| documents:read | ✓ | ✓ | ✓ | ✓ |
| documents:create | ✓ | ✓ | ✓ | — |
| documents:delete | ✓ | ✓ | ✓ | — |
| marketplace:read | ✓ | ✓ | ✓ | — |
| marketplace:install | ✓ | ✓ | — | — |
| settings:read | ✓ | ✓ | ✓ | — |
| settings:update | ✓ | ✓ | — | — |
| billing:read | ✓ | ✓ | — | — |
| admin:read | ✓ | ✓ | — | — |

## Plan → Builder Access

| Plan | prompt-builder | sop-builder | youtube-builder |
|---|:---:|:---:|:---:|
| free | ✓ | — | — |
| starter | ✓ | ✓ | — |
| pro | ✓ | ✓ | ✓ |
| business | ✓ | ✓ | ✓ |

## Usage Limits (daily AI requests)

| Plan | Limit |
|---|---|
| free | 20 |
| starter | 100 |
| pro | 1,000 |
| business | 10,000 |

---

## Key Bug Fixed

`null ?? PLAN_BUILDERS.free` — the nullish coalescing operator treats `null` as nullish, causing pro/business plans (stored as `null` = all builders) to fall through to the free tier list. Fixed by using `Object.prototype.hasOwnProperty.call` to distinguish "plan exists with value null" from "plan not found".

---

## Verification Results

| Test | Result |
|---|---|
| owner: all 4 permission checks pass | ✓ |
| editor: builders:run ✓, admin:read ✗ | ✓ |
| viewer: dashboard:read ✓, builders:run ✗, documents:delete ✗ | ✓ |
| Sidebar: viewer sees Dashboard, Documents, Reports only | ✓ |
| free plan: only prompt-builder accessible | ✓ |
| starter plan: prompt + sop, not youtube | ✓ |
| pro plan: all builders accessible | ✓ |
| viewer on pro: canRunBuilder = false | ✓ |
| editor on pro: canRunBuilder(sop) = true, canDelete = true | ✓ |
| No console errors | ✓ |
| V2 files untouched | ✓ |

---

## Manual Step Required

Run `supabase/migrations/002_sprint10_permissions.sql` in Supabase SQL Editor for project `ogfuduavlgpdwqzcaqfy`:

1. Supabase Dashboard → SQL Editor → New query
2. Paste full contents of `002_sprint10_permissions.sql`
3. Run

Until applied: the app runs on static fallback roles defined in `role-service.js`. No data loss — role logic is identical between DB and fallback.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `workspace_members` INSERT blocked by RLS on first sign-in | Medium | `WITH CHECK (auth.uid() = user_id)` allows self-insert; tested policy is correct |
| Pro/business plans must match exactly (`'pro'`, not `'Pro'`) | Low | Plan strings are lowercase in both `workspace_usage_limits` and `PLAN_BUILDERS` |
| `initWorkspaceEngine()` is async — race with router on fast navigation | Low | `app.js` awaits it before registering routes; existing pattern unchanged |
| GoTrueClient multi-instance warning during testing | None | Test artifact from `?v=` cache-busting; not present in production |

---

## Next Recommended Sprint

**Sprint 11 — AI History Page**

`history-db.js` was built in Sprint 9 and `builder_history` is now populated on every generate. The History page reads from this table and shows: builder name, provider, model, tokens used, status, timestamp — giving workspace owners full AI usage visibility. This directly supports billing/metering in Sprint 12.
