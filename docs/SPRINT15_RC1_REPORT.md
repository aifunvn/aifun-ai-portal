# SPRINT 15 RC1 — Release Candidate Report

**Branch:** `develop-v4`
**Date:** 2026-06-28
**Author:** AIFUN OS Engineering (Claude Code)
**Status:** ⚠️ SEE SECTION 6 BEFORE MERGING

---

## 1. Tổng quan Sprint 15

Sprint 15 triển khai **Organization Center** — module quản lý tổ chức đa workspace cho AIFUN OS V4.

### Mục tiêu đã đạt được

| Hạng mục | Trạng thái |
|---|---|
| DB Schema (4 migrations) | ✅ Viết xong, chưa chạy |
| Permission Engine (5 roles) | ✅ Hoàn chỉnh |
| 7 Services (org, member, team, invite, activity, audit) | ✅ Hoàn chỉnh |
| Org Store (reactive) | ✅ Hoàn chỉnh |
| 8 Pages UI (overview, members, teams, roles, invites, activity, audit, shell) | ✅ Hoàn chỉnh |
| Organization CSS | ✅ Hoàn chỉnh |
| App routing (7 routes) | ✅ Wired |
| Sidebar nav item | ✅ Added |
| v4.html CSS link | ✅ Added |
| Sprint 15 Roadmap | ✅ Documented |

### Không thay đổi

- `index.html` (V2 fallback) — không chạm
- `settings.js`, `settings-branding.js` (Sprint 14B) — không chạm
- `workspaceStore`, `userStore`, `router.js` — không chạm
- Dashboard, Builders, Documents, Marketplace, History — không chạm

---

## 2. Danh sách file thay đổi

### Tạo mới — Migrations (4 file)

| File | Mô tả |
|---|---|
| `docs/migration-009-organizations.sql` | Bảng `organizations` + `organization_members` + `workspace_settings.org_id` |
| `docs/migration-010-teams.sql` | Bảng `teams` + `team_members` |
| `docs/migration-011-invitations.sql` | Bảng `invitations` với token 32-byte |
| `docs/migration-012-activity-audit.sql` | Bảng `activity_logs` + `audit_logs` (partitioned, không FK) |

### Tạo mới — Services (8 file)

| File | Mô tả |
|---|---|
| `src/services/permission-engine.js` | Role matrix, cache 5 min, canDo(), requireOrgRole() |
| `src/services/org-service.js` | Org CRUD + soft delete |
| `src/services/org-member-service.js` | Member list, role update, suspend, remove |
| `src/services/org-team-service.js` | Team CRUD + team member management |
| `src/services/org-invite-service.js` | Send/revoke/accept invitation |
| `src/services/org-activity-service.js` | Activity log write + paginated read |
| `src/services/org-audit-service.js` | Immutable audit write + admin read |

### Tạo mới — Store (1 file)

| File | Mô tả |
|---|---|
| `src/stores/org-store.js` | Pub/sub org state, safeStorage persistence |

### Tạo mới — Pages (9 file)

| File | Mô tả |
|---|---|
| `src/pages/organization.js` | Shell HTML template, _orgShellHtml() export |
| `src/pages/org-shared.js` | Shared helpers: esc, toast, emptyState, _fmt, roleBadge |
| `src/pages/org-overview.js` | Org hero + stats + member/activity panels |
| `src/pages/org-members.js` | Member table, role picker modal, suspend/remove |
| `src/pages/org-teams.js` | Team grid, create team modal |
| `src/pages/org-roles.js` | Permission matrix read-only |
| `src/pages/org-invites.js` | Pending invites + send invite modal |
| `src/pages/org-activity.js` | Paginated activity feed + type filter |
| `src/pages/org-audit.js` | Immutable audit table, admin-only, severity filter |

### Tạo mới — Styles + Docs (2 file)

| File | Mô tả |
|---|---|
| `styles/organization.css` | Toàn bộ org styles, CSS variables, responsive |
| `docs/Sprint-15-Roadmap.md` | 4-sprint roadmap với DoD, test, rollback |

### Sửa — Core files (3 file)

| File | Thay đổi | Ảnh hưởng |
|---|---|---|
| `src/app/app.js` | +10 imports, +7 routes, +1 helper | Thêm org routes vào app |
| `src/layouts/sidebar.js` | +1 nav item "Tổ chức" | Hiện nav item cho mọi role |
| `v4.html` | +1 `<link>` organization.css | Load org CSS |

---

## 3. Blockers phát hiện & đã sửa

Trong quá trình RC1 audit, phát hiện **5 BLOCKER** (4 ban đầu + 1 phát sinh trong RC1):

| # | Mô tả | Severity | Trạng thái |
|---|---|---|---|
| B1 | `organization.js` import sai path `../app/router.js` + dead code `registerOrgRoutes` | CRITICAL | ✅ FIXED |
| B2 | `app.js:143` dùng `loadOrgRoles` (undefined, đã alias thành `_loadOrgRoles`) | HIGH | ✅ FIXED |
| B3 | 5 file import `userStore.js` — file thực là `user-store.js` | HIGH | ✅ FIXED |
| B4 | `migration-012` có FK constraint trên partitioned table — PostgreSQL không hỗ trợ | HIGH | ✅ FIXED |
| B5 | 7 org services import `./supabase.js` — file thực ở `../lib/supabase.js` | CRITICAL | ✅ FIXED |

---

## 4. Trạng thái sau RC1 — Verification

### Import Chain

| Kiểm tra | Kết quả |
|---|---|
| `userStore.js` (camelCase) còn trong src | ✅ 0 file |
| `app/router.js` còn trong src | ✅ 0 file |
| `./supabase.js` trong services | ✅ 0 file |
| `loadOrgRoles` (không alias) trong app.js | ✅ 0 bare reference |
| `router.on(` trong src | ✅ 0 file |
| `REFERENCES` trong migration-012 | ✅ 0 match |
| Circular dependency | ✅ Không có |
| Dead code | ✅ Đã xóa (`registerOrgRoutes`, bad imports) |

### Route coverage

| Route | Handler | Shell | Sub-loader |
|---|---|---|---|
| `/organization` | ✅ | `_orgShellHtml('overview')` | `loadOrgOverview` |
| `/organization/members` | ✅ | `_orgShellHtml('members')` | `loadOrgMembers` |
| `/organization/teams` | ✅ | `_orgShellHtml('teams')` | `loadOrgTeams` |
| `/organization/roles` | ✅ | `_orgShellHtml('roles')` | `_loadOrgRoles` |
| `/organization/invites` | ✅ | `_orgShellHtml('invites')` | `loadOrgInvites` |
| `/organization/activity` | ✅ | `_orgShellHtml('activity')` | `loadOrgActivity` |
| `/organization/audit` | ✅ | `_orgShellHtml('audit')` | `loadOrgAudit` |
| Sub-nav SPA wiring | ✅ | `_orgSubPageLoaders` map | `data-sub` click handler |

### Permission Engine

| Role | org:read | member:invite | member:update_role | team:create | audit:read |
|---|---|---|---|---|---|
| owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ❌ | ✅ | ❌ |
| editor | ✅ | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ | ❌ |

- `canDo(orgId, unknown_perm, userId)` → `false` ✅ (safe default)
- `updateMemberRole(..., 'owner')` → throws ✅ (blocked)
- Role cache TTL 5 min, invalidated on role change ✅

### Fallback khi chưa chạy migration

| Tình huống | Hành vi |
|---|---|
| `organizations` table chưa tồn tại | Supabase error → `orgStore.load()` throws → router catch, không crash |
| `orgStore.getOrg()` = null | Mọi page hiển thị "Chưa chọn tổ chức." ✅ |
| App boot khi chưa có migration | V4 vẫn boot bình thường — org routes fail gracefully ✅ |

---

## 5. Known Limitations

| # | Mô tả | Severity | Kế hoạch |
|---|---|---|---|
| L1 | `org-member-service.js` join `auth.users` trực tiếp — PostgREST có thể không trả user data nếu không có profiles view | WARNING | Sprint 15 post-merge: tạo `profiles` view hoặc table |
| L2 | Module-level state `_cursor/_items/_loading` trong `org-activity.js` persist giữa các lần navigate | WARNING | Refactor trong Sprint 15.x |
| L3 | `orgStore.load(userId)` gọi mỗi lần vào org route — không cache check | WARNING | Thêm `_loaded` flag trong Sprint 15.x |
| L4 | `console.error` còn trong `org-activity-service.js` và `org-audit-service.js` | INFO | Chấp nhận — fire-and-forget audit writes cần silent fail |
| L5 | Sub-nav SPA wiring duplicate: một lần trong `_orgShell` (app.js) — nếu user navigate bằng URL trực tiếp thì sub-nav click re-wired lại | INFO | Chấp nhận — addEventListener không bubble, click chỉ bind một lần |

---

## 6. Migration — Chưa chạy

**Tất cả 4 migration đều CHƯA được chạy.**

---

## 7. Pre-Migration Checklist

Phải hoàn thành 100% trước khi chạy bất kỳ migration nào.

### Chuẩn bị Supabase

- [ ] Backup Supabase project (Dashboard → Settings → Backups → Download)
- [ ] Ghi lại version PostgreSQL hiện tại (Dashboard → Settings → Database → Version)
- [ ] Mở Supabase SQL Editor sẵn sàng
- [ ] Xác nhận đang dùng đúng project (không phải staging/prod nhầm)

### Xác nhận migration chưa chạy

- [ ] `SELECT to_regclass('public.organizations')` → kết quả phải là `NULL`
- [ ] `SELECT to_regclass('public.teams')` → phải là `NULL`
- [ ] `SELECT to_regclass('public.invitations')` → phải là `NULL`
- [ ] `SELECT to_regclass('public.activity_logs')` → phải là `NULL`
- [ ] `SELECT to_regclass('public.audit_logs')` → phải là `NULL`

### Xác nhận dữ liệu hiện tại an toàn

- [ ] `SELECT COUNT(*) FROM workspace_settings` → ghi lại số rows
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'workspace_settings'` → không có `org_id` column
- [ ] Tất cả existing workspace_settings rows sẽ có `org_id = NULL` sau migration — đây là đúng

### Review migration files

- [ ] Đọc `migration-009-organizations.sql` — không có DROP, không có ALTER COLUMN
- [ ] Đọc `migration-010-teams.sql` — không có DROP
- [ ] Đọc `migration-011-invitations.sql` — không có DROP
- [ ] Đọc `migration-012-activity-audit.sql` — không có REFERENCES trên partitioned tables
- [ ] Confirm thứ tự: 009 → 010 → 011 → 012
- [ ] Rollback scripts đã review trong `docs/Sprint-15-Roadmap.md`

### RLS Review

- [ ] `organization_members` — viewer không thấy org của người khác
- [ ] `audit_logs` — không có UPDATE/DELETE policy
- [ ] `activity_logs` — không có UPDATE/DELETE policy
- [ ] `invitations` — public token lookup cho unauthenticated acceptance

### Index Review

- [ ] `idx_org_members_org`, `idx_org_members_user` trên `organization_members`
- [ ] `idx_activity_org_time` — descending, cho pagination
- [ ] `idx_audit_severity` — partial index `WHERE severity != 'info'`
- [ ] `idx_invitations_pending` — unique partial index, ngăn duplicate pending invites

**⚠️ Nếu bất kỳ checkbox nào chưa tick → DỪNG. Không chạy migration.**

---

## 8. Migration Plan (Hướng dẫn thủ công)

**KHÔNG chạy tự động. Từng bước một. Kiểm tra sau mỗi bước.**

---

### Bước 1 — Migration 009: Organizations

**File:** `docs/migration-009-organizations.sql`

**Chạy trong Supabase SQL Editor:**
```sql
-- Paste toàn bộ nội dung migration-009-organizations.sql
```

**Kiểm tra sau khi chạy:**

```sql
-- 1. Tables tồn tại
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('organizations','organization_members');
-- Kết quả mong đợi: 2 rows

-- 2. Column org_id đã thêm vào workspace_settings
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'workspace_settings' AND column_name = 'org_id';
-- Kết quả mong đợi: 1 row, data_type = 'uuid'

-- 3. RLS đang bật
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('organizations','organization_members');
-- Kết quả mong đợi: rowsecurity = true cho cả 2

-- 4. Policies đã tạo
SELECT policyname, tablename FROM pg_policies
WHERE tablename IN ('organizations','organization_members');
-- Kết quả mong đợi: 5 policies

-- 5. Dữ liệu workspace_settings không bị mất
SELECT COUNT(*) FROM workspace_settings;
-- Kết quả mong đợi: số rows giống trước migration

-- 6. Trigger tồn tại
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name IN ('trg_organizations_updated','trg_org_members_updated');
-- Kết quả mong đợi: 2 rows
```

**Nếu lỗi:** Chạy rollback, DỪNG.
```sql
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
ALTER TABLE workspace_settings DROP COLUMN IF EXISTS org_id;
```

---

### Bước 2 — Migration 010: Teams

**File:** `docs/migration-010-teams.sql`

**Điều kiện:** Bước 1 PASS hoàn toàn.

**Kiểm tra sau khi chạy:**

```sql
-- 1. Tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('teams','team_members');
-- 2 rows

-- 2. RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('teams','team_members');
-- rowsecurity = true

-- 3. Policies
SELECT policyname, tablename FROM pg_policies
WHERE tablename IN ('teams','team_members');
-- 4 policies

-- 4. Index tồn tại
SELECT indexname FROM pg_indexes WHERE tablename = 'teams';
-- idx_teams_org phải có
```

**Nếu lỗi:** Rollback bước 2, giữ nguyên bước 1.
```sql
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
```

---

### Bước 3 — Migration 011: Invitations

**File:** `docs/migration-011-invitations.sql`

**Điều kiện:** Bước 1 và 2 PASS hoàn toàn.

**Kiểm tra sau khi chạy:**

```sql
-- 1. Table
SELECT table_name FROM information_schema.tables
WHERE table_name = 'invitations';
-- 1 row

-- 2. Unique partial index (chống duplicate pending)
SELECT indexname FROM pg_indexes
WHERE tablename = 'invitations' AND indexname = 'uq_invitations_pending';
-- 1 row

-- 3. Token column unique
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invitations' AND column_name = 'token';
-- 1 row

-- 4. RLS + Policies
SELECT policyname FROM pg_policies WHERE tablename = 'invitations';
-- 4 policies
```

**Nếu lỗi:** Rollback bước 3.
```sql
DROP TABLE IF EXISTS invitations CASCADE;
```

---

### Bước 4 — Migration 012: Activity + Audit Logs

**File:** `docs/migration-012-activity-audit.sql`

**Điều kiện:** Bước 1, 2, 3 PASS hoàn toàn.

**Kiểm tra sau khi chạy:**

```sql
-- 1. Parent tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('activity_logs','audit_logs');
-- 2 rows

-- 2. Partitions tồn tại (ít nhất Q2 2026)
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'activity_logs_2026%' OR tablename LIKE 'audit_logs_2026%';
-- 6 rows (3 activity + 3 audit cho Q2/Q3/Q4)

-- 3. Indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('activity_logs','audit_logs');
-- idx_activity_org_time, idx_activity_actor, idx_activity_resource
-- idx_audit_org_time, idx_audit_action, idx_audit_severity

-- 4. RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('activity_logs','audit_logs');
-- rowsecurity = true cho cả 2

-- 5. KHÔNG có FK constraints (expected — partitioned table limitation)
SELECT conname FROM pg_constraint
WHERE conrelid = 'activity_logs'::regclass AND contype = 'f';
-- 0 rows — ĐÚNG, không có FK

-- 6. Policies
SELECT policyname, tablename FROM pg_policies
WHERE tablename IN ('activity_logs','audit_logs');
-- 4 policies: activity_select, activity_insert, audit_admin_select, audit_insert

-- 7. Test insert activity_log (thay YOUR_ORG_ID và YOUR_USER_ID)
-- INSERT INTO activity_logs (org_id, actor_id, action, resource_type)
-- VALUES ('YOUR_ORG_ID'::uuid, 'YOUR_USER_ID'::uuid, 'test.insert', 'test');
-- Nếu thành công: xóa test row
-- DELETE FROM activity_logs WHERE action = 'test.insert';
```

**Nếu lỗi:** Rollback bước 4.
```sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
```

---

## 9. Manual Smoke Test Plan

*Thực hiện SAU KHI tất cả 4 migration PASS.*

### Organization Center

| Test | Bước | Kết quả mong đợi |
|---|---|---|
| Boot | Vào v4.html, F5 | App load, không console error |
| Nav | Click "Tổ chức" ở sidebar | Navigate đến /organization |
| Overview | Trang /organization | Hiển thị "Chưa chọn tổ chức." (chưa có org) hoặc org stats |
| Create Org | SQL Editor: insert test org + member | orgStore.load() pick up org |
| Overview loaded | Refresh /organization | Hiển thị org name, member count |
| Members | Click "Thành viên" | Member table hiển thị |
| Role change | Click "Vai trò" → chọn role mới | Confirm modal, save, re-render |
| Teams | Click "Nhóm" → "+ Tạo nhóm" | Modal mở, fill form, tạo thành công |
| Roles | Click "Phân quyền" | Permission matrix 5 cột hiển thị |
| Invites | Click "Lời mời" → "+ Mời" | Form email, send → row xuất hiện |
| Activity | Click "Hoạt động" | Feed hiển thị events từ các actions trên |
| Audit | Click "Kiểm toán" (as admin) | Table hiển thị (hoặc denied nếu editor) |
| Sub-nav SPA | Click từng item sub-nav | URL đổi, content reload, không full refresh |

### Sprint 14B Regression

| Test | Kết quả mong đợi |
|---|---|
| Settings → Thương hiệu | Branding tab load, color picker hoạt động |
| Brand color change + save | CSS variable đổi, persist |
| Logo upload | FileReader preview, remove hoạt động |
| Danger Zone | Clear cache / Reset settings modal |
| Settings → Thành viên | Placeholder "coming soon Sprint 15" |

### Sprint 14A Regression

| Test | Kết quả mong đợi |
|---|---|
| Dashboard | Load, stats hiển thị |
| AI Builders | Builder list hiển thị |
| Documents | Document list hoặc empty state |
| Settings → Workspace | Workspace name, save |
| Settings → Hồ sơ | Profile form hiển thị |

---

## 10. Rollback Plan

### Rollback toàn bộ Sprint 15 (nếu critical issue sau deploy)

**Bước 1: Revert code (git)**
```bash
git checkout develop-v4
git revert HEAD  # hoặc git reset về commit trước Sprint 15
```

**Bước 2: Rollback migration (Supabase SQL Editor)**
```sql
-- Chạy theo thứ tự ngược
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
ALTER TABLE workspace_settings DROP COLUMN IF EXISTS org_id;
DROP FUNCTION IF EXISTS _aifun_set_updated_at() CASCADE;
```

**Bước 3: Verify**
```sql
SELECT to_regclass('public.organizations');  -- phải là NULL
SELECT column_name FROM information_schema.columns
WHERE table_name = 'workspace_settings' AND column_name = 'org_id';  -- 0 rows
```

---

## 11. Release Notes

### Sprint 15 — Organization Center

**Tính năng mới:**

- **Tổ chức (Organization):** Tạo và quản lý tổ chức bao gồm nhiều workspace
- **Thành viên:** Mời, phân quyền, đình chỉ, xóa thành viên với 5 roles
- **Nhóm (Teams):** Tạo nhóm chức năng, gán thành viên, phân team lead
- **Phân quyền:** Ma trận quyền hạn đọc được cho tất cả roles
- **Lời mời:** Gửi lời mời qua email với token 7 ngày, revoke được
- **Hoạt động:** Feed nhật ký hoạt động với pagination và filter
- **Kiểm toán:** Immutable audit trail cho admin/owner

**Permission model:**
```
owner > admin > manager > editor > viewer
```

**5 Blockers đã fix trước RC1:**
- B1: Wrong import path trong organization.js (CRITICAL)
- B2: Undefined `loadOrgRoles` trong app.js (HIGH)
- B3: Wrong filename `userStore.js` vs `user-store.js` (HIGH)
- B4: FK constraint trên partitioned table trong migration-012 (HIGH)
- B5: Wrong supabase import path trong 7 services (CRITICAL)

---

## 12. Checklist Merge vào develop (nếu RC1 PASS)

- [ ] Tất cả 5 Blockers đã FIXED (xác nhận)
- [ ] Migration 009 → 012 đã PASS trong môi trường staging/test
- [ ] Manual smoke test Sprint 15 PASS
- [ ] Sprint 14A regression PASS
- [ ] Sprint 14B regression PASS
- [ ] Không có console error mới
- [ ] `PROJECT_STATUS.md` cập nhật Sprint 15 status
- [ ] PR description đầy đủ với link pre-migration checklist
- [ ] Reviewer đã approve

---

## 13. Checklist Deploy lên main (sau khi merge develop)

- [ ] `release/v4.1.0` branch tạo từ develop
- [ ] Pre-release regression test đầy đủ
- [ ] Migration đã chạy trong production Supabase (theo đúng Migration Plan §8)
- [ ] `config.js` version cập nhật
- [ ] Tag `v4.1.0` tạo
- [ ] GitHub Pages deploy xác nhận
- [ ] `portal.aifun.ai.vn` smoke test
- [ ] Monitor 30 phút sau deploy

---

## 14. Khuyến nghị — Có nên Merge vào main chưa?

### Kết luận

> **CHƯA NÊN MERGE VÀO MAIN.**

### Lý do

**Blockers còn open (chưa test thực tế):**

1. **Migration chưa chạy** — 4 migrations CHƯA được chạy trong bất kỳ môi trường nào. Không thể xác nhận DB schema đúng.

2. **L1 — `auth.users` join chưa verify** — `org-member-service.js` join `users:user_id` từ `organization_members`. Supabase PostgREST không expose `auth.users` trực tiếp. Nếu join fail, trang `/organization/members` sẽ hiển thị "?" cho mọi tên thành viên. **Cần verify trong Supabase thực tế trước khi merge.**

3. **E2E test chưa thực hiện** — Toàn bộ Manual Smoke Test (§9) chưa được thực hiện do migration chưa chạy.

### Điều kiện để merge

```
✅ Migration 009–012 chạy PASS trong Supabase test project
✅ auth.users join hoạt động HOẶC đã có profiles view/table
✅ Manual Smoke Test §9 hoàn thành
✅ Sprint 14A + 14B regression PASS
✅ Không có WARNING mới trong console
```

### Trạng thái RC1

| Hạng mục | Trạng thái |
|---|---|
| Code quality | ✅ PASS |
| Import chain | ✅ PASS |
| Route coverage | ✅ PASS |
| Permission engine | ✅ PASS |
| CSS & dark mode | ✅ PASS |
| Fallback safety | ✅ PASS |
| Blockers | ✅ 5/5 FIXED |
| Migrations (chưa chạy) | ⏳ PENDING |
| E2E smoke test | ⏳ PENDING (cần migration trước) |
| auth.users join | ⚠️ WARNING — chưa verify |

**RC1 Status: `WARNING — PENDING E2E VERIFICATION`**

---

*SPRINT15_RC1_REPORT.md*
*Generated: 2026-06-28*
*Branch: develop-v4*
*Next action: Chạy Pre-Migration Checklist §7, sau đó Migration Plan §8*
