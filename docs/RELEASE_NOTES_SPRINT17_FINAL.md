# Release Notes — Sprint 17: Builder Studio

**Branch:** develop-v4-sprint17
**Tag:** Sprint17-Stable
**Date:** 2026-07-01
**Status:** FROZEN ✅

---

## Overview

Sprint 17 delivers Builder Studio — a full admin/authoring module at `/builder-studio` where workspace members can create, edit, publish, and manage custom AI Builders. This is entirely separate from the `/builders` runtime library (unchanged).

---

## Features Delivered

### Module: Builder Studio (`/builder-studio`)

| Feature | Status |
|---|---|
| B1 — Builder List (grid, search, filter by status) | ✅ PASS |
| B2 — Create Builder (form with Knowledge Sources) | ✅ PASS |
| B3 — Edit Builder | ✅ PASS |
| B4 — Publish Builder | ✅ PASS |
| B5 — Unpublish Builder | ✅ PASS |
| B6 — Version History (view + restore) | ✅ PASS |
| B7 — Test Playground (mock + live provider) | ✅ PASS |
| B8 — Soft Delete (`_aifun_soft_delete_builder` RPC) | ✅ PASS |
| B9 — Analytics Panel (event log + summary) | ✅ PASS |

### Database

| Migration | Description | Status |
|---|---|---|
| `migration-013-builder-studio.sql` | Tables: `custom_builders`, `custom_builder_versions`, `custom_builder_analytics` + RLS policies | ✅ Applied |
| `migration-013b-builder-studio-rls-hotfix.sql` | SECURITY DEFINER `_aifun_is_workspace_member` — fixes UPDATE policy nested RLS | ✅ Applied |
| `migration-013c-soft-delete-fn.sql` | SECURITY DEFINER `_aifun_soft_delete_builder` — fixes soft-delete 42501 | ✅ Applied |

### New Files

**Pages**
- `src/pages/builder-studio.js` — main page controller (list/form/versions/playground/analytics views)

**Services**
- `src/services/builder-studio-service.js` — business logic (create, save, publish, test, analytics)
- `src/services/builder-studio-db.js` — Supabase data layer

**Components** (all render-only, lazy-loaded)
- `src/components/bs-builder-card.js`
- `src/components/bs-builder-form.js`
- `src/components/bs-version-history.js`
- `src/components/bs-test-playground.js`
- `src/components/bs-analytics-panel.js`

**Styles**
- `styles/builder-studio.css` — full design token–based CSS, dark mode, responsive breakpoints 640/768/1024px

**Migrations + Rollbacks**
- `docs/migration-013-builder-studio.sql`
- `docs/migration-013-builder-studio-rollback.sql`
- `docs/migration-013b-builder-studio-rls-hotfix.sql`
- `docs/migration-013b-builder-studio-rls-hotfix-rollback.sql`
- `docs/migration-013c-soft-delete-fn.sql`
- `docs/migration-013c-soft-delete-fn-rollback.sql`

### Modified Files

- `src/app/app.js` — added 2 lines: import + router.register for `/builder-studio`
- `src/layouts/sidebar.js` — added Builder Studio nav item
- `v4.html` — added `<link>` for `styles/builder-studio.css`

---

## Bug Fixes

### B8 Soft Delete — 403 / 42501 (3-migration root cause chain)

**Root cause:** PostgreSQL RLS enforces that after any UPDATE, the new row must still satisfy the table's SELECT policy. The SELECT policy on `custom_builders` requires `deleted_at IS NULL`. A soft-delete sets `deleted_at = NOW()`, so the new row fails the visibility check → `42501 new row violates row-level security policy`.

Edit and Publish were unaffected because they never modify `deleted_at`.

**Fix (migration 013c):** `_aifun_soft_delete_builder(p_id UUID)` — SECURITY DEFINER function that:
1. Reads `workspace_id` directly (bypasses SELECT RLS)
2. Calls `_aifun_is_workspace_member()` to authorise the caller
3. Executes `UPDATE ... SET deleted_at = NOW()` outside RLS context

Client calls `supabase.rpc('_aifun_soft_delete_builder', { p_id: id })`.

---

## Architecture Notes

- **Route:** `/builder-studio` registered in `app.js` via `router.register()`
- **Nav:** Builder Studio item added to sidebar with `builders:read` permission gate
- **Lazy loading:** form, version-history, playground, analytics sub-views loaded via dynamic `import()` on first access
- **Generation token (`_gen`):** same pattern as Dashboard Sprint 16A — prevents stale async results from overwriting newer renders
- **Error boundaries:** every async sub-view has `_errorBoundary()` + `_wireRetry()` — no view can crash the whole page
- **Soft delete pattern:** never hard DELETE; `deleted_at` timestamp; `_aifun_soft_delete_builder` RPC bypasses RLS 42501 limitation
- **Version history:** immutable snapshots in `custom_builder_versions`; `saveBuilder()` auto-increments `current_version` and inserts a version row on every save

---

## Frozen Modules (do not modify)

- `/builder-studio` route in `app.js`
- `src/pages/builder-studio.js`
- `src/services/builder-studio-service.js`
- `src/services/builder-studio-db.js`
- `src/components/bs-*.js` (all 5 components)
- `styles/builder-studio.css`
- `docs/migration-013*.sql` (all 6 files — applied, immutable)
- Builder Studio nav item in `sidebar.js`
- Builder Studio CSS link in `v4.html`

---

## What Was NOT Modified

- `index.html` (V2 fallback) — untouched
- `src/pages/dashboard.js` — untouched
- `src/pages/builders.js` (runtime library) — untouched
- Auth, Session, Router, Workspace Engine — untouched
- All Sprint 15 and Sprint 16A frozen modules — untouched

---

*Sprint 17 completed: 2026-07-01*
*All CRUD operations verified end-to-end on production Supabase.*
