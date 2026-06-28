# AIFUN OS V4 — System Architecture

**Version:** 4.0.0-beta.1
**Date:** 2026-06-27
**Branch:** develop-v4

---

## 1. Overview

AIFUN OS V4 is a Vanilla JavaScript ES module SPA hosted on GitHub Pages (static, zero build step). It communicates with two backends: **Supabase** (auth, database, RLS) and a **Google Apps Script Web App** (AI generation via Claude API, Google Drive/Docs creation).

```
┌─────────────────────────────────────────┐
│              Browser (v4.html)           │
│                                         │
│  config.js + src/app/app.js (ESM)       │
│  ┌──────────┐  ┌───────────────────┐    │
│  │  Router  │  │   Store Layer     │    │
│  │ (hash)   │  │ userStore         │    │
│  └────┬─────┘  │ workspaceStore    │    │
│       │        │ permissionStore   │    │
│  ┌────▼─────┐  └───────────────────┘    │
│  │  Pages   │                           │
│  │ dashboard│                           │
│  │ builders │                           │
│  │ documents│                           │
│  │ marketpla│                           │
│  └────┬─────┘                           │
│       │                                 │
│  ┌────▼────────────────────┐            │
│  │       Services          │            │
│  │ document-service        │            │
│  │ marketplace-service     │            │
│  │ install-service         │            │
│  │ permission-service      │            │
│  │ workspace-service       │            │
│  └────┬──────────┬─────────┘            │
│       │          │                      │
└───────┼──────────┼──────────────────────┘
        │          │
   ┌────▼────┐  ┌──▼──────────────────┐
   │Supabase │  │ Google Apps Script  │
   │(Auth +  │  │ Web App (GAS)       │
   │Database)│  │ - Claude API calls  │
   └─────────┘  │ - Google Docs create│
                │ - Google Drive save │
                └─────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Hosting | GitHub Pages (static) | `main` branch → auto-deploy; no build step |
| DNS / CDN | Cloudflare | `portal.aifun.ai.vn` CNAME → GitHub Pages |
| Frontend | Vanilla JS ES Modules | No framework, no bundler, no transpiler |
| Auth | Supabase Auth (GoTrue) | Email/password; JWT session; `persistSession: true` |
| Database | Supabase (PostgreSQL) | RLS on all tables; workspace_id isolation |
| AI Calls | Google Apps Script | Proxies Claude/OpenAI; creates Google Docs |
| AI Provider | Anthropic Claude (Sonnet 4.6) | Via GAS; fallback to mock on error |
| Styles | CSS custom properties | Design token system; no CSS framework |
| Icons | Inline SVG | No icon library |

---

## 3. Repository Structure

```
aifun-ai-portal/
│
├── index.html                    ← V2 SPA (live at portal.aifun.ai.vn)
├── v4.html                       ← V4 entry point
├── config.js                     ← Runtime config (GAS URL, Spreadsheet ID)
├── skill-engine.js               ← V2 builder modal (IIFE)
├── skill-forms.js                ← V2 builder definitions
├── script.js / data.js /         ← V3 dead code (ES modules without type="module")
│   sheets.js
│
├── CLAUDE.md                     ← Engineering handbook (this project's constitution)
├── CHANGELOG.md                  ← Version history
├── RELEASE_NOTES_BETA_1.md       ← Beta 1 release notes
├── SYSTEM_ARCHITECTURE_V4.md     ← This document
├── TEST_REPORT_BETA_1.md         ← Manual test results
├── PROJECT_STATUS.md             ← Human-readable progress tracker
├── CNAME                         ← portal.aifun.ai.vn
│
├── src/
│   ├── app/
│   │   └── app.js                ← Entry point — registers routes, wires auth events
│   │
│   ├── router/
│   │   └── router.js             ← Hash-based router (Map<path, handler>)
│   │
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── forgot-password.js
│   │   ├── reset-password.js
│   │   └── verify-email.js
│   │
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── builders.js
│   │   ├── documents.js
│   │   ├── marketplace.js
│   │   ├── reports.js            ← Placeholder
│   │   └── settings.js           ← Placeholder
│   │
│   ├── layouts/
│   │   ├── main-layout.js        ← mountPage() — writes shell + page HTML
│   │   ├── sidebar.js
│   │   └── topbar.js
│   │
│   ├── components/
│   │   ├── builder-launcher.js   ← Multi-step builder modal
│   │   ├── document-export.js    ← Export dropdown (PDF/DOCX/MD/TXT)
│   │   ├── document-list.js      ← Doc rows, sections, pagination
│   │   ├── document-metadata.js  ← Metadata sidebar panel
│   │   ├── document-toolbar.js   ← Back/Copy/Export/Meta/Delete toolbar
│   │   ├── document-view.js      ← Split-shell: content + sidebar
│   │   ├── field-renderer.js     ← Form field components
│   │   ├── form-renderer.js      ← Schema → HTML form
│   │   ├── install-button.js     ← Install/Uninstall/Locked button
│   │   ├── installed-builders.js ← Dashboard widget
│   │   ├── kpi-card.js           ← Dashboard KPI card
│   │   ├── markdown-viewer.js    ← Safe Markdown → HTML renderer
│   │   ├── marketplace-card.js   ← Marketplace item card
│   │   ├── marketplace-detail.js ← Marketplace item detail view
│   │   ├── quick-actions.js      ← Dashboard quick action buttons
│   │   ├── recent-documents.js   ← Dashboard recent docs widget
│   │   ├── toast.js              ← Stacked toast notification system
│   │   ├── usage-chart.js        ← SVG bar chart (token usage)
│   │   ├── user-menu.js          ← User avatar dropdown with role badge
│   │   ├── workspace-switcher.js ← Workspace switcher in sidebar
│   │   ├── activity-timeline.js
│   │   └── chat-output.js
│   │
│   ├── services/
│   │   ├── document-db.js        ← Supabase CRUD: saveDoc, listDocs, getDoc, deleteDoc, patchDoc, versions
│   │   ├── document-service.js   ← Business layer: list/get/delete/toggle/versions + cache
│   │   ├── dashboard-service.js  ← Aggregates KPI data for dashboard
│   │   ├── history-db.js         ← AI request audit log (Supabase)
│   │   ├── template-db.js        ← Builder preset CRUD (Supabase)
│   │   ├── favorite-db.js        ← Favorite builders (Supabase)
│   │   ├── install-service.js    ← Install/uninstall (localStorage + Supabase)
│   │   ├── marketplace-service.js← Marketplace items list/get (Supabase + static fallback)
│   │   ├── permission-service.js ← can(), isBuilderAccessible(), canRunBuilder()
│   │   ├── provider-service.js   ← runProvider() thin wrapper
│   │   ├── role-service.js       ← Load role permissions from Supabase (+ static fallback)
│   │   ├── runtime-service.js    ← runBuilder() → executePipeline() → saveDocument()
│   │   ├── usage-limit-service.js← Daily AI request counter per workspace plan
│   │   ├── user-profile-service.js← Load/upsert user_profiles
│   │   ├── validation-service.js ← Form field validation rules
│   │   ├── workspace-service.js  ← initWorkspaceEngine() — auth → profile → memberships → role
│   │   ├── builder-registry-service.js
│   │   └── prompt-template-service.js
│   │
│   ├── stores/
│   │   ├── user-store.js         ← { user, role, permissions }; pub/sub subscribe()
│   │   ├── workspace-store.js    ← { workspace, workspaces }; pub/sub subscribe()
│   │   └── permission-store.js   ← Reactive wrapper: can() gated by userStore
│   │
│   ├── providers/
│   │   ├── mock-provider.js      ← Instant mock response (dev/fallback)
│   │   ├── claude-provider.js    ← POST to GAS; normalize response; 90s timeout
│   │   └── provider-manager.js   ← register, run(), claude→mock fallback
│   │
│   ├── runtime/
│   │   └── index.js              ← executePipeline(builder, formData, options)
│   │
│   ├── config/
│   │   └── auth.js               ← Supabase URL + anon key
│   │
│   ├── lib/
│   │   └── supabase.js           ← createClient (CDN @2.44.4, pinned)
│   │
│   └── builders/
│       ├── registry.js           ← Builder schema registry
│       └── schemas/              ← JSON schema per builder
│           ├── prompt-builder.json
│           ├── sop-builder.json
│           ├── youtube-builder.json
│           ├── email-builder.json
│           └── sales-builder.json
│
├── styles/
│   ├── tokens.css                ← Design tokens (CSS custom properties)
│   ├── base.css                  ← Reset + base typography
│   ├── layout.css
│   ├── sidebar.css
│   ├── topbar.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── builders.css
│   ├── markdown.css
│   ├── documents.css
│   └── marketplace.css
│
├── supabase/
│   └── migrations/
│       ├── 001_sprint9_tables.sql
│       ├── 002_sprint10_permissions.sql
│       ├── 003_sprint11_marketplace.sql
│       └── 004_sprint12_documents.sql
│
├── data/                         ← Static JSON snapshots (V2 data layer fallback)
│   ├── projects.json
│   ├── prompts.json
│   ├── skills.json
│   ├── sops.json
│   └── workflows.json
│
└── docs/                         ← Sprint documentation
    ├── Sprint-05.md through Sprint-12.md
    ├── Sprint-11-verification.md
    └── Sprint-12-verification.md
```

---

## 4. Data Flow

### Authentication Flow
```
User submits login form
    → supabase.auth.signInWithPassword()
    → Supabase returns JWT session (stored in localStorage by Supabase SDK)
    → onAuthStateChange('SIGNED_IN') fires in app.js
    → initWorkspaceEngine()
        → getUser() → loadOrCreateProfile() → fetchMemberships()
        → workspaceStore.setWorkspace(active)
        → loadRolePermissions(role) → userStore.set({ role, permissions })
    → router.navigate('/dashboard')
```

### AI Document Generation Flow
```
User fills builder form → clicks "Tao ngay"
    → builder-launcher.js reads formData + provider selection
    → runBuilder(adapter, formData, { provider: 'claude' })
    → runtime-service.js → executePipeline()
    → provider-manager.run(metaPrompt, options)
    → claude-provider.run() → POST to GAS Web App
    → GAS calls Claude API (Anthropic)
    → GAS creates Google Doc → saves to Google Drive
    → GAS returns { content, docUrl, docId }
    → executePipeline returns { content, tokens, provider, docUrl }
    → runtime-service.saveDocument(doc) → document-db.saveDoc() [fire-and-forget]
    → history-db.insert() [fire-and-forget]
    → builder-launcher shows result with copy / open in Drive
```

### Document Library Flow
```
User navigates to /documents
    → documents.js init() subscribes to workspaceStore
    → showList() → listDocuments(wsId, { query, filter, sort, limit, offset })
    → document-service → document-db.listDocs() → Supabase SELECT
    → [fallback: in-memory Map cache if Supabase fails]
    → renderList(docs) + renderSection(pinned) + renderPagination()
    → user clicks doc row → openDoc(docId)
    → getDocument(wsId, docId) → patchDoc(last_opened)
    → getVersionHistory(docId)
    → document-view.render(doc) + initView(doc, versions, handlers)
```

### Permission Check Flow
```
Component calls can('documents:delete')
    → permission-service.can()
    → userStore.getUser().permissions (loaded at sign-in by role-service)
    → role-service loaded from Supabase role_permissions table
    → [fallback: static role map in role-service.js]
    → returns boolean
```

---

## 5. Database Schema

### Tables (Supabase PostgreSQL)

#### Core (Migration 001)

**`documents`**
```
id               TEXT        PK (doc_${timestamp}_${random})
workspace_id     TEXT        NOT NULL
user_id          UUID        → auth.users
title            TEXT        NOT NULL
content          TEXT
builder_id       TEXT
builder_name     TEXT
provider         TEXT
model            TEXT
doc_url          TEXT
tokens_prompt    INT         DEFAULT 0
tokens_completion INT        DEFAULT 0
tokens_total     INT         DEFAULT 0
form_data        JSONB
prompt           TEXT        (added Sprint 12)
version          INT         DEFAULT 1 (Sprint 12)
favorite         BOOLEAN     DEFAULT false (Sprint 12)
pinned           BOOLEAN     DEFAULT false (Sprint 12)
last_opened      TIMESTAMPTZ (Sprint 12)
drive_sync_status TEXT       DEFAULT 'none' (Sprint 12)
cost_usd         NUMERIC(10,6) DEFAULT 0 (Sprint 12)
created_at       TIMESTAMPTZ DEFAULT now()
deleted_at       TIMESTAMPTZ NULL (soft-delete)
```

**`document_versions`** (Migration 004)
```
id           UUID    PK DEFAULT gen_random_uuid()
document_id  TEXT    → documents(id) ON DELETE CASCADE
workspace_id TEXT
version      INT
title        TEXT
content      TEXT
prompt       TEXT
created_at   TIMESTAMPTZ DEFAULT now()
UNIQUE(document_id, version)
```

**`builder_history`**
```
id, workspace_id, user_id, builder_id, builder_name,
provider, model, prompt, tokens_prompt, tokens_completion, tokens_total,
cost_usd, status, duration_ms, created_at
```

**`builder_templates`**, **`favorite_builders`** — user-saved presets and favorites.

#### Permissions (Migration 002)

**`user_profiles`** — full_name, avatar_url, linked to auth.users
**`roles`** — owner, admin, editor, viewer
**`permissions`** — 13 named permissions
**`role_permissions`** — junction table (seeded)
**`workspace_members`** — workspace_id + user_id + role_id
**`workspace_usage_limits`** — plan, daily_limit, used_today, reset_at

#### Marketplace (Migration 003)

**`marketplace_items`** — 5 seeded builders (id, name, description, category, plan_required, featured)
**`marketplace_installs`** — workspace_id + item_id, UNIQUE constraint, RLS
**`marketplace_reviews`** — future use

### RLS Policy Pattern

All tables follow this pattern:
```sql
-- Read: workspace members only
CREATE POLICY "read" ON table_name FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Insert: authenticated users for their own workspace
CREATE POLICY "insert" ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 6. Design System

All UI follows the AIFUN OS V4 Design System defined in `styles/tokens.css`.

### Color Tokens
```css
--c-primary:   #6366f1   /* indigo-500 */
--c-success:   #10b981
--c-warning:   #f59e0b
--c-danger:    #ef4444
--surface:     #ffffff
--bg:          #f1f5f9
--border:      #e2e8f0
--text-1:      #0f172a
--text-2:      #475569
--text-3:      #94a3b8
```

### Radius Tokens
```css
--r-sm: 6px    --r-md: 10px    --r-lg: 14px    --r-xl: 20px
```

### Shadow Tokens
```css
--sh-sm   --sh-md   --sh-lg
```

### Dark Mode
Implemented via `[data-dark]` on `<html>`. All component styles use CSS variables — zero hardcoded hex values in component files.

---

## 7. Security Model

| Concern | Implementation |
|---|---|
| Cross-workspace data | `workspace_id` filter on every Supabase query; RLS as DB-level backstop |
| Auth tokens | Managed by Supabase SDK (`persistSession`, httpOnly-equivalent) |
| Soft delete | `deleted_at TIMESTAMPTZ` — user data never hard-deleted |
| XSS | `textContent` for user data; `renderMarkdown` escapes `&`, `<`, `>` before processing |
| Secrets | GAS URL in `config.js` (known issue — Sprint 1 debt; GAS treated as semi-public endpoint) |
| SQL injection | Supabase parameterized queries only; no string-concat SQL |
| CDN integrity | Supabase pinned to `@2.44.4`; no other third-party scripts in V4 |

---

## 8. Known Technical Debt

| Issue | Risk | Sprint |
|---|---|---|
| `config.js` has live GAS URL in public repo | Medium | Sprint 1 (deferred) |
| GAS `Code.gs` not in version control | High | Sprint 1 (deferred) |
| V3 dead code (`script.js`, `data.js`, `sheets.js`) still in repo | Low | Sprint 1 (deferred) |
| `index.html` is 1,043 lines | Medium | Not in V4 scope |
| No automated tests | Medium | Sprint 16 |
| GAS is single point of failure — no retry logic in V4 | Low | Sprint 13 |

---

## 9. Deployment

### Current State
- V2 (`index.html`) is live on `main` → GitHub Pages → `portal.aifun.ai.vn`
- V4 (`v4.html`) is on `develop-v4` — accessible locally via static file server

### V4 Production Deploy (Planned — Sprint 17)
```
develop-v4 → release/v4.0.0 → main (tag v4.0.0) + back-merge → develop
```

GitHub Pages automatically serves `main` — no CI/CD pipeline required.

### Local Development
```bash
python -m http.server 3000
# or: npx serve . -p 3000
# Open: http://localhost:3000/v4.html
```

No build step. No npm. No node_modules. Any static file server works.

---

*Last updated: 2026-06-27 | AIFUN OS V4 Beta 1*
