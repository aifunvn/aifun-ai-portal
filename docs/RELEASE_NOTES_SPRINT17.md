# Sprint 17 — Builder Studio — Release Notes

**Status:** Ready for migration + manual QA
**Branch:** develop-v4-sprint17
**Base:** Sprint16A-Stable
**Date:** 30/06/2026

---

## Summary

Sprint 17 ships **Builder Studio**, a new production-ready module for authoring custom AI Builders, at a dedicated route `/builder-studio`. The existing `/builders` runtime page (browse + run AI Builders from the static registry) is untouched except for a new sidebar navigation link.

## Architecture Decision

Builder Studio is a **separate module** from `/builders`, not an extension of it:

| | `/builders` (existing) | `/builder-studio` (new) |
|---|---|---|
| Purpose | Browse and run builders | Create, edit, test, publish builders |
| Data source | Static JSON registry (`src/builders/registry.js`) | Supabase (`custom_builders` + related tables) |
| Risk to existing flow | None — file untouched | New, isolated |

This kept the change additive and zero-risk to the stable runtime page, at the cost of the two builder catalogs (static registry vs. custom_builders) being separate for now — a deliberate tradeoff to avoid touching working code in this sprint.

## Database — Migration 013 (not yet applied — run manually per project convention)

`docs/migration-013-builder-studio.sql` adds three tables:

| Table | Purpose |
|---|---|
| `custom_builders` | One row per authored builder: prompt, model config, knowledge sources, draft/published status, soft delete |
| `custom_builder_versions` | Immutable snapshot written on every save — powers Version History |
| `custom_builder_analytics` | Append-only event log (test runs / usage) — powers the Analytics panel |

RLS: any active member of the row's `workspace_id` (via `workspace_members`) can read/write — consistent with the rest of the app's workspace-scoped tables. No new roles introduced.

**This migration has not been run.** Per project convention, run it manually in Supabase and verify before merging.

## Features Delivered

| # | Feature | Implementation |
|---|---|---|
| 1 | Builder List | Grid view, `bs-builder-card.js`, generation-token guarded against stale reloads |
| 2 | Search | Debounced (300ms) name search |
| 3 | Filters | Status filter (All / Draft / Published) |
| 4 | Create Builder | Lazy-loaded form (`bs-builder-form.js`), writes builder + v1 snapshot |
| 5 | Edit Builder | Same form pre-filled; save writes a new version snapshot and bumps `current_version` |
| 6 | Delete Builder | Soft delete (`deleted_at`), confirm dialog |
| 7 | Test Chat | "Test Playground" — runs the draft prompt through the real provider pipeline (`runProvider`), no document is persisted, only an analytics event |
| 8 | Publish/Draft | One-click status toggle on each card |
| 9 | Version History | Lazy-loaded list of immutable snapshots with restore-to-version |
| 10 | Analytics | Lazy-loaded summary (run count, success rate, total tokens, avg response time) + recent event table |
| 11 | Responsive | Breakpoints at 1024px / 768px / 640px; verified at desktop/tablet/mobile |
| 12 | Lazy Loading | Form, Version History, Test Playground, and Analytics components are all `import()`-ed on demand, not bundled into the initial list view |
| 13 | Error Boundaries | Every async view (list, form, versions, playground, analytics) has its own try/catch with an inline "Thử lại" retry UI — one failing view never crashes the page |
| 14 | Modular Components | 5 new standalone components (`bs-builder-card`, `bs-builder-form`, `bs-version-history`, `bs-test-playground`, `bs-analytics-panel`) + 2 service layers (db + business logic), following the existing `src/components` / `src/services` split |

## Files Added

```
docs/migration-013-builder-studio.sql
src/services/builder-studio-db.js
src/services/builder-studio-service.js
src/components/bs-builder-card.js
src/components/bs-builder-form.js
src/components/bs-version-history.js
src/components/bs-test-playground.js
src/components/bs-analytics-panel.js
src/pages/builder-studio.js
styles/builder-studio.css
```

## Files Modified (minimal, additive only)

| File | Change |
|---|---|
| `src/app/app.js` | +2 lines: import + `router.register('/builder-studio', ...)`, same pattern as every other route |
| `src/layouts/sidebar.js` | +1 nav item for Builder Studio |
| `v4.html` | +1 stylesheet link |

**Zero diff** against `Sprint16A-Stable` for: `src/lib/supabase.js`, `src/services/workspace-service.js`, `src/router/`, `src/pages/dashboard.js`, `src/services/dashboard-service.js`, `styles/dashboard.css`, `src/pages/builders.js` — Auth, Session, Router internals, Workspace Engine, Dashboard, and the existing Builders runtime page are all frozen and untouched.

## Verification Done This Session

- All new modules (page, 5 components, 2 services) load without syntax errors
- Form renders correctly with all fields (Prompt Editor, Model Configuration, Knowledge Sources add/remove)
- Builder card renders correctly for both draft and published states
- Analytics panel renders summary cards + event table correctly
- Responsive verified at 1280px / 768px / 375px — grid/form/event-table breakpoints all behave as designed
- No console errors during any of the above
- Confirmed frozen files have zero diff against `Sprint16A-Stable`

## Not Yet Verified (requires the migration to be applied + a logged-in session)

- End-to-end Create → Edit → Publish → Delete flow against a real Supabase workspace
- Version History restore against real data
- Test Playground against the real provider pipeline with a real workspace
- RLS policies (multi-workspace isolation)

## Next Steps

1. Run `docs/migration-013-builder-studio.sql` manually in Supabase, verify each table/policy individually (same process as Sprint 15's migrations 009–012)
2. Full E2E pass on `/builder-studio` with a real logged-in session
3. Tag `Sprint17-Stable` once verified
