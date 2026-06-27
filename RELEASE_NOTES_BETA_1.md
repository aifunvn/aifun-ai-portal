# AIFUN OS V4 — Beta 1.0 Release Notes

**Tag:** `v4.0.0-beta.1`
**Branch:** `develop-v4`
**Date:** 2026-06-27
**Status:** Beta — not yet merged to `main` (portal.aifun.ai.vn still runs V2)

---

## What Is V4 Beta 1?

AIFUN OS V4 is a complete rewrite of the AIFUN platform from a 1,000-line single-file SPA (V2) into a modular Vanilla JS ES module architecture backed by Supabase. Beta 1 delivers the full document lifecycle — from AI generation through search, filter, export, and version history — plus a live Marketplace and a role-based permission system.

V2 remains live and untouched at `portal.aifun.ai.vn`. V4 runs in parallel on `develop-v4` and is accessed via `v4.html`.

---

## What's New in Beta 1

### AI Document Library
Users can now search, filter, sort, paginate, preview, and manage every document their workspace has ever generated.

- **Search** — debounced full-text search across title and builder name
- **Filter** — builder type chips: All / Prompt / SOP / YouTube / Email / Sales
- **Sort** — newest, oldest, A→Z, Z→A, favorites-first
- **Pagination** — 20 documents per page with prev/next navigation
- **Pinned section** — pinned documents always appear at the top
- **Recent section** — last 5 opened documents surfaced automatically

### Document Preview & Actions
- **Markdown rendering** — AI output rendered as formatted document (no external libraries)
- **Metadata sidebar** — builder, provider, model, version, token usage, cost, timestamps, prompt preview
- **Favorite** — star any document; sort favorites-first
- **Pin** — pin important documents to workspace top
- **Version history** — every save creates a snapshot; restore any prior version with one click
- **Copy** — copy full content to clipboard
- **Export PDF** — opens styled print window; native browser print dialog
- **Export DOCX** — Word-compatible HTML download (`.doc`)
- **Export Markdown** — `.md` file download
- **Export TXT** — `.txt` file download
- **Delete** — soft-delete with confirmation; document recoverable from DB

### Google Drive Sync
- Drive sync status displayed per document: Not synced / Syncing / Synced / Error
- Documents with a Google Docs link show an "Open in Drive" button
- Drive API write integration is prepared for Sprint 13

### Builder Marketplace
- 5 builders available: Prompt Optimizer, SOP Builder, YouTube Script, Email Automation, Sales Script
- Install/Uninstall with optimistic UI (works offline via localStorage)
- Installed builders appear on the Builders page and in Dashboard KPIs
- Plan-gating: locked builders display upgrade badge

### Role-Based Access Control
- 4 roles: Owner, Admin, Editor, Viewer
- 13 permissions across 7 modules
- Sidebar nav, builder launch, document delete — all gated by role
- Per-workspace plan (free / starter / pro / business) controls builder access
- Daily AI request limits enforced per plan

### AI Provider Engine
- Provider selector: Mock (instant) or Claude (via GAS)
- Claude calls GAS Web App endpoint with 90s timeout
- Automatic Claude → Mock fallback if GAS unavailable; user sees fallback notice
- Every AI generation logged: provider, model, tokens, cost, duration

---

## Migrations Required

All 4 migrations must be applied in Supabase SQL Editor for project `ogfuduavlgpdwqzcaqfy`:

| File | Sprint | Purpose |
|---|---|---|
| `supabase/migrations/001_sprint9_tables.sql` | 9 | Core tables: documents, builder_history, builder_templates, favorite_builders |
| `supabase/migrations/002_sprint10_permissions.sql` | 10 | Roles, permissions, workspace_members, usage limits |
| `supabase/migrations/003_sprint11_marketplace.sql` | 11 | Marketplace items (seeded), installs, reviews |
| `supabase/migrations/004_sprint12_documents.sql` | 12 | Document columns: version, favorite, pinned, last_opened, drive_sync_status, cost_usd; document_versions table |

All migrations are non-destructive. Existing rows are unaffected. Apply in order.

---

## Known Limitations

| # | Limitation | Target Sprint |
|---|---|---|
| 1 | Google Drive sync button shows status but does not write to Drive | Sprint 13 |
| 2 | AI History page is not built — `history-db.js` writes data but no UI reads it | Sprint 13 |
| 3 | Team management page not built — workspace members can be added via Supabase dashboard only | Sprint 14 |
| 4 | Billing page not built — plan is set via Supabase `workspace_usage_limits` only | Sprint 15 |
| 5 | Settings page renders placeholder only | Sprint 14 |
| 6 | Reports page renders placeholder only | Sprint 15 |
| 7 | Email/Sales builders registered but schemas are stubs — prompts not tuned | Sprint 13 |
| 8 | No automated tests of any kind | Sprint 16 |
| 9 | V4 not deployed to production — `main` still runs V2 | Post Sprint 15 |
| 10 | GAS backend not version-controlled (`gas/Code.gs` missing from repo) | Sprint 1 debt |
| 11 | `config.js` contains live GAS URL and Spreadsheet ID in public repo | Sprint 1 debt |
| 12 | Dark mode toggle exists in design system but no UI control exposed | Sprint 14 |

---

## Bugs Fixed During Beta 1

| Commit | Bug | Impact |
|---|---|---|
| `2bc5c07` | Marketplace used wrong element ID — page never rendered | Critical |
| `2bc5c07` | Static fallback not triggered on RLS empty result | Major |
| `394a81e` | Invalid Supabase anon key — auth never worked | Critical |
| `f663384` | Default document sort referenced missing `pinned` column | Major |
| `0257159` | Migration FK type mismatch (UUID vs TEXT) blocked migration apply | Critical |
| `4d36a37` | CDN dep iceberg-js crashed entire app at startup — blank page | Critical |

---

## How to Run V4 Locally

```bash
git checkout develop-v4
git pull origin develop-v4

# Start a static file server from repo root
python -m http.server 3000
# or: npx serve . -p 3000

# Open in browser
http://localhost:3000/v4.html
```

Apply all 4 Supabase migrations before testing authenticated features.

---

## Architecture at a Glance

```
v4.html
  └── config.js (runtime config, no framework)
  └── src/app/app.js (ES module entry, type="module")
        ├── src/router/router.js (hash-based)
        ├── src/auth/ (login, register, forgot, reset, verify)
        ├── src/pages/ (dashboard, builders, documents, marketplace, reports, settings)
        ├── src/components/ (reusable UI components)
        ├── src/services/ (business logic, Supabase queries)
        ├── src/stores/ (reactive pub/sub state)
        ├── src/layouts/ (sidebar, topbar, main-layout)
        └── src/lib/supabase.js (CDN @2.44.4, pinned)
```

---

## Next Sprints (Roadmap)

| Sprint | Focus |
|---|---|
| Sprint 13 | AI History page + Google Drive write integration |
| Sprint 14 | Team management (invite, remove, role change) + Settings page |
| Sprint 15 | Billing page + PayOS integration + Reports |
| Sprint 16 | Automated test suite (unit + integration) |
| Sprint 17 | Release prep — merge develop-v4 → main, deploy to portal.aifun.ai.vn |

---

*AIFUN OS V4 Beta 1 — built by Claude Code sessions on the AIFUN OS Engineering Team.*
