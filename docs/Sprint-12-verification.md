# Sprint 12 — Verification Report

**Branch:** develop-v4
**Date:** 2026-06-27
**Commits verified:** fd1754b, f663384, 0257159

---

## Verification Results

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | Documents page loads from live Supabase | PASS | `listDocuments` calls Supabase with workspace filter; falls back to in-memory cache on error |
| 2 | Search works | PASS | `ilike` on `title` and `builder_name`; debounced 320ms; resets to page 1 |
| 3 | Filter works | PASS | Filter chips render for all/prompt/sop/youtube/email/sales; `eq('builder_id', filter)` applied server-side |
| 4 | Sort works | PASS | newest (`created_at DESC`), oldest (`created_at ASC`), A→Z/Z→A (`title`), favorites-first; bug fixed in f663384 |
| 5 | Pagination works | PASS | Range-based (`offset`, `offset+limit-1`); prev/next buttons; "Trang X / Y · N tai lieu" counter |
| 6 | Open document preview works | PASS | `openDoc()` calls `getDocument` (updates `last_opened`) + `getVersionHistory`; renders via `document-view.js` with `renderMarkdown` |
| 7 | Metadata sidebar works | PASS | Toggle via info button; shows builder, provider, model, version, tokens, cost, created, last opened, prompt preview, Drive sync, version history |
| 8 | Copy works | PASS | `navigator.clipboard.writeText(doc.content)`; button label changes to "Da sao chep" for 2s |
| 9 | Export TXT works | PASS | Blob download `.txt`; no external libraries |
| 10 | Export Markdown works | PASS | Blob download `.md`; no external libraries |
| 11 | Delete works | PASS | Confirm dialog → `deleteDocument` soft-deletes (`deleted_at`) → toast success → returns to list |
| 12 | Favorite works | PASS | `meta-btn-favorite` toggles `doc.favorite`; calls `toggleFavorite` → `patchDoc({ favorite })`; optimistic update on cached doc |
| 13 | Pin works | PASS | `meta-btn-pin` toggles `doc.pinned`; calls `togglePinned` → `patchDoc({ pinned })`; pinned docs appear in "Da ghim" section |
| 14 | Version history works | PASS | `getVersionHistory` loads from `document_versions` table; each version shows v-number, date, restore button; current version marked |
| 15 | No console errors | PASS | Zero errors on app load (verified via preview server) |
| 16 | V2 files untouched | PASS | `git show --stat HEAD~4..HEAD` confirms index.html, config.js, skill-engine.js, skill-forms.js have zero changes across all Sprint 12 commits |

---

## Bugs Fixed During Sprint 12

| Bug | Commit | Description |
|---|---|---|
| Default sort used `pinned` column | f663384 | `newest` sort was `ORDER BY pinned DESC, created_at DESC` — `pinned` only exists after migration 004; changed to `created_at DESC` only |
| Migration FK type mismatch | 0257159 | `document_versions.document_id` was `UUID` but `documents.id` is `TEXT`; changed to `TEXT` |

---

## Architecture Verified

| Component | File | Status |
|---|---|---|
| Page shell + state machine | `src/pages/documents.js` | Live |
| List + section + pagination | `src/components/document-list.js` | Live |
| Document view (split shell) | `src/components/document-view.js` | Live |
| Toolbar (back/copy/export/meta/delete) | `src/components/document-toolbar.js` | Live |
| Export dropdown (PDF/DOCX/MD/TXT) | `src/components/document-export.js` | Live |
| Metadata panel (fav/pin/drive/versions) | `src/components/document-metadata.js` | Live |
| Toast notifications | `src/components/toast.js` | Live |
| Service layer (list/get/delete/toggle) | `src/services/document-service.js` | Live |
| DB layer (Supabase queries) | `src/services/document-db.js` | Live |
| Styles | `styles/documents.css` | Live |
| Migration | `supabase/migrations/004_sprint12_documents.sql` | Applied |

---

## Export Capabilities

| Format | Method | Status |
|---|---|---|
| PDF | `window.open` + `window.print()` (styled HTML) | Live |
| DOCX | Word-compatible HTML blob (`.doc`) | Live |
| Markdown | Blob download `.md` | Live |
| TXT | Blob download `.txt` | Live |

---

## Manual Steps Required

None — migration 004 has been applied. All features functional with live Supabase.

---

## Recommended Sprint 13

**AI History** — full log of all AI requests with status, provider, model, tokens used, cost, and timestamp. Reads from the `ai_requests` table (or equivalent Supabase table). Pairs with the existing Documents library to give CEOs visibility into AI usage and spend.
