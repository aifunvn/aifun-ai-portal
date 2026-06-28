# Sprint 12 — Document Intelligence

**Branch:** develop-v4
**Commit:** fd1754b
**Date:** 2026-06-27

## Objective

Transform the Documents page from a simple list+view into a complete AI Document Management System with search, filter, sort, pagination, multi-format export, metadata panel, version history, favorites, pins, and Drive sync.

---

## Deliverables

### Database — `supabase/migrations/004_sprint12_documents.sql`

**New columns on `documents`:**

| Column | Type | Default | Purpose |
|---|---|---|---|
| `prompt` | TEXT | null | AI prompt used to generate the document |
| `version` | INT | 1 | Current version number |
| `favorite` | BOOLEAN | false | User-starred |
| `pinned` | BOOLEAN | false | Workspace-pinned to top |
| `last_opened` | TIMESTAMPTZ | null | Tracks recency for Recent section |
| `drive_sync_status` | TEXT | 'none' | 'none' / 'syncing' / 'synced' / 'error' |
| `cost_usd` | NUMERIC(10,6) | 0 | AI generation cost |

**New table `document_versions`:**
- Immutable version snapshots (id, document_id, workspace_id, version, title, content, prompt)
- `UNIQUE(document_id, version)` prevents duplicate version numbers
- RLS: workspace members only
- Indexed on `(document_id, version DESC)`

### New Files

| File | Purpose |
|---|---|
| `src/components/toast.js` | Stacked toast system — max 4, 4s TTL, role=alert, success/info/warn/error variants |
| `src/components/document-export.js` | Export dropdown: PDF (print window), DOCX (Word HTML), Markdown (.md), TXT (.txt); full keyboard navigation |
| `src/components/document-metadata.js` | Collapsible metadata panel: favorite/pin toggles, provider/model/tokens/cost, prompt preview, Drive sync, version history with restore |

### Updated Files

| File | Change |
|---|---|
| `src/services/document-db.js` | Extended toRow/fromRow for all 7 new fields; listDocs with filter/sort/pagination (range-based); listPinnedDocs, listRecentDocs, patchDoc, saveVersion, listVersions |
| `src/services/document-service.js` | listDocuments with opts passthrough; getPinnedDocuments, getRecentDocuments, toggleFavorite, togglePinned, updateDriveSync, getVersionHistory; getDocument now updates last_opened |
| `src/components/document-toolbar.js` | Replaced single export button with export dropdown + metadata toggle (info icon) |
| `src/components/document-list.js` | Pin/favorite/sync badges; relTime row with token count; renderSection for pinned/recent groups; renderPagination (prev/next + page info) |
| `src/components/document-view.js` | Split shell: content pane + collapsible metadata sidebar; wires export dropdown, metadata panel, copy, delete, version restore |
| `src/pages/documents.js` | Full rewrite: builder filter chips, sort dropdown, pinned section, recent section, paginated main list, openDoc with version history |
| `styles/documents.css` | +220 lines: filter bar, filter chips, sort select, section headers, row badges, pagination, metadata sidebar, version history rows, export dropdown, dark mode additions |

---

## Feature Map

| # | Feature | Implementation |
|---|---|---|
| 1 | Search | Debounced input (320ms), server-side ilike on title + builder_name |
| 2 | Filter | Builder type chips (all / prompt / sop / youtube / email / sales), server-side eq on builder_id |
| 3 | Sort | Dropdown: newest, oldest, A→Z, Z→A, favorites-first; server-side ORDER BY |
| 4 | Pagination | Range-based (20/page), prev/next buttons, "Page X / Y · N docs" counter |
| 5 | Preview | Markdown rendered in scrollable doc-view-body via existing markdown-viewer |
| 6 | Export PDF | Opens print window with styled HTML; `window.print()` |
| 7 | Export DOCX | Word-compatible HTML blob downloaded as `.doc` |
| 8 | Export Markdown | `.md` file download |
| 9 | Export TXT | `.txt` file download |
| 10 | Google Drive Sync | Opens doc_url if present; shows sync status badge; updates drive_sync_status in DB |
| 11 | Metadata Panel | Collapsible sidebar: builder, provider, model, version, tokens, cost, dates |
| 12 | Prompt History | Stored in `prompt` column; displayed in metadata panel (first 400 chars) |
| 13 | AI Response History | `content` column is the raw AI response; shown in document body |
| 14 | Version History | `document_versions` table; saved on each saveDocument; restorable from metadata panel |
| 15 | Favorite | Toggle in metadata panel + toolbar star; updates `favorite` column; sort by favorites |
| 16 | Pin Document | Toggle in metadata panel; updates `pinned` column; pinned docs appear in fixed top section |
| 17 | Recent Documents | `last_opened` updated on getDocument; Recent section shows last 5 opened |

---

## Architecture Notes

**Optimistic UX pattern:** favorite/pin toggles update the cached doc object immediately, then fire the Supabase patch in background.

**Version save flow:** `saveDocument()` calls both `saveDoc()` (upsert) and `saveVersion()` (insert, ignores duplicate constraint) — so every save automatically snapshots a version.

**Toast system:** `showToast(msg, type)` injects a fixed-position container into `<body>` on first call. Max 4 toasts stacked at bottom-right. CSS keyframe animation injected once into `<head>`.

**Export without libraries:** PDF via `window.open` + `window.print()`; DOCX via Word-compatible HTML blob (`.doc` extension); no npm dependencies added.

---

## Verification Results

| Check | Result |
|---|---|
| App loads (login page) | PASS — zero console errors |
| All 11 Sprint 12 files served HTTP 200 | PASS |
| Migration SQL accessible | PASS |
| CSS: pagination, metadata panel, export menu, filter chips | PASS (all 4 selectors confirmed in CSS) |
| V2 files untouched (index.html, config.js, skill-engine.js, skill-forms.js) | PASS — none contain Sprint 12 references |
| No secrets committed | PASS |

**Note:** Full end-to-end verification of save/restore/export/sync requires an authenticated Supabase session. DB-level verification (migration columns + document_versions table) requires running `004_sprint12_documents.sql` in Supabase SQL Editor.

---

## Migration Instructions

Run in Supabase Dashboard → SQL Editor:

```
supabase/migrations/004_sprint12_documents.sql
```

This is non-destructive — all new columns have defaults and existing rows are unaffected.
