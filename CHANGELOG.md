# CHANGELOG — AIFUN OS V4

All notable changes to AIFUN OS V4 are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v4.0.0-beta.1] — 2026-06-27

### Added

#### Sprint 0–2 — Foundation & Shell
- V4 entry point `v4.html` with ES module architecture (no bundler)
- Application shell: sidebar navigation, topbar, layout system
- Hash-based client-side router (`src/router/router.js`)
- Design token system (`styles/tokens.css`) — CSS variables for all colors, spacing, shadows
- Dark mode via `[data-dark]` attribute on `<html>`, persisted in `localStorage`
- Responsive breakpoints: xs / sm / md / lg / xl / 2xl
- Page structure: Dashboard, Builders, Documents, Marketplace, Reports, Settings

#### Sprint 3 — Workspace Engine
- `workspaceStore` — reactive pub/sub store for active workspace
- `userStore` — reactive store for authenticated user and role
- Workspace switcher component with avatar initials
- User menu with role badge and sign-out

#### Sprint 4 — Dashboard Foundation
- Dashboard page with KPI cards: AI Requests, Documents, Builders Installed, Workspace Plan
- Usage chart (7-day token usage, pure SVG — no chart libraries)
- Recent Documents list
- Quick Actions panel
- Installed Builders list
- Activity timeline

#### Sprint 5 — AI Builder Engine
- Schema-driven builder system — each builder defined as a JSON schema
- 6 initial builders: Prompt Optimizer, SOP Builder, YouTube Script, Email Automation, Sales Script, Report Generator
- Field renderer: text, textarea, select, radio, checkbox, tag-input
- Form validation with per-field rules
- Builder card grid with plan-gating overlay

#### Sprint 6 — AI Runtime + Document Center
- `executePipeline(builder, formData, options)` — orchestrates prompt build → provider → output
- Document Center page with list, search, open, delete
- Markdown viewer component (`renderMarkdown`) — safe line-by-line renderer, no external libraries
- `runtime-service.js` — saves generated documents, fires AI history

#### Sprint 7 — Builder Launcher
- `builder-launcher.js` — full multi-step builder modal
- Provider selector (Mock / Claude)
- 3-step UX: form → generating → result
- Copy to clipboard, Open in Google Docs, Start Over

#### Sprint 8 — Provider Engine + Claude Integration
- Provider abstraction layer: `mock-provider.js`, `claude-provider.js`, `provider-manager.js`
- Claude provider calls GAS Web App endpoint with 90s timeout + AbortController
- Automatic Claude → Mock fallback with "fallback" flag in result
- Fallback note displayed in builder output when mock is used

#### Sprint 9 — Supabase Persistence Layer
- Migration `001_sprint9_tables.sql`: `documents`, `builder_history`, `builder_templates`, `favorite_builders`
- `document-db.js` — Supabase CRUD with soft-delete (`deleted_at`)
- `history-db.js` — AI request audit trail (tokens, provider, model, duration)
- `template-db.js` — user-saved builder presets
- `favorite-db.js` — per-user favorite builders
- In-memory Map fallback when Supabase unavailable
- `saveDocument` fire-and-forget pattern — UI never blocks on DB write

#### Sprint 10 — User, Role & Permission System
- Migration `002_sprint10_permissions.sql`: `user_profiles`, `roles`, `permissions`, `role_permissions`, `workspace_members`, `workspace_usage_limits`
- 4 roles: owner, admin, editor, viewer
- 13 permissions across 7 groups
- `permission-service.js` — `can()`, `isBuilderAccessible()`, `canRunBuilder()`
- `usage-limit-service.js` — daily AI request counter per workspace plan
- Sidebar nav gated by `permissionStore`
- Builders page: locked card UI for inaccessible builders
- Plan tiers: free / starter / pro / business with builder access matrix

#### Sprint 11 — Builder Marketplace
- Migration `003_sprint11_marketplace.sql`: `marketplace_items` (5 seeded), `marketplace_installs`, `marketplace_reviews`
- Full Marketplace page with list view, detail view, search, category groups
- Install / Uninstall flow with optimistic localStorage update + Supabase sync
- `install-button.js` — install / uninstall / locked state renderer
- Dashboard KPI reflects installed builder count in real-time
- Builders page filters to installed-only; empty state links to Marketplace
- Static fallback for all 5 marketplace items when Supabase unavailable

#### Sprint 12 — Document Library
- Migration `004_sprint12_documents.sql`: adds `prompt`, `version`, `favorite`, `pinned`, `last_opened`, `drive_sync_status`, `cost_usd` columns; new `document_versions` table
- Full filter bar: search (debounced 320ms), builder type chips, sort dropdown
- Sort modes: newest, oldest, A→Z, Z→A, favorites-first
- Range-based pagination (20/page) with prev/next and page counter
- Pinned documents section (always shown at top)
- Recent documents section (based on `last_opened`)
- Document preview with Markdown rendering
- Metadata sidebar: builder, provider, model, version, tokens, cost, dates, prompt preview
- Favorite and Pin toggles (optimistic update)
- Google Drive sync status UI with friendly fallback
- Version history panel with one-click restore
- Export: PDF (print window), DOCX (Word HTML blob), Markdown (.md), TXT (.txt)
- Toast notification system: stacked, max 4, 4s TTL, role=alert

### Fixed

- `fix(marketplace)` `2bc5c07` — Marketplace page element ID wrong (`page-marketplace` → `page-content`); static fallback not triggered on RLS-empty Supabase result
- `fix(auth)` `394a81e` — Invalid Supabase anon key replaced with correct JWT
- `fix(documents)` `f663384` — Default sort (`newest`) referenced `pinned` column before migration 004 was applied; changed to `created_at DESC` only
- `fix(migrations)` `0257159` — `document_versions.document_id` declared as `UUID` but `documents.id` is `TEXT`; changed to `TEXT`
- `fix(v4)` `4d36a37` — Blank page on startup caused by `iceberg-js@0.8.1` (transitive dep of `@supabase/realtime-js@2.108.x`) calling `getImageMode` on undefined at module eval time; pinned Supabase CDN to `2.44.4` + added `init().catch()` login fallback

### Changed

- `config.js` — pinned `@supabase/supabase-js` CDN to `@2.44.4` (from unpinned `@2`) to avoid iceberg-js transitive dep crash

### Security

- All tables have Row Level Security (RLS) enabled
- `workspace_id` filter on every DB query — no cross-workspace data leakage
- Soft-delete only — user data never hard-deleted
- No secrets in committed JavaScript (GAS URL is semi-public by design)
- JWT stored in Supabase session (httpOnly-equivalent via `persistSession`)

---

## [v2.0] — 2026-06-17 (Production, `main` branch)

AIFUN OS V2 — live at portal.aifun.ai.vn. Single-file SPA (`index.html`), 8 AI Builders, Google Sheets data layer, GAS backend. Unchanged and fully operational alongside V4 development.

---

*This changelog covers the `develop-v4` branch. V4 has not yet been merged to `main`.*
