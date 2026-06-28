# Sprint 11 — Builder Marketplace

**Branch:** develop-v4
**Commit:** 26e1a80
**Date:** 2026-06-26

## Objective

Turn AIFUN OS V4 into an installable-builder platform. Users browse a marketplace of AI Builders, install the ones they need, and only those builders appear on the Builders page and Dashboard.

## Deliverables

### Database
- `supabase/migrations/003_sprint11_marketplace.sql`
  - `marketplace_items` — catalog with 5 seeded builders (prompt, sop, youtube, email, sales)
  - `marketplace_installs` — per-workspace installs with `UNIQUE(workspace_id, item_id)` and RLS
  - `marketplace_reviews` — future use, seeded empty

### New files
| File | Purpose |
|---|---|
| `src/services/marketplace-service.js` | listItems / getItem / groupByCategory — Supabase-first with STATIC_ITEMS fallback |
| `src/services/install-service.js` | install / uninstall / listInstalls / isInstalled — optimistic localStorage + Supabase sync; reactive subscribe() |
| `src/components/install-button.js` | Renders install / uninstall / locked button depending on state |
| `src/components/marketplace-card.js` | Card component with plan badge, featured badge, category |
| `src/components/marketplace-detail.js` | Full detail view with back navigation |
| `src/pages/marketplace.js` | Full rewrite — list/detail views, search, category groups, install/uninstall handlers |
| `styles/marketplace.css` | Design-system tokens, grid, cards, detail view, dark mode |
| `src/builders/schemas/email-builder.json` | Email Automation Builder schema |
| `src/builders/schemas/sales-builder.json` | Sales Script Builder schema |

### Updated files
| File | Change |
|---|---|
| `src/builders/registry.js` | Added email-builder and sales-builder schema URLs |
| `src/pages/builders.js` | Filters schema list to installed builders only; empty state with Marketplace link |
| `src/services/dashboard-service.js` | Integrates install-service — real installed builder count and list |
| `src/app/app.js` | initMarketplace() on route; `aifun:navigate` global event listener |
| `v4.html` | Loads marketplace.css |

## Key Design Decisions

**Optimistic install UX:** install/uninstall update localStorage immediately and re-render before the Supabase call resolves. If Supabase fails (e.g. no auth session), localStorage persists the state across reloads.

**No auth required for local installs:** `_LS_KEY = (wsId) => 'aifun_installs_' + wsId` gives each workspace its own storage slot. This works in dev without a Supabase session.

**Static fallback:** `STATIC_ITEMS` in marketplace-service.js mirrors the DB seed exactly, so the Marketplace page works even if Supabase is unreachable.

**Plan-gating on install vs. run:** install-service controls whether a builder is installed. permission-service.isBuilderAccessible() controls whether it can be launched. An installed builder on a downgraded plan shows as locked (plan badge) but remains in the list.

## Verification Steps

1. Open Marketplace — 5 builders appear grouped by category
2. Search "SOP" — filters to 1 result
3. Install "SOP Builder" — card shows green "Da cai" button; toast appears
4. Navigate to Builders — SOP Builder appears
5. Uninstall from Marketplace — SOP Builder disappears from Builders
6. Dashboard — Builders KPI reflects installed count
7. Reload page — install state persists via localStorage
