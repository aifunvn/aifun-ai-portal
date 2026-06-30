# Sprint 16A — Dashboard UI + Real Data Integration — Release Notes

**Status:** ✅ STABLE — Dashboard UI frozen
**Branch:** develop-v4-sprint16
**Base:** Sprint15-Stable
**Date:** 30/06/2026

---

## Summary

Sprint 16A improves the existing AIFUN OS V4 Dashboard (`src/pages/dashboard.js`) without porting any code from V2. It covers both UI/UX polish and connecting every widget to real Supabase data — these landed together as one stable unit rather than being split into separate UI-only / data-only releases.

## Scope

### UI / UX (skeleton → progressive loading)
- Every Dashboard section ships its own skeleton placeholder (shimmer animation) on mount, replacing the previous blank white boxes.
- Quick Actions render immediately — no remote data dependency, no skeleton wait.
- Each widget swaps skeleton → real content independently with a fade-in transition as its own data arrives, instead of the whole page waiting on one bundled fetch.
- Responsive polish: new breakpoints at 480px (Quick Actions stack vertically) and 380px (KPI grid collapses to 1 column); `.dash-card` hover state; `prefers-reduced-motion` respected for all animations.
- Dark mode verified — all new styles use existing CSS custom properties, no hardcoded colors.

### Real Data Integration
`src/services/dashboard-service.js` was rewritten from static mock data to independent, real-data loaders:

| Widget | Source |
|---|---|
| AI Requests (KPI) | `ai_requests` table, current month count |
| Documents (KPI) | `documents` table, exact count |
| Tokens used (KPI) | `ai_requests` table, summed `total_tokens` |
| AI Builders (KPI) | `marketplace_installs` table, count |
| Recent Documents | `documents` table, real rows |
| Activity feed | Synthesized from `documents` + `ai_requests` (no dedicated workspace-level activity table exists yet — see Known Limitations) |
| Workspace info (plan, remaining requests) | `workspace_usage_limits` table |
| Tokens-by-day chart | `ai_requests` table, client-side 7-day bucketing |

### Independent Widget Loading
Each widget (`_loadWelcome`, `_loadKpis`, `_loadDocs`, `_loadActivity`, `_loadChart`, `_loadBuilders`, `_loadAiStats`) fetches and renders on its own `try/catch`. A failing or slow query for one widget never blocks, delays, or crashes any other widget — verified by forcing a non-existent workspace ID through every loader and confirming all seven widgets still rendered (with graceful empty/error states) and the page never crashed.

### Race Condition Fix
`workspaceStore.subscribe()` fires immediately on `init()` (with whatever workspace state exists at that moment, possibly `null`), then fires again on the real workspace load shortly after. This produced two concurrent, unordered `loadAndRender()` passes — a slow first pass could resolve *after* the second and silently overwrite fresher data with stale fallback values (observed during testing: greeting/plan reverted to defaults after the real data had already rendered correctly).

Fixed with a generation counter (`_gen`): every `loadAndRender()` call captures the generation active at its start, and every widget loader checks `gen !== _gen` before revealing its result — a stale pass's result is silently dropped if a newer pass has since started. Verified by firing two rapid, overlapping workspace updates and confirming only the latest one's data ever reaches the DOM.

## Regression Test Results (against Sprint15-Stable)

| # | Check | Result |
|---|---|---|
| 1 | Dashboard Desktop | PASS |
| 2 | Dashboard Tablet (768px) | PASS |
| 3 | Dashboard Mobile (375px) | PASS |
| 4 | Skeleton loading | PASS |
| 5 | Widget independent loading | PASS |
| 6 | Quick Actions | PASS |
| 7 | Responsive layout | PASS |
| 8 | No console errors | PASS |
| 9 | No race conditions | PASS (generation-token fix verified) |
| 10 | No regressions vs Sprint15-Stable | PASS — `app.js`, `supabase.js`, `workspace-service.js`, `router/`, `v4.html` have zero diff against the `Sprint15-Stable` tag |

## Freeze Notice

Dashboard UI (`src/pages/dashboard.js`, `src/services/dashboard-service.js`, `styles/dashboard.css`) is frozen as of this release. Auth, Session, Router, and Workspace Engine remain frozen from Sprint 15 — none of those files were touched in Sprint 16A.

## Known Limitations / Carried Forward

- No dedicated workspace-level activity log table exists yet — the Activity widget synthesizes its feed from `documents` + `ai_requests` timestamps rather than a real event log. Revisit if a `workspace_activity` table is added later.
- KPI trend indicators (`change`/`positive` arrows) are intentionally omitted (shown as neutral/no-arrow) since no historical comparison data is fetched — avoids fabricating trend numbers.
- Per-builder document counts on the "AI Builders đã cài" cards are not yet computed (shown as 0) — would require grouping `documents` by `builder_id`.

## Next: Sprint 16B / Sprint 17

Sprint 17 begins from this tag and focuses on AI Builders. Auth, Session, Router, and Workspace Engine remain frozen.
