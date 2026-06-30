# Sprint 15 — Organization Center

**Goal:** Production-ready multi-tenant Organization layer with members, teams, roles, invitations, activity feed, and immutable audit trail.

**Start branch:** `develop-v4` (no merge to `main` until all sprints PASS)

---

## Sprint 15.1 — DB Foundation

### Scope
- Migration 009: organizations + organization_members + workspace_settings.org_id
- Migration 010: teams + team_members
- Migration 011: invitations
- Migration 012: activity_logs + audit_logs (partitioned)

### Checklist
- [ ] Run migration-009 in Supabase SQL Editor — verify no errors
- [ ] Run migration-010 — verify no errors
- [ ] Run migration-011 — verify no errors
- [ ] Run migration-012 — verify no errors
- [ ] RLS: confirm `organization_members` viewer cannot select from other orgs
- [ ] RLS: confirm `audit_logs` no DELETE policy exists
- [ ] Confirm `organizations` soft delete (deleted_at) does not cascade to audit_logs

### Definition of Done
- All 4 migrations applied with zero errors
- Supabase Table Editor shows all tables with correct columns
- RLS policies visible and active in Supabase Auth → Policies view
- No data in existing tables (workspace_settings, etc.) lost or corrupted

### Manual Test
1. Insert a row into `organizations` via Supabase SQL Editor
2. Insert matching row into `organization_members`
3. Query as authenticated user — row visible
4. Query as different authenticated user — no rows returned (RLS working)
5. Attempt `DELETE FROM audit_logs WHERE ...` — should fail (no policy)

### Rollback Plan
```sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
ALTER TABLE workspace_settings DROP COLUMN IF EXISTS org_id;
```

---

## Sprint 15.2 — Services & Permission Engine

### Scope
- `src/services/permission-engine.js` — role matrix, cache, getOrgRole, canDo
- `src/services/org-service.js` — org CRUD
- `src/services/org-member-service.js` — member management
- `src/services/org-team-service.js` — team CRUD + team members
- `src/services/org-invite-service.js` — send/revoke/accept invitations
- `src/services/org-activity-service.js` — activity log write + paginated read
- `src/services/org-audit-service.js` — immutable audit write + read
- `src/stores/org-store.js` — reactive org state

### Checklist
- [ ] `permission-engine.js` — canDo('member:invite') returns true for manager
- [ ] `permission-engine.js` — canDo('audit:read') returns false for editor
- [ ] `permission-engine.js` — role cache TTL 5 min, invalidated after role update
- [ ] `org-service.js` — createOrg also inserts owner into organization_members
- [ ] `org-member-service.js` — updateMemberRole rejects 'owner' assignment
- [ ] `org-invite-service.js` — acceptInvite inserts member + marks accepted_at
- [ ] `org-audit-service.js` — writeAudit never throws (only console.error)
- [ ] `org-store.js` — subscribe fires immediately with current value

### Definition of Done
- All 7 service files pass manual console testing
- No TypeErrors or unhandled promise rejections in browser console
- `orgStore.load(userId)` resolves with correct org array (empty array if no orgs)

### Manual Test (browser console with `await import(...)`)
```js
const { canDo, getOrgRole } = await import('/src/services/permission-engine.js');
const role = await getOrgRole('ORG_ID', 'USER_ID');
console.log(role); // 'owner' | 'admin' | etc | null
console.log(await canDo('ORG_ID', 'member:invite', 'USER_ID')); // true/false
```

### Rollback Plan
Delete service files — no DB changes in this sprint.

---

## Sprint 15.3 — UI Pages

### Scope
- `src/pages/org-shared.js` — shared helpers
- `src/pages/org-overview.js` — org hero + stats + mini panels
- `src/pages/org-members.js` — table with role change / suspend / remove
- `src/pages/org-teams.js` — team grid + create modal
- `src/pages/org-roles.js` — permission matrix (read-only)
- `src/pages/org-invites.js` — pending list + send invite modal
- `src/pages/org-activity.js` — paginated feed + type filter
- `src/pages/org-audit.js` — immutable table, admin-only, severity filter
- `src/pages/organization.js` — shell with sub-nav + SPA routing
- `styles/organization.css` — all org styles

### Checklist
- [ ] /organization loads org-overview with correct stats
- [ ] /organization/members shows member table; role change modal works
- [ ] /organization/members suspend/reactivate/remove buttons work
- [ ] /organization/teams shows team grid; create team modal works
- [ ] /organization/roles shows 5-column permission matrix, all cells correct
- [ ] /organization/invites shows pending list; send invite inserts row; revoke works
- [ ] /organization/activity paginates correctly; type filter works
- [ ] /organization/audit denied for editor; shown for admin with severity filter
- [ ] Sub-nav SPA routing — clicking "Thành viên" loads members without full page reload
- [ ] Mobile 375px — sub-nav wraps horizontally, table scrolls, no overflow clipping
- [ ] Dark mode — all cards, tables, chips render correctly with CSS variables

### Definition of Done
- All 7 pages render without console errors
- Happy path for each page manually tested
- No hardcoded hex colors (all use CSS var())
- All interactive elements keyboard-accessible (Tab + Enter)

### Manual Test Steps
1. Navigate to `/organization` — see org name, member count, stat cards
2. Click "Thành viên" in sub-nav — see members table
3. Click "Vai trò" button on a non-self member — pick new role — confirm
4. Click "Nhóm" — click "+ Tạo nhóm" — fill form — create — see team card
5. Click "Phân quyền" — verify owner row has all checkmarks, viewer has fewest
6. Click "Lời mời" — click "+ Mời thành viên" — enter email — send
7. Click "Hoạt động" — see activity items; change type filter
8. As admin: click "Kiểm toán" — see audit table
9. As editor: click "Kiểm toán" — see "không có quyền" message

### Rollback Plan
Delete page files and organization.css — no DB changes.

---

## Sprint 15.4 — Wiring + Integration Test

### Scope
- `src/app/app.js` — register /organization/* routes
- `src/layouts/sidebar.js` — add "Tổ chức" nav item
- `v4.html` — add organization.css link
- End-to-end integration test across entire org flow

### Checklist
- [ ] Sidebar shows "Tổ chức" item for all roles
- [ ] Clicking "Tổ chức" in sidebar navigates to /organization
- [ ] Browser back/forward works correctly between org sub-pages
- [ ] orgStore.load() called before first org page render
- [ ] Activity log entry written after: member role change, team create, invite send
- [ ] No regressions on /dashboard, /builders, /settings (smoke test)
- [ ] No console errors on fresh load (F5) at each org route

### Definition of Done
- Full org flow works end-to-end in Chrome
- No regressions in other routes
- `PROJECT_STATUS.md` updated with Sprint 15 status

### Manual Test (full flow)
1. Log in → sidebar shows "Tổ chức"
2. Click → /organization loads overview
3. Complete Sprint 15.3 manual test checklist
4. Refresh at /organization/members — page loads correctly (no 404)
5. Navigate to /dashboard — sidebar active state updates correctly
6. Navigate back → /organization still loads correctly

### Rollback Plan
Revert `app.js` and `sidebar.js` changes — delete org CSS link from v4.html.

---

## Migration Execution Order

```
migration-009-organizations.sql       ← run first
migration-010-teams.sql               ← depends on 009
migration-011-invitations.sql         ← depends on 009 + 010
migration-012-activity-audit.sql      ← depends on 009
```

## Files Delivered

| File | Status |
|---|---|
| `docs/migration-009-organizations.sql` | ✅ Written |
| `docs/migration-010-teams.sql`         | ✅ Written |
| `docs/migration-011-invitations.sql`   | ✅ Written |
| `docs/migration-012-activity-audit.sql`| ✅ Written |
| `src/services/permission-engine.js`    | ✅ Written |
| `src/services/org-service.js`          | ✅ Written |
| `src/services/org-member-service.js`   | ✅ Written |
| `src/services/org-team-service.js`     | ✅ Written |
| `src/services/org-invite-service.js`   | ✅ Written |
| `src/services/org-activity-service.js` | ✅ Written |
| `src/services/org-audit-service.js`    | ✅ Written |
| `src/stores/org-store.js`              | ✅ Written |
| `src/pages/org-shared.js`             | ✅ Written |
| `src/pages/org-overview.js`           | ✅ Written |
| `src/pages/org-members.js`            | ✅ Written |
| `src/pages/org-teams.js`             | ✅ Written |
| `src/pages/org-roles.js`             | ✅ Written |
| `src/pages/org-invites.js`           | ✅ Written |
| `src/pages/org-activity.js`          | ✅ Written |
| `src/pages/org-audit.js`             | ✅ Written |
| `src/pages/organization.js`          | ✅ Written |
| `styles/organization.css`            | ✅ Written |
| `src/app/app.js` (org routes)        | ✅ Updated |
| `src/layouts/sidebar.js` (nav item)  | ✅ Updated |
| `v4.html` (CSS link)                 | ✅ Updated |

---

*Sprint 15 — Organization Center | AIFUN OS V4*
*All migrations safe to re-run (IF NOT EXISTS throughout)*
*Do NOT run migrations until Sprint 15.1 Checklist manually verified*
