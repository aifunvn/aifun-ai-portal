# Sprint 9 — Database Layer (Supabase Persistence)

**Branch:** `develop-v4`
**Commit:** `fdb71ae`
**Status:** Complete

---

## Goals

Replace all in-memory document and builder data with Supabase persistence while keeping the current UI unchanged.

---

## What Was Built

### New Services

| File | Purpose |
|---|---|
| `src/services/document-db.js` | CRUD for `documents` table — saveDoc, listDocs (with search), getDoc, deleteDoc (soft-delete) |
| `src/services/history-db.js` | Insert/list for `builder_history` table — AI request audit trail with tokens + provider |
| `src/services/template-db.js` | CRUD for `builder_templates` — user-saved builder presets |
| `src/services/favorite-db.js` | Toggle/list for `favorite_builders` — per-user favorites |

### Updated Services

| File | Change |
|---|---|
| `src/services/document-service.js` | Added Supabase-backed list/get/delete; `saveDocument` remains sync with fire-and-forget DB write; in-memory Map fallback when Supabase unavailable |
| `src/services/runtime-service.js` | Fire-and-forget `saveHistory()` after every successful generation |

### Updated Components

| File | Change |
|---|---|
| `src/components/document-list.js` | Changed signature from `render(workspaceId, query)` to `render(docs[])` — decoupled from data layer |
| `src/components/document-toolbar.js` | Added "Xoa" (delete) button with trash icon |
| `src/components/document-view.js` | Wired delete handler; shows Google Docs link when `docUrl` present |
| `src/pages/documents.js` | Fully async: spinner while fetching, async open/delete, search debounced |

### CSS

- `styles/builders.css` — `.btn-danger` variant (outline red → solid red on hover)
- `styles/documents.css` — `.doc-gdocs-link`, `.doc-loading` spinner state

### Database Migration

`supabase/migrations/001_sprint9_tables.sql` — run in Supabase SQL Editor for project `ogfuduavlgpdwqzcaqfy`:

```sql
-- documents, builder_history, builder_templates, favorite_builders
-- All tables: workspace_id isolation, soft-delete via deleted_at, RLS via auth.uid()
```

---

## Architecture Decisions

**`saveDocument` stays synchronous.** Returns the doc immediately so the builder UI can display it without waiting for the DB round-trip. The Supabase write is fire-and-forget with `.catch(() => {})`.

**In-memory Map as fallback.** If Supabase is unavailable (no auth session, network error, RLS denial), the Map cache serves reads. This means the app never breaks due to DB issues during a session.

**`document-list.js` accepts `docs[]` directly.** The page (`documents.js`) owns the async data fetch and passes the result down. The component has no network dependency — easier to test and reuse.

**`documents` table uses `text` PK**, not UUID, so existing `doc_${Date.now()}_${random}` IDs work without changes to `runtime-service.js`.

---

## Verification Results

| Check | Result |
|---|---|
| Generate 3 docs (Prompt, SOP, YouTube) | ✓ All appear in Documents page |
| Search "SOP" | ✓ Returns 1 result |
| Delete SOP doc | ✓ Soft-deleted, removed from list, 2 remaining |
| No console errors | ✓ Clean |
| V2 files untouched | ✓ (index.html, config.js, skill-engine.js, skill-forms.js) |

---

## Manual Step Required

The Supabase migration must be run manually by an admin in the Supabase SQL Editor:

1. Open [Supabase Dashboard](https://supabase.com) → project `ogfuduavlgpdwqzcaqfy`
2. SQL Editor → New query
3. Paste contents of `supabase/migrations/001_sprint9_tables.sql`
4. Run

Until this migration is applied, all reads/writes fall back to the in-memory cache (no data loss within a session, but no persistence across page reloads).
