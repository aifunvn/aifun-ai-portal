# CLAUDE.md — AIFUN OS V4 Engineering Handbook

> **Permanent reference for all Claude Code sessions on this repository.**
> Read this file in full before making any changes. Every decision here has a reason.

---

## 1. Project Vision

AIFUN OS is the AI workspace operating system for Vietnamese SMEs and CEOs.

The mission is to give every business — regardless of technical sophistication — the ability to create professional documents, automate workflows, and leverage enterprise-grade AI through a clean, opinionated SaaS interface.

**North Star:** A CEO with no technical background creates a complete SOP, exports it to Google Docs, and shares it with their team in under 5 minutes.

**Design Philosophy:**
- Simple over powerful — a working tool beats a flexible framework
- Vietnamese-first — all copy, UX patterns, and defaults are vi-VN
- Progressive disclosure — show what the user needs now, reveal complexity on demand
- Trust through reliability — never fail silently; every error has a clear recovery path

---

## 2. Product Overview

| Attribute | Value |
|---|---|
| Product name | AIFUN OS |
| Current version | V4 (in development) |
| Live version | V2 (production at portal.aifun.ai.vn) |
| Primary users | Vietnamese SME owners, CEOs, department managers |
| Business model | SaaS subscription (Free / Starter / Pro / Enterprise) |
| Primary language | Vietnamese (vi-VN) |
| Timezone | Asia/Ho_Chi_Minh (UTC+7) |
| Currency | VNĐ primary, USD secondary |

### Core Modules (V4 Target)
1. **AI Builders** — Form-driven AI document generation (SOP, Content, Email, CRM, Report, Webinar, Sales Script, Prompt)
2. **Marketplace** — Install prompt packs, builder extensions, workflow templates
3. **Documents** — Library of all AI-generated documents with export and Drive sync
4. **AI History** — Full log of all AI requests with status, tokens, cost
5. **Team** — Workspace member management with role-based access
6. **Billing** — Subscription management, usage metering, invoice history
7. **Settings** — Workspace config, Google integrations, API keys, audit logs

---

## 3. Current Architecture

### Deployment Model
- **Hosting:** GitHub Pages (static, zero server cost)
- **Domain:** `portal.aifun.ai.vn` via CNAME → GitHub Pages
- **DNS/Proxy:** Cloudflare
- **Branch → Production:** `main` branch deploys automatically; no build step required

### Frontend (V2 — currently live)
- **Single file SPA:** `index.html` (1,043 lines)
- **Inline CSS:** ~260 lines defining the V2 design system
- **Inline JavaScript:** ~380 lines of functional application code at bottom of `index.html`
- **Script load order:** `config.js` → `data.js` → `sheets.js` → `skill-forms.js` → `skill-engine.js` → `script.js` → inline `<script>`
- **Navigation:** `navTo(pageId)` — shows/hides page divs

### Frontend (V3 — present but dead code)
- `script.js`, `data.js`, `sheets.js` use ES module `import`/`export` syntax
- These files are loaded **without** `type="module"` — they do not execute
- V3 references page IDs (`page-home`, `page-ai-tools`) that do not exist in `index.html`
- **Do not activate V3 code without a dedicated migration sprint**

### Backend
- **Google Apps Script (GAS) Web App** — the sole backend
- Handles: Claude/OpenAI API calls, Google Docs creation, Google Drive save, Google Sheets logging
- Single deployed endpoint exposed in `config.js` as `gasWebAppUrl`
- **GAS source (`Code.gs`) has zero version control** — tracked only in Google Drive
- Timeout: 90 seconds (`requestTimeout: 90000` in config)

### Data Layer (3-tier)
```
Tier 1: Google Sheets API v4 (browser-side reads, live data)
    ↓ cache miss
Tier 2: /data/*.json (static JSON snapshots)
    ↓ last resort
Tier 3: In-memory constants in data.js (hardcoded fallbacks)
```

### Key Files
| File | Purpose | Status |
|---|---|---|
| `index.html` | V2 SPA shell + all V2 CSS + all V2 JS | Live |
| `config.js` | Runtime config + secrets (⚠️ public) | Live |
| `skill-engine.js` | IIFE module — 3-step builder modal | Live |
| `skill-forms.js` | `SKILL_FORMS` global — 8 builder definitions | Live |
| `script.js` | V3 ES module app — dead code | Dead |
| `data.js` | V3 ES module data layer — dead code | Dead |
| `sheets.js` | V3 Google Sheets client — dead code | Dead |
| `data/*.json` | Static data snapshots | Active |
| `CNAME` | Custom domain config | Live |

---

## 4. Repository Structure

```
aifun-ai-portal/
├── CLAUDE.md                  ← This file
├── PROJECT_STATUS.md          ← Human-readable progress tracker
├── CNAME                      ← portal.aifun.ai.vn
├── .gitignore
│
├── index.html                 ← V2 SPA (entire running application)
├── config.js                  ← Runtime config (contains live secrets)
│
├── skill-engine.js            ← Builder modal engine (IIFE, window.SkillEngine)
├── skill-forms.js             ← Builder form definitions (window.SKILL_FORMS)
│
├── script.js                  ← V3 app (dead — ES module without type="module")
├── data.js                    ← V3 data layer (dead)
├── sheets.js                  ← V3 Sheets client (dead)
│
├── data/
│   ├── projects.json
│   ├── prompts.json
│   ├── skills.json
│   ├── sops.json
│   └── workflows.json
│
└── [standalone HTML files — not part of app]
    ├── bao-cao-nghiem-thu-v2.html
    ├── slides-nghiem-thu-v2.html
    └── training-slides.html
```

### V4 Target Structure (do not create until Sprint 1 begins)
```
aifun-ai-portal/
├── CLAUDE.md
├── index.html                 ← Shell only — loads V4 module
├── config.js                  ← Non-secret config only
├── config.secret.example.js   ← Template (never commit secrets)
│
├── src/
│   ├── app.js                 ← Entry point (type="module")
│   ├── router.js              ← Client-side routing
│   ├── store.js               ← Global state
│   │
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── builders.js
│   │   ├── marketplace.js
│   │   ├── documents.js
│   │   ├── history.js
│   │   ├── team.js
│   │   ├── billing.js
│   │   └── settings.js
│   │
│   ├── components/
│   │   ├── sidebar.js
│   │   ├── topbar.js
│   │   ├── builder-modal.js
│   │   ├── toast.js
│   │   └── modal.js
│   │
│   ├── services/
│   │   ├── gas.js             ← GAS Web App client
│   │   ├── sheets.js          ← Google Sheets API client
│   │   └── drive.js           ← Google Drive client
│   │
│   └── utils/
│       ├── auth.js
│       ├── format.js
│       └── validators.js
│
├── data/                      ← Static JSON snapshots
├── styles/
│   ├── tokens.css             ← Design tokens (CSS variables)
│   └── base.css               ← Resets + base styles
│
└── gas/
    └── Code.gs                ← GAS source (clasp-managed)
```

---

## 5. Git Workflow

### Core Rules
- **`main` is always deployable.** Nothing broken merges to `main`.
- **Never force-push `main`.** Not even to fix a mistake.
- **One feature = one branch = one PR.** No bundling unrelated changes.
- **Commit messages follow Conventional Commits** (see §7).
- **Never commit secrets.** `config.js` currently violates this — do not add more secrets.
- **No `--no-verify` unless explicitly authorized by the user.**

### Daily Flow
```
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
# ... make changes ...
git add [specific files]
git commit -m "feat: describe the change"
git push origin feature/your-feature-name
# Open PR → develop
```

---

## 6. Branch Strategy (GitFlow-inspired)

| Branch | Purpose | Merges into | Who creates |
|---|---|---|---|
| `main` | Production — live at portal.aifun.ai.vn | — | release/* only |
| `develop` | Integration — always green | main (via release) | — |
| `feature/*` | New features and refactors | develop | Developers |
| `hotfix/*` | Critical production bugs | main + develop | Lead dev |
| `release/*` | Stabilization before production | main | Lead dev |
| `chore/*` | Dependencies, config, docs | develop | Developers |

### Naming Conventions
```
feature/v4-sidebar-navigation
feature/builder-modal-step3
feature/marketplace-install-flow
hotfix/fix-gas-timeout-handling
hotfix/fix-spreadsheet-id-typo
release/v4.0.0
release/v4.1.0
chore/update-design-tokens
chore/add-clasp-config
```

### Release Flow
```
develop → release/vX.Y.Z → main (tag vX.Y.Z) + back-merge to develop
```

### Hotfix Flow
```
main → hotfix/fix-name → main (tag vX.Y.Z+1) + back-merge to develop
```

### Commit Message Format (Conventional Commits)
```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**
- `feat` — new feature visible to users
- `fix` — bug fix
- `refactor` — code change with no behavior change
- `style` — CSS/visual only, no logic change
- `docs` — documentation only
- `chore` — build, config, dependencies
- `test` — adding or updating tests
- `perf` — performance improvement

**Examples:**
```
feat(builders): add SOP builder form validation
fix(gas): handle 90s timeout with retry logic
refactor(sheets): extract cache into separate module
style(dashboard): update welcome banner gradient
docs(claude): add V4 repository structure
chore: add clasp config for GAS version control
```

---

## 7. Coding Standards

### JavaScript
- **No framework** for V4 initial release — Vanilla JS ES modules only
- Use `type="module"` on all `<script>` tags for module files
- Prefer `const` over `let`; never use `var`
- Use `async/await` over `.then()` chains
- All functions must have a single responsibility
- No inline event handlers (`onclick="..."`) in V4 — use `addEventListener`
- Export only what is consumed by other modules
- No `console.log` in committed code — use a structured logger utility

### HTML
- Semantic elements: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`
- Every interactive element must be keyboard-accessible
- Every image has `alt` text
- Form inputs always paired with `<label for="...">` via matching `id`
- `lang="vi"` on `<html>`

### CSS
- **Design tokens via CSS custom properties** (`--c-primary`, `--surface`, etc.) — never hardcode hex values
- Mobile-first media queries: `@media (min-width: 640px)` upward
- BEM-ish naming for component classes: `.builder-card`, `.builder-card__header`, `.builder-card--installed`
- No `!important` except for utility overrides
- Transitions: always `var(--tr)` (`.16s ease`) — never hardcode durations

### File Size Limits
| File | Max lines | Action if exceeded |
|---|---|---|
| Any single JS module | 400 lines | Split into sub-modules |
| Any single CSS file | 300 lines | Extract component styles |
| `index.html` | 200 lines (V4 shell) | Move logic to modules |

### No-go Patterns
- Never use `eval()` or `new Function()`
- Never use `innerHTML` with user-supplied data (XSS risk)
- Never use `document.write()`
- Never load untrusted third-party scripts
- Never store JWTs in `localStorage` — memory only (access) + httpOnly cookie (refresh)
- Never expose GAS URL or API keys in client-side code without understanding the security implications

---

## 8. UI Principles

All UI work must follow the AIFUN OS V4 Design System. The complete system is documented in the session archive. Key rules:

### Design Tokens (always use, never bypass)
```css
/* Colors */
--c-primary: #6366f1          /* indigo-500 */
--c-primary-h: #4f46e5        /* hover */
--c-primary-l: #eef2ff        /* light bg */
--c-success: #10b981
--c-warning: #f59e0b
--c-danger: #ef4444
--surface: #ffffff             /* cards, panels */
--bg: #f1f5f9                  /* page bg */
--border: #e2e8f0
--text-1: #0f172a              /* primary text */
--text-2: #475569              /* secondary */
--text-3: #94a3b8              /* muted */

/* Radii */
--r-sm: 6px     /* inputs, small buttons */
--r-md: 10px    /* cards */
--r-lg: 14px    /* main cards, modals */
--r-xl: 20px    /* banners */

/* Shadows */
--sh-sm: 0 1px 3px rgba(0,0,0,.08)
--sh-md: 0 4px 12px rgba(0,0,0,.07)
--sh-lg: 0 10px 32px rgba(0,0,0,.09)
```

### Component Rules
- **Buttons:** Primary = one per view max. Danger = irreversible actions only. Always `font-weight: 600`.
- **Inputs:** `1.5px solid var(--border)` border. Focus ring: `0 0 0 3px rgba(99,102,241,.12)`. Error: red border + `role="alert"` on error text.
- **Loading states:** Never leave user without feedback for > 300ms. Show spinner or skeleton.
- **Empty states:** Icon (42px, opacity .45) + title + description + single CTA.
- **Toast:** Bottom-right, max 4 stacked, auto-dismiss 4 seconds, `role="alert"`.
- **Modal:** `role="dialog"` + `aria-modal="true"` + focus trap + Esc to close.

### Accessibility Non-negotiables
- All interactive elements reachable by keyboard (Tab, Shift+Tab, Enter, Space, Esc)
- Focus ring always visible — never `outline: none` without a replacement
- Color is never the only signal — always pair with icon or text
- `aria-label` on all icon-only buttons
- `aria-live="polite"` on dynamic content regions
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text

### Responsive Breakpoints
| Name | Min-width | Behavior |
|---|---|---|
| xs | 0 | 4-col grid, stacked layout |
| sm | 480px | 4-col, slight padding increase |
| md | 640px | 8-col, sidebar collapses to icons |
| lg | 768px | 12-col, full sidebar visible |
| xl | 1024px | Right panel visible |
| 2xl | 1280px | Max content width locked |

### Dark Mode
- Implemented via `[data-dark]` attribute on `<html>`
- All colors via CSS variables — no hardcoded hex in component styles
- Persisted in `localStorage.theme`
- Respect `prefers-color-scheme` as system default

---

## 9. API Principles

### URL Convention
```
/v1/{resource}               GET list
/v1/{resource}/{id}          GET single
/v1/{resource}/{id}/{sub}    GET sub-resource
```

### Authentication
- Access token: JWT RS256, 15-minute TTL, in-memory only (never localStorage)
- Refresh token: 30-day TTL (90-day with "Remember me"), httpOnly cookie
- All protected routes require `Authorization: Bearer {access_token}`
- Workspace context embedded in JWT claims — no separate workspace header

### Request / Response Format
```jsonc
// Success
{
  "data": { ... },
  "meta": { "request_id": "req_xxx", "duration_ms": 42 }
}

// Error
{
  "error": {
    "code": "AI_REQUEST_LIMIT_REACHED",
    "message": "Bạn đã dùng hết AI requests tháng này.",
    "status": 402,
    "request_id": "req_xxx"
  }
}
```

### Pagination (cursor-based)
```
GET /v1/documents?limit=20&cursor=base64_opaque_cursor&sort=created_at&order=desc

Response:
{
  "data": [...],
  "pagination": {
    "has_next": true,
    "has_prev": false,
    "next_cursor": "eyJpZCI6...",
    "total": 142
  }
}
```

### Rate Limiting
| Tier | AI Requests/month | API Requests/min |
|---|---|---|
| Free | 50 | 20 |
| Starter | 200 | 60 |
| Pro | 500 | 120 |
| Enterprise | Custom | Custom |

Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Versioning
- URL path versioning: `/v1/`, `/v2/`
- `Deprecation` and `Sunset` headers for 90-day deprecation window
- Breaking changes always require a new version

### GAS Web App (current backend)
```javascript
// All requests go to one endpoint
POST {gasWebAppUrl}
{
  action: 'generateDocument',
  skillId: 'sop-builder',
  prompt: '...',        // built by buildPrompt(formData)
  title: '...',         // built by buildTitle(formData)
  formData: { ... },
  provider: 'claude',
  folderId: '...',
  spreadsheetId: '...',
  user: 'Diep Chung',
  timestamp: '2026-06-26T...'
}

// Response
{
  fileName: 'SOP_Quy-trinh-onboard.docx',
  docUrl: 'https://docs.google.com/...',
  docId: '...',
  content: '...',
  createdAt: '...'
}
```

---

## 10. Database Principles

> Applies to V4 backend (PostgreSQL). Current V2/V3 has no SQL database.

### Core Rules
- **UUID v4 primary keys** on all tables — never auto-increment integers
- **Soft deletes** via `deleted_at TIMESTAMPTZ` — never `DELETE` user data
- **`created_at` + `updated_at`** on every table, auto-managed by trigger
- **Row-level multi-tenancy** via `workspace_id` on every tenant-scoped table
- **JSONB for flexible config** — `settings JSONB`, `metadata JSONB`, `form_data JSONB`
- **3NF with documented denormalizations** — always comment why a denorm was chosen
- **Indexes on every FK** and every frequently-filtered column

### Naming
- Tables: `snake_case`, plural (`users`, `ai_requests`, `workspace_members`)
- Columns: `snake_case`, singular (`user_id`, `created_at`, `is_active`)
- Indexes: `idx_{table}_{column(s)}` (`idx_documents_workspace_id`)
- Constraints: `uq_{table}_{column}`, `fk_{table}_{ref_table}`

### Audit Logs
- `audit_logs` table is **immutable** — no UPDATE, no DELETE, no soft-delete
- Partitioned by month on `created_at` for query performance
- Every significant user action writes a record — see API Spec for full event catalog

### Migrations
- All schema changes via numbered migration files: `0001_create_users.sql`
- Never modify a migration that has been applied to production
- Always write a corresponding rollback migration

---

## 11. Security Rules

### Non-negotiable Rules (never violate)
1. **No secrets in the repository.** `config.js` currently contains live GAS URL and Spreadsheet ID — this is a known debt. Do not add any new secrets. In V4, all secrets go in environment variables, never in committed files.
2. **Never use `innerHTML` with unsanitized user input.** Always use `textContent` or a sanitization library.
3. **Never `eval()` or `new Function()` with any user-supplied string.**
4. **All API endpoints validate and sanitize input** before any processing.
5. **Passwords: bcrypt with salt rounds ≥ 12.** Never store plain or MD5/SHA1 hashed passwords.
6. **JWT secrets: RS256 asymmetric keys.** Never HS256 with a shared secret in a multi-service architecture.
7. **HTTPS only.** Cloudflare enforces this for the current deployment.
8. **Webhook signatures must be verified** (HMAC-SHA256) before processing payment events.

### Authentication Security
- Access tokens: 15-minute TTL, in-memory only
- Refresh tokens: 30-day TTL, httpOnly + Secure + SameSite=Strict cookie
- Password reset tokens: single-use UUID, 1-hour TTL
- Email verification tokens: single-use UUID, 24-hour TTL
- Account lockout after 10 failed login attempts in 15 minutes
- Rate limit forgot-password endpoint: 3 requests per email per hour

### Google Services Security
- GAS Web App URL should be considered semi-public (it's in a public repo) — treat GAS as a public endpoint
- Do not rely on obscurity of the GAS URL for security
- GAS should validate the request origin/token in V4
- Google Drive folder ID and Spreadsheet ID: rotate if compromised

### OWASP Top 10 — Specific Mitigations
| Risk | Mitigation |
|---|---|
| A01 Broken Access Control | workspace_id check on every DB query; permission system on every endpoint |
| A02 Cryptographic Failures | bcrypt passwords; RS256 JWTs; HTTPS only |
| A03 Injection | Parameterized queries only; never string-concat SQL |
| A04 Insecure Design | Auth flow designed for security first; rate limiting throughout |
| A05 Security Misconfiguration | No default credentials; GAS URL rotation plan |
| A06 Vulnerable Components | Dependency audit monthly; no unnecessary packages |
| A07 Auth Failures | Account lockout; session invalidation on password change |
| A08 Data Integrity | Webhook signature verification; input validation at all boundaries |
| A09 Logging Failures | All auth events logged; audit_logs immutable |
| A10 SSRF | No server-side URL fetching from user input |

---

## 12. AI Integration Rules

### Current Integration (V2/V3)
- Provider: **Claude** (primary), **OpenAI** (fallback via GAS)
- All AI calls go through GAS — the browser never calls Claude directly
- Prompt construction: `SKILL_FORMS[skillId].buildPrompt(formData)` in `skill-forms.js`
- Max output: 4,096 tokens per request

### Prompt Engineering Standards
- Prompts must be written in Vietnamese and instruct Claude to respond in Vietnamese
- Every prompt must include: role/persona, task, context from formData, output format
- Prompts must not ask Claude to hallucinate or fabricate data
- Test prompts against all 8 current builders before merging any `skill-forms.js` change
- Document the expected output format in a comment above `buildPrompt()`

### AI Request Lifecycle (V4)
```
User submits form
    → Client validates (required fields, max lengths)
    → POST /v1/ai-requests (returns 202 + request_id immediately)
    → Background worker calls GAS
    → GAS calls Claude API
    → Claude returns content
    → GAS creates Google Doc + logs to Sheets
    → Worker updates ai_requests record (status: completed)
    → Client polls /v1/ai-requests/{id}/status
    → UI shows result
```

### AI Usage Rules
- **Max retries:** 3 per request (exponential backoff: 2s, 4s, 8s)
- **Timeout:** 90 seconds per GAS call
- **Quota enforcement:** check before inserting ai_requests, decrement atomically
- **Cost tracking:** log `prompt_tokens`, `completion_tokens`, `cost_usd` on every request
- **Provider fallback:** Claude → OpenAI → error (never silent fallback without logging)
- **Content filtering:** GAS should not process prompts that request harmful content

### Model Selection (V4)
| Use case | Model | Reason |
|---|---|---|
| Document generation | claude-sonnet-4-6 | Best quality/cost for long-form |
| Quick prompts | claude-haiku-4-5 | Speed + cost for short outputs |
| Analysis | claude-sonnet-4-6 | Reasoning quality |

---

## 13. Google Services Integration

### Google Apps Script (GAS)
- **Source control:** Use `clasp` CLI to pull `Code.gs` into `gas/Code.gs` in this repo
- **Versioning:** Tag GAS deployments with the same version tag as the repo release
- **Deployment:** Always deploy a new version — never overwrite the current production deployment
- **Secrets in GAS:** Store API keys in GAS Script Properties (not in the script source)
- **Error handling:** GAS must always return valid JSON — catch all exceptions and return `{ error: '...' }`
- **Logging:** Use `console.log()` in GAS — visible in GAS execution logs (Apps Script dashboard)

### Google Sheets API
- **API v4** — browser-side reads via `https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}`
- **Cache TTL:** 5 minutes for all sheet reads (in-memory Map)
- **Cache invalidation:** Manual via `invalidateSheetsCache()` or automatic on TTL expiry
- **Sheet names:** `GENERATED_DOCUMENTS`, `PROMPTS`, `SKILLS`, `SOPS`, `WORKFLOWS`, `PROJECTS`
- **Range format:** Always use named ranges — never hardcode row numbers
- **Quota:** Sheets API has a 300 requests/minute/project limit — batch reads wherever possible

### Google Drive
- **Folder structure:** Each workspace gets its own subfolder under the master AIFUN Drive folder
- **File naming:** `{DocType}_{slug-of-title}_{YYYY-MM-DD}.{ext}`
- **Export formats:** PDF via Drive Export API, DOCX via Drive Export API
- **Permissions:** Docs created by GAS are owned by the GAS service account — share with user's Google account after creation
- **Signed URLs for export:** Generate time-limited signed URLs (15 minutes) rather than streaming large files through the API server

### Google OAuth
- Scopes required: `email`, `profile`, `openid` (for OAuth login)
- For Drive/Docs operations: `drive.file` scope (not full `drive`)
- Never request broader scopes than necessary
- OAuth tokens stored server-side only — never in the browser

---

## 14. Development Workflow

### Starting a New Feature
```bash
# 1. Start from develop
git checkout develop && git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes, test locally
# Open index.html directly in browser for current V2 work
# For V4: live-server or python -m http.server

# 4. Commit with conventional format
git add [specific files — never git add -A blindly]
git commit -m "feat(scope): description"

# 5. Push and open PR
git push origin feature/your-feature-name
gh pr create --base develop
```

### Local Testing (Current V2)
- Open `index.html` directly in Chrome — no build step needed
- Check browser console for errors before committing
- Test all 8 builders end-to-end at least once per week
- Test on mobile viewport (Chrome DevTools 375px width)
- Verify Google Sheets data loads correctly

### Before Every Commit
- [ ] No `console.log()` left in code
- [ ] No hardcoded secrets or API keys
- [ ] No commented-out dead code
- [ ] HTML is valid (W3C checker if significant HTML changes)
- [ ] All interactive elements keyboard-accessible
- [ ] Tested in Chrome (primary) and Firefox (secondary)
- [ ] Mobile viewport tested at 375px

### Environment Variables (V4)
```bash
# .env.local (never committed — add to .gitignore)
VITE_GAS_URL=https://script.google.com/...
VITE_SPREADSHEET_ID=...
VITE_DRIVE_FOLDER_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=postgresql://...
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

---

## 15. Definition of Done

A feature or fix is **Done** only when ALL of the following are true:

### Code Quality
- [ ] Code follows all standards in §7 (Coding Standards)
- [ ] No `console.log`, `debugger`, `TODO` without a linked issue
- [ ] All functions under 40 lines; files under 400 lines
- [ ] No dead code introduced
- [ ] Security rules in §11 not violated

### UI/UX
- [ ] Follows Design System tokens (§8) — no hardcoded colors or sizes
- [ ] All states implemented: default, hover, active, loading, error, empty, success
- [ ] Keyboard navigable
- [ ] Mobile responsive at 375px viewport
- [ ] Dark mode compatible (CSS variables used throughout)

### Testing
- [ ] Manually tested the primary happy path
- [ ] Manually tested all error states visible to the user
- [ ] Tested on Chrome and Firefox
- [ ] Tested on mobile viewport (375px)

### Documentation
- [ ] `PROJECT_STATUS.md` updated if this changes overall project status
- [ ] `CLAUDE.md` updated if this changes architecture, patterns, or principles
- [ ] Commit messages are clear and follow Conventional Commits format

### Review
- [ ] PR has a description explaining WHAT and WHY
- [ ] PR references any related issue or design decision
- [ ] No merge conflicts with base branch

---

## 16. Pull Request Checklist

Every PR to `develop` or `main` must include this checklist in the description:

```markdown
## What does this PR do?
[1-3 sentence description]

## Why is this change needed?
[Business or technical reason]

## Checklist
- [ ] Code follows CLAUDE.md coding standards
- [ ] No secrets or API keys committed
- [ ] No console.log in production code
- [ ] All UI states implemented (loading, error, empty, success)
- [ ] Keyboard accessible
- [ ] Mobile responsive (375px tested)
- [ ] Dark mode compatible
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] No breaking changes to existing functionality
- [ ] PROJECT_STATUS.md updated if needed
- [ ] CLAUDE.md updated if architecture changed

## Screenshots (if UI change)
[Before / After screenshots]

## Test instructions
[Step-by-step to manually verify]
```

---

## 17. Release Checklist

Before merging `release/*` → `main`:

### Pre-release (release/* branch)
- [ ] All features for this release are merged to `develop`
- [ ] Full regression test: all 8 builders work end-to-end
- [ ] Google Sheets data loads correctly
- [ ] Google Drive save works
- [ ] PDF export works
- [ ] Mobile viewport works (375px)
- [ ] `config.js` has correct production `spreadsheetId`, `driveFolderId`, `gasWebAppUrl`
- [ ] `PROJECT_STATUS.md` reflects the new version
- [ ] Version number updated in `config.js` (`app.version`)

### Release
- [ ] Merge `release/*` → `main`
- [ ] Tag release: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Verify GitHub Pages deploys successfully (check Actions tab)
- [ ] Verify `portal.aifun.ai.vn` loads the new version within 5 minutes
- [ ] Smoke test on production: create one document with SOP Builder
- [ ] Merge `release/*` back to `develop`
- [ ] Delete `release/*` branch

### Post-release
- [ ] Announce to team (if applicable)
- [ ] Monitor for errors in the first 30 minutes
- [ ] GAS execution logs checked for any anomalies

---

## 18. Long-term Roadmap

### Now — V4 Foundation (Sprint 1–3)
**Goal:** Refactor V2 dead code, establish V4 module structure, bring GAS into version control.

- Sprint 1: Fix ES module loading, establish `src/` structure, add `clasp` for GAS
- Sprint 2: V4 design system CSS, sidebar/topbar components, routing
- Sprint 3: Builder modal V4 (clean rewrite), all 8 builders migrated

### Near — V4 Core Features (Sprint 4–8)
**Goal:** Full document lifecycle, team features, billing integration.

- Document library with search and filter
- Google Drive two-way sync
- Multi-workspace support with role-based access
- Marketplace v1 (browse + install free items)
- Billing integration (PayOS + Stripe)
- AI History with full usage analytics

### Medium — V4 Platform (Sprint 9–14)
**Goal:** Open platform, API access, partner ecosystem.

- Public API with API key management
- Marketplace partner submissions
- Webhook outbound (notify external systems on document creation)
- Audit log viewer with export
- Advanced team permissions (custom roles)
- Zapier / Make integration

### Long — V5 Intelligence (Beyond Sprint 14)
**Goal:** Proactive AI, not just reactive generation.

- AI-suggested next actions based on workspace activity
- Automated workflow triggers (schedule, event-based)
- Multi-model routing (best model per task type)
- Real-time collaboration on documents
- Mobile app (React Native)

---

## 19. Non-goals

These things are explicitly out of scope for AIFUN OS V4. Do not build them:

- **Real-time chat / messaging** — not a communication tool; use Zalo/Slack for that
- **CRM database** — AIFUN generates CRM content, it is not itself a CRM
- **Email sending** — generate email content, not send emails
- **Video hosting or playback** — document-focused, not media
- **Public website builder** — workspace-only, not public-facing pages
- **Custom domain for workspaces** — not in V4 scope
- **Native desktop or mobile app** — web-first through V4
- **On-premise / self-hosted deployment** — SaaS only for V4
- **Multi-language UI** — Vietnamese-first; English UI is V5+
- **AI training on user data** — user data is never used to train models
- **Direct Claude API access for end users** — always mediated through GAS

---

## 20. Future Modules

These are identified for V5+ and should inform architecture decisions now (design for extensibility, but do not build):

| Module | Description | Target |
|---|---|---|
| **AIFUN CRM** | AI-augmented customer data and pipeline | V5 |
| **AIFUN HR** | HR workflow automation — JD, contracts, onboarding | V5 |
| **AIFUN Finance** | Invoice generation, expense categorization | V5 |
| **AIFUN Learning** | Training course builder and delivery | V5 |
| **AIFUN Analytics** | Cross-workspace AI usage and ROI reporting | V5 |
| **AIFUN Automations** | No-code workflow automation engine | V5 |
| **AIFUN Mobile** | React Native iOS/Android app | V5 |
| **AIFUN API Gateway** | Public API for enterprise integrations | V5 |
| **AIFUN Marketplace Pro** | Paid partner marketplace with revenue share | V5 |
| **AIFUN White Label** | Branded deployments for reseller partners | V6 |

---

## Appendix A — Known Technical Debt

These issues are documented and accepted. Do not create workarounds on top of workarounds — fix them in the designated sprint.

| Issue | Risk | Sprint |
|---|---|---|
| `config.js` contains live secrets in public repo | High | Sprint 1 |
| GAS `Code.gs` has no version control | High | Sprint 1 |
| V3 ES modules loaded without `type="module"` — dead code | Medium | Sprint 1 |
| `_normalizeDocs()` compensates for wrong GAS column order | Medium | Sprint 2 |
| No error boundary — any JS error crashes the whole app | Medium | Sprint 2 |
| No automated tests of any kind | Medium | Sprint 3 |
| `index.html` is 1,043 lines — unmaintainable at this size | Medium | Sprint 1 |
| GAS is a single point of failure with no fallback | Low | Sprint 4 |

---

## Appendix B — Key Contacts & Resources

| Resource | Details |
|---|---|
| Repository | github.com/aifunvn/aifun-ai-portal |
| Production URL | portal.aifun.ai.vn |
| GAS Dashboard | script.google.com (Google Drive → Apps Script) |
| Google Sheets (data) | Spreadsheet ID: `1hsD6pEqWmF7Z46SQrumip-wslTCOU1Jnb4f21hyuTyU` |
| Drive Folder | Folder ID: `1NthsP7JrOCrT5nGeU2j3annqLLDiHBJZ` |
| DNS | Cloudflare — managed separately |
| Support email | support@aifun.ai.vn |

---

*Last updated: 26/06/2026*
*Version: 1.0*
*Author: AIFUN OS Engineering Team*
*Maintained by: Claude Code sessions — update this file whenever architecture changes.*
