# Sprint 13 — AI History Center

**Status:** Complete  
**Date:** 2026-06-27  
**Branch:** develop-v4

---

## Objectives

Record every AI request into Supabase, build a full-featured AI History page, and surface AI usage stats on the dashboard.

---

## What Was Built

### 1. Database — `ai_requests` table

Migration: `supabase/migrations/005_sprint13_ai_history.sql`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| workspace_id | TEXT NOT NULL | Multi-tenant key |
| user_id | UUID | FK → auth.users |
| builder_id | TEXT | e.g. `sop-builder` |
| builder_name | TEXT | Display name |
| provider | TEXT | `claude` / `openai` / `mock` |
| model | TEXT | e.g. `claude-sonnet-4-6` |
| prompt | TEXT | Full prompt sent |
| response_time_ms | INT | Wall-clock request time |
| input_tokens | INT | |
| output_tokens | INT | |
| total_tokens | INT | Computed column (input + output) |
| estimated_cost | NUMERIC(10,6) | USD |
| status | TEXT | `completed` / `failed` / `fallback` |
| error_message | TEXT | Null on success |
| created_at | TIMESTAMPTZ | now() |

**Indexes:** `workspace_created` (DESC), `workspace_status`, `workspace_builder`, `workspace_provider`  
**RLS:** SELECT for workspace members, INSERT for authenticated users

### 2. Services

**`src/services/ai-history-db.js`**
- `estimateCost(input, output, provider)` — Claude Sonnet 4.6: ($3/M input + $15/M output)
- `insertRequest(entry)` — upsert to ai_requests
- `listRequests(workspaceId, opts)` — paginated with query/builder/provider/status/dateFrom/dateTo/sort filters
- `getStats(workspaceId)` — 5 parallel queries: today cost/tokens, month cost/tokens/count, failedCount, topBuilders (top 5), topProviders (top 5)

**`src/services/ai-history-service.js`**
- `recordRequest(entry)` — fire-and-forget insert (`.catch(() => {})`, never blocks UI)
- `listHistory(workspaceId, opts)` — calls listRequests, in-memory Map fallback on error
- `getHistoryStats(workspaceId)` — calls getStats, fallback to cache-derived stats

### 3. UI Components

**`src/components/history-list.js`**
- `render(requests)` — 6-column table: Builder·Provider, Tokens, Cost, Time(ms), Status, Age
- `renderEmpty(message)` — empty state with clock icon
- `renderPagination({ page, total, limit })` — prev/next with page counter
- `statusBadge(status)` — completed=green / failed=red / fallback=yellow
- `fmtMs(ms)` — formats response time (`1.4s` or `840ms`)
- `fmtCost(usd)` — formats cost (`$0.0012` or `<$0.001`)

**`src/pages/history.js`**
- 5 filter controls: search text, builder select, provider select, status select, date range
- `showList()` — renders loading → fetches → renders list or empty state
- Pagination with page state
- Workspace subscription via `workspaceStore.subscribe()`

**`styles/history.css`**
- `.hist-*` classes for table, rows, badges, empty state, pagination
- `.ai-stat-*` classes for dashboard widget
- Full dark mode via `[data-dark]` selectors
- Responsive at 768px breakpoint

### 4. Runtime Recording

**`src/services/runtime-service.js`** — added `recordRequest()` calls:
- Success path: records `completed` with full token and cost data
- Failure path: records `failed` with error message
- Fallback path: records `fallback` (Claude → OpenAI fallback)
- `response_time_ms` measured with `Date.now()` before/after pipeline

### 5. Dashboard Integration

**`src/services/dashboard-service.js`** — `getHistoryStats()` added to `Promise.all()`

**`src/pages/dashboard.js`** — `#dash-ai-stats` section with:
- Tổng yêu cầu (month), Tổng tokens (month), Chi phí hôm nay, Yêu cầu thất bại
- Top Builders table (top 5), Top Providers table (top 5)
- Warn state (orange border) when `failedCount > 0`

### 6. Navigation

**`src/layouts/sidebar.js`** — "AI History" nav item added with clock SVG icon, `dashboard:read` permission  
**`src/app/app.js`** — `/history` route registered  
**`v4.html`** — `<link rel="stylesheet" href="/styles/history.css">` added

---

## Cost Estimation Formula

```
Claude Sonnet 4.6:
  cost = (inputTokens × $3 + outputTokens × $15) / 1,000,000

Claude Haiku 4.5:
  cost = (inputTokens × $0.25 + outputTokens × $1.25) / 1,000,000

OpenAI GPT-4o:
  cost = (inputTokens × $2.50 + outputTokens × $10) / 1,000,000
```

---

## Files Modified

| File | Change |
|---|---|
| `supabase/migrations/005_sprint13_ai_history.sql` | Created — ai_requests table |
| `src/services/ai-history-db.js` | Created — DB layer |
| `src/services/ai-history-service.js` | Created — service layer |
| `src/components/history-list.js` | Created — table component |
| `src/pages/history.js` | Created — history page |
| `styles/history.css` | Created — page styles |
| `src/services/runtime-service.js` | Modified — recordRequest integration |
| `src/layouts/sidebar.js` | Modified — History nav item |
| `src/services/dashboard-service.js` | Modified — aiStats parallel query |
| `src/pages/dashboard.js` | Modified — AI stats widget |
| `src/app/app.js` | Modified — /history route |
| `v4.html` | Modified — history.css link |

---

## Verification Checklist

- [x] `ai_requests` table created with correct columns and constraints
- [x] RLS: SELECT for workspace members, INSERT for authenticated
- [x] `recordRequest()` is fire-and-forget — never blocks UI
- [x] History page loads at `/v4.html#/history`
- [x] Search filter narrows by builder name
- [x] Builder / Provider / Status / Date filters apply independently
- [x] Pagination shows correct page count
- [x] Empty state renders when no results
- [x] Dashboard AI stats section visible at `/v4.html#/dashboard`
- [x] Failed requests count shows warn color when > 0
- [x] Dark mode: all hist-* and ai-stat-* classes use CSS variables
- [x] V2 files untouched (`index.html`, `config.js`, `skill-engine.js`, `skill-forms.js`)

---

## Known Limitations

- Token counts from GAS are estimated (GAS returns raw content, not token counts from Claude API) — `runtime-service.js` uses `null` until GAS exposes token metadata
- Cost estimates are approximate USD; VNĐ conversion not implemented in Sprint 13
- History page does not support bulk delete (Sprint 14 scope)
