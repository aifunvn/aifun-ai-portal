# SPRINT 15 RC2 — Migration Execution & E2E Verification

**Branch:** `develop-v4`
**Date:** 2026-06-28
**Prerequisite:** RC1 PASS (5 Blockers fixed, 0 Blockers remaining)
**Status:** ⏳ AWAITING MIGRATION EXECUTION

---

# PHASE 1 — Pre-Migration Checklist

**Mục tiêu:** Xác nhận môi trường Supabase sạch và sẵn sàng trước khi chạy bất kỳ SQL nào.

> ⚠️ **Quy tắc:** Nếu bất kỳ item nào FAIL → DỪNG HOÀN TOÀN. Không tiếp tục.

---

## 1.1 Backup Supabase

Thực hiện backup trước khi bắt đầu.

**Cách thực hiện:**
```
Supabase Dashboard
  → Settings (góc trái dưới)
  → Database
  → Backups
  → Download latest backup hoặc "Create backup"
```

Hoặc dùng `pg_dump` nếu có direct connection:
```bash
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --no-owner --no-acl \
  -f backup_pre_sprint15_$(date +%Y%m%d_%H%M%S).sql
```

**Checklist:**
- [ ] Backup đã tải về thành công
- [ ] Ghi lại thời gian backup: `__________________`
- [ ] Ghi lại file backup: `__________________`

---

## 1.2 Ghi lại trạng thái hiện tại

Chạy trong **Supabase SQL Editor** → Tab mới → Copy kết quả vào checklist.

```sql
-- A. PostgreSQL version
SELECT version();
```
- [ ] Ghi lại version: `__________________`
- [ ] Confirm PostgreSQL ≥ 14 (partitioned tables cần PG 10+, RLS on partitioned cần PG 12+)

```sql
-- B. Số rows trong workspace_settings (ghi lại để verify sau migration)
SELECT COUNT(*) AS ws_count FROM workspace_settings;
```
- [ ] Số rows hiện tại: `__________________`

```sql
-- C. Columns hiện tại của workspace_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workspace_settings'
ORDER BY ordinal_position;
```
- [ ] KHÔNG có column `org_id` → tiếp tục
- [ ] Nếu CÓ `org_id` → DỪNG (migration 009 đã chạy một phần)

---

## 1.3 Confirm 5 bảng mới CHƯA tồn tại

```sql
SELECT
  to_regclass('public.organizations')        AS organizations,
  to_regclass('public.organization_members') AS organization_members,
  to_regclass('public.teams')                AS teams,
  to_regclass('public.team_members')         AS team_members,
  to_regclass('public.invitations')          AS invitations,
  to_regclass('public.activity_logs')        AS activity_logs,
  to_regclass('public.audit_logs')           AS audit_logs;
```

**Kết quả mong đợi — TẤT CẢ phải là `NULL`:**

| Table | Expected | Actual |
|---|---|---|
| organizations | NULL | `__________________` |
| organization_members | NULL | `__________________` |
| teams | NULL | `__________________` |
| team_members | NULL | `__________________` |
| invitations | NULL | `__________________` |
| activity_logs | NULL | `__________________` |
| audit_logs | NULL | `__________________` |

- [ ] Tất cả 7 giá trị là NULL → tiếp tục
- [ ] Nếu bất kỳ giá trị nào khác NULL → DỪNG (migration đã chạy một phần)

---

## 1.4 Kiểm tra RLS hiện tại

```sql
-- Liệt kê tất cả tables đang có RLS bật (trạng thái trước migration)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
```

- [ ] Ghi lại danh sách tables có RLS: `__________________`
- [ ] Không có `organizations`, `teams`, `invitations` trong danh sách → tiếp tục

---

## 1.5 Kiểm tra Policies hiện tại

```sql
-- Liệt kê tất cả policies hiện tại
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

- [ ] Ghi lại số policies hiện tại: `__________________`
- [ ] Không có policy nào liên quan đến `organizations`, `teams`, `invitations` → tiếp tục

---

## 1.6 Kiểm tra Indexes hiện tại

```sql
-- Liệt kê indexes hiện tại
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

- [ ] Ghi lại số indexes hiện tại: `__________________`
- [ ] Không có `idx_org_*`, `idx_team_*`, `idx_activity_*`, `idx_audit_*` → tiếp tục

---

## 1.7 Kiểm tra Functions hiện tại

```sql
-- Kiểm tra trigger function
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = '_aifun_set_updated_at';
```

- [ ] Kết quả: 0 rows (chưa tồn tại) HOẶC 1 row (đã tồn tại từ trước — OK, migration dùng CREATE OR REPLACE)

---

## 1.8 Xác nhận Rollback Scripts sẵn sàng

Mở file `docs/SPRINT15_RC1_REPORT.md` §10 và confirm:

- [ ] Rollback script cho từng migration đã được đọc
- [ ] Biết cách chạy rollback nếu cần
- [ ] Có quyền DROP TABLE trong Supabase project này

---

## 1.9 Final Gate

> **Chỉ tiếp tục Phase 2 nếu TẤT CẢ items dưới đây đã được tick:**

- [ ] Backup tồn tại
- [ ] PostgreSQL version ≥ 14
- [ ] `workspace_settings` KHÔNG có `org_id`
- [ ] Tất cả 7 bảng mới = NULL (chưa tồn tại)
- [ ] Không có policy org/team/invite
- [ ] Rollback scripts đã đọc
- [ ] Đang dùng đúng Supabase project

**Nếu tất cả PASS → Ghi lại: `Phase 1 PASS — [timestamp]`**

---

---

# PHASE 2 — Migration Plan (Hướng dẫn thủ công từng bước)

> ⚠️ **Quy tắc:**
> - Chỉ chạy **1 migration tại một thời điểm**
> - Paste **toàn bộ nội dung** file SQL vào SQL Editor (không chỉnh sửa)
> - **Verify PASS hoàn toàn** trước khi chạy migration tiếp theo
> - Nếu bất kỳ verify nào FAIL → DỪNG → Rollback → Báo cáo

---

## MIGRATION 009 — Organizations

**File:** `docs/migration-009-organizations.sql`

### Bước 009.1 — Chạy migration

```
Supabase Dashboard → SQL Editor → New Query
→ Paste toàn bộ nội dung migration-009-organizations.sql
→ Click "Run"
```

**Kết quả mong đợi:** `Success. No rows returned.`

Nếu có lỗi → ghi lại → thực hiện Rollback 009 → DỪNG.

---

### Bước 009.2 — Verify Tables

```sql
-- V009-1: Hai bảng chính tồn tại
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'organization_members')
ORDER BY table_name;
```

| Kiểm tra | Expected | Actual | Status |
|---|---|---|---|
| organizations | có trong kết quả | `________` | |
| organization_members | có trong kết quả | `________` | |

- [ ] PASS (2 rows) → tiếp tục
- [ ] FAIL → Rollback 009 → DỪNG

---

### Bước 009.3 — Verify Columns `organizations`

```sql
-- V009-2: Columns của bảng organizations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizations'
ORDER BY ordinal_position;
```

**Kết quả mong đợi (9 columns):**

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| name | text | NO |
| slug | text | NO |
| plan | text | NO |
| owner_id | uuid | NO |
| avatar_url | text | YES |
| description | text | YES |
| seat_limit | integer | NO |
| metadata | jsonb | NO |
| created_at | timestamp with time zone | NO |
| updated_at | timestamp with time zone | NO |
| deleted_at | timestamp with time zone | YES |

- [ ] 12 columns đúng → tiếp tục
- [ ] Thiếu column → Rollback 009 → DỪNG

---

### Bước 009.4 — Verify Column `workspace_settings.org_id`

```sql
-- V009-3: Column org_id đã thêm vào workspace_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workspace_settings'
  AND column_name = 'org_id';
```

| Kiểm tra | Expected | Actual | Status |
|---|---|---|---|
| column_name | org_id | `________` | |
| data_type | uuid | `________` | |
| is_nullable | YES | `________` | |

- [ ] PASS → tiếp tục
- [ ] FAIL → Rollback 009 → DỪNG

---

### Bước 009.5 — Verify workspace_settings data không mất

```sql
-- V009-4: Số rows workspace_settings bằng số trước migration
SELECT COUNT(*) AS ws_count FROM workspace_settings;
```

- [ ] Số rows = số đã ghi ở Phase 1.2 (`__________________`) → tiếp tục
- [ ] Số rows khác → DỪNG → điều tra trước khi tiếp tục

---

### Bước 009.6 — Verify Indexes

```sql
-- V009-5: Indexes đã tạo
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'uq_organizations_slug',
    'idx_organizations_owner',
    'idx_org_members_org',
    'idx_org_members_user',
    'idx_org_members_role',
    'idx_ws_settings_org'
  )
ORDER BY indexname;
```

**Kết quả mong đợi:** 6 rows

| Index | Table | Found |
|---|---|---|
| idx_org_members_org | organization_members | `☐` |
| idx_org_members_role | organization_members | `☐` |
| idx_org_members_user | organization_members | `☐` |
| idx_organizations_owner | organizations | `☐` |
| idx_ws_settings_org | workspace_settings | `☐` |
| uq_organizations_slug | organizations | `☐` |

- [ ] 6/6 indexes → tiếp tục
- [ ] Thiếu index → Rollback 009 → DỪNG

---

### Bước 009.7 — Verify RLS

```sql
-- V009-6: RLS đang bật
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members');
```

| Table | rowsecurity | Expected |
|---|---|---|
| organizations | `________` | true |
| organization_members | `________` | true |

- [ ] Cả 2 = true → tiếp tục
- [ ] Bất kỳ false → Rollback 009 → DỪNG

---

### Bước 009.8 — Verify Policies

```sql
-- V009-7: Policies
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members')
ORDER BY tablename, policyname;
```

**Kết quả mong đợi — 6 policies:**

| Policy | Table | CMD |
|---|---|---|
| org_members_manage | organization_members | ALL |
| org_members_select | organization_members | SELECT |
| org_members_self_insert | organization_members | INSERT |
| orgs_admin_update | organizations | UPDATE |
| orgs_create | organizations | INSERT |
| orgs_member_select | organizations | SELECT |

- [ ] 6/6 policies → tiếp tục
- [ ] Thiếu policy → Rollback 009 → DỪNG

---

### Bước 009.9 — Verify Trigger Function

```sql
-- V009-8: Trigger function tồn tại
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = '_aifun_set_updated_at';

-- V009-9: Triggers trên tables
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trg_organizations_updated', 'trg_org_members_updated');
```

- [ ] Function `_aifun_set_updated_at` tồn tại → ✅
- [ ] 2 triggers tồn tại → ✅

---

### Bước 009.10 — Rollback Script (chỉ dùng khi cần)

```sql
-- ROLLBACK 009 — chỉ chạy khi verify FAIL
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
ALTER TABLE workspace_settings DROP COLUMN IF EXISTS org_id;
-- Không drop _aifun_set_updated_at() — dùng chung
```

---

### ✅ Migration 009 Gate

> Điền kết quả và ký tên trước khi tiếp tục:

- [ ] V009-1 Tables: PASS
- [ ] V009-2 Columns organizations: PASS
- [ ] V009-3 Column workspace_settings.org_id: PASS
- [ ] V009-4 Data không mất: PASS
- [ ] V009-5 Indexes (6/6): PASS
- [ ] V009-6 RLS (2/2): PASS
- [ ] V009-7 Policies (6/6): PASS
- [ ] V009-8 Triggers (2/2): PASS

**`Migration 009 PASS — [timestamp]: __________________`**

---

---

## MIGRATION 010 — Teams

**File:** `docs/migration-010-teams.sql`
**Điều kiện:** Migration 009 Gate PASS

### Bước 010.1 — Chạy migration

```
SQL Editor → New Query
→ Paste toàn bộ nội dung migration-010-teams.sql
→ Click "Run"
```

**Kết quả mong đợi:** `Success. No rows returned.`

---

### Bước 010.2 — Verify Tables

```sql
-- V010-1
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('teams', 'team_members')
ORDER BY table_name;
```

- [ ] 2 rows (team_members, teams) → tiếp tục
- [ ] FAIL → Rollback 010 → DỪNG

---

### Bước 010.3 — Verify Columns `teams`

```sql
-- V010-2
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'teams'
ORDER BY ordinal_position;
```

**Kết quả mong đợi (10 columns):**

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| org_id | uuid | NO |
| name | text | NO |
| slug | text | NO |
| description | text | YES |
| color | text | NO |
| icon | text | YES |
| created_by | uuid | NO |
| created_at | timestamp with time zone | NO |
| updated_at | timestamp with time zone | NO |
| deleted_at | timestamp with time zone | YES |

- [ ] 11 columns đúng → tiếp tục

---

### Bước 010.4 — Verify Columns `team_members`

```sql
-- V010-3
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'team_members'
ORDER BY ordinal_position;
```

**Kết quả mong đợi (6 columns):** id, team_id, user_id, role, added_by, joined_at

- [ ] 6 columns đúng → tiếp tục

---

### Bước 010.5 — Verify Indexes

```sql
-- V010-4
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_teams_org', 'idx_team_members_team', 'idx_team_members_user')
ORDER BY indexname;
```

- [ ] 3/3 indexes → tiếp tục
- [ ] FAIL → Rollback 010 → DỪNG

---

### Bước 010.6 — Verify RLS & Policies

```sql
-- V010-5: RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('teams', 'team_members');

-- V010-6: Policies
SELECT policyname, tablename FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;
```

**Kết quả mong đợi — 4 policies:**

| Policy | Table |
|---|---|
| team_members_manage | team_members |
| team_members_select | team_members |
| teams_manager_write | teams |
| teams_org_member_select | teams |

- [ ] RLS true cho cả 2 tables → ✅
- [ ] 4/4 policies → tiếp tục

---

### Bước 010.7 — Verify Trigger

```sql
-- V010-7
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_teams_updated';
```

- [ ] 1 row (`trg_teams_updated` trên `teams`) → tiếp tục

---

### Bước 010.8 — Rollback Script

```sql
-- ROLLBACK 010 — chỉ dùng khi cần
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
```

---

### ✅ Migration 010 Gate

- [ ] V010-1 Tables (2/2): PASS
- [ ] V010-2 Columns teams (11): PASS
- [ ] V010-3 Columns team_members (6): PASS
- [ ] V010-4 Indexes (3/3): PASS
- [ ] V010-5 RLS (2/2): PASS
- [ ] V010-6 Policies (4/4): PASS
- [ ] V010-7 Trigger: PASS

**`Migration 010 PASS — [timestamp]: __________________`**

---

---

## MIGRATION 011 — Invitations

**File:** `docs/migration-011-invitations.sql`
**Điều kiện:** Migration 010 Gate PASS

### Bước 011.1 — Chạy migration

```
SQL Editor → New Query
→ Paste toàn bộ nội dung migration-011-invitations.sql
→ Click "Run"
```

---

### Bước 011.2 — Verify Table & Columns

```sql
-- V011-1: Table tồn tại
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'invitations';

-- V011-2: Columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invitations'
ORDER BY ordinal_position;
```

**Kết quả mong đợi (13 columns):** id, org_id, workspace_id, team_id, email, role, token, invited_by, message, expires_at, accepted_at, revoked_at, created_at

- [ ] 1 table → ✅
- [ ] 13 columns → tiếp tục

---

### Bước 011.3 — Verify Indexes

```sql
-- V011-3
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'invitations'
ORDER BY indexname;
```

**Kết quả mong đợi — 4 indexes:**

| Index | Loại |
|---|---|
| idx_invitations_email | Regular |
| idx_invitations_org_pending | Partial (WHERE pending) |
| idx_invitations_token | Regular |
| uq_invitations_pending | Unique partial |
| invitations_pkey | PK (auto) |

- [ ] `uq_invitations_pending` tồn tại (ngăn duplicate pending invites) → ✅
- [ ] `idx_invitations_token` tồn tại (lookup by token) → ✅

---

### Bước 011.4 — Verify Unique Partial Index

```sql
-- V011-4: Xác nhận partial index chỉ áp dụng cho pending invites
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'invitations'
  AND indexname = 'uq_invitations_pending';
```

**Kết quả mong đợi:** `indexdef` phải chứa `WHERE ((accepted_at IS NULL) AND (revoked_at IS NULL))`

- [ ] Partial condition đúng → tiếp tục

---

### Bước 011.5 — Verify RLS & Policies

```sql
-- V011-5: RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'invitations';

-- V011-6: Policies
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'invitations'
ORDER BY policyname;
```

**Kết quả mong đợi — 4 policies:**

| Policy | CMD |
|---|---|
| invitations_manager_insert | INSERT |
| invitations_manager_revoke | UPDATE |
| invitations_manager_select | SELECT |
| invitations_public_token_select | SELECT |

- [ ] RLS = true → ✅
- [ ] 4/4 policies → tiếp tục

> **Lưu ý quan trọng:** `invitations_public_token_select` cho phép SELECT không cần auth (để unauthenticated users có thể lookup token khi accept invite). Đây là đúng thiết kế.

---

### Bước 011.6 — Verify FK Constraint đến `teams`

```sql
-- V011-7: FK từ invitations.team_id → teams.id
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'invitations'::regclass AND contype = 'f';
```

**Kết quả mong đợi:** Ít nhất 2 FKs (org_id → organizations, team_id → teams)

- [ ] FKs tồn tại → ✅

---

### Bước 011.7 — Rollback Script

```sql
-- ROLLBACK 011 — chỉ dùng khi cần
DROP TABLE IF EXISTS invitations CASCADE;
```

---

### ✅ Migration 011 Gate

- [ ] V011-1 Table: PASS
- [ ] V011-2 Columns (13): PASS
- [ ] V011-3 Indexes (4+): PASS
- [ ] V011-4 Partial index condition đúng: PASS
- [ ] V011-5 RLS: PASS
- [ ] V011-6 Policies (4/4): PASS

**`Migration 011 PASS — [timestamp]: __________________`**

---

---

## MIGRATION 012 — Activity Logs + Audit Logs

**File:** `docs/migration-012-activity-audit.sql`
**Điều kiện:** Migration 011 Gate PASS

### ⚠️ Lưu ý đặc biệt trước khi chạy

Migration 012 tạo **partitioned tables**. Không có FK constraints (PostgreSQL limitation đã được xử lý trong RC1 BLOCKER B4). Đây là thiết kế đúng.

### Bước 012.1 — Chạy migration

```
SQL Editor → New Query
→ Paste toàn bộ nội dung migration-012-activity-audit.sql
→ Click "Run"
```

---

### Bước 012.2 — Verify Parent Tables

```sql
-- V012-1: Parent tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('activity_logs', 'audit_logs')
ORDER BY table_name;
```

- [ ] 2 rows → tiếp tục

---

### Bước 012.3 — Verify Partitions

```sql
-- V012-2: Partitions tồn tại
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'activity_logs_%' OR tablename LIKE 'audit_logs_%')
ORDER BY tablename;
```

**Kết quả mong đợi — 10 partitions:**

| Partition | Type |
|---|---|
| activity_logs_2026_q2 | activity |
| activity_logs_2026_q3 | activity |
| activity_logs_2026_q4 | activity |
| activity_logs_2027_q1 | activity |
| activity_logs_2027_q2 | activity |
| audit_logs_2026_q2 | audit |
| audit_logs_2026_q3 | audit |
| audit_logs_2026_q4 | audit |
| audit_logs_2027_q1 | audit |
| audit_logs_2027_q2 | audit |

- [ ] 10/10 partitions → tiếp tục
- [ ] FAIL → Rollback 012 → DỪNG

---

### Bước 012.4 — Verify Columns `activity_logs`

```sql
-- V012-3
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_logs'
ORDER BY ordinal_position;
```

**Kết quả mong đợi (9 columns):** id, org_id, workspace_id, actor_id, action, resource_type, resource_id, resource_name, metadata, created_at

- [ ] 10 columns → tiếp tục

---

### Bước 012.5 — Verify Columns `audit_logs`

```sql
-- V012-4
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_logs'
ORDER BY ordinal_position;
```

**Kết quả mong đợi (13 columns):** id, org_id, workspace_id, actor_id, actor_email, action, severity, before_state, after_state, ip_address, user_agent, session_id, created_at

- [ ] 13 columns, có `actor_email` và `severity` → tiếp tục

---

### Bước 012.6 — Verify KHÔNG có FK Constraints

```sql
-- V012-5: Partitioned tables KHÔNG được có FK (đã fix trong RC1 B4)
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'activity_logs'::regclass AND contype = 'f';

SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'audit_logs'::regclass AND contype = 'f';
```

**Kết quả mong đợi:** 0 rows cho cả 2 queries

- [ ] 0 FK constraints trên `activity_logs` → ✅
- [ ] 0 FK constraints trên `audit_logs` → ✅

> Đây là **đúng** — không phải lỗi. FK trên partitioned tables không được hỗ trợ. Referential integrity do app layer enforce.

---

### Bước 012.7 — Verify Indexes

```sql
-- V012-6
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_activity_org_time',
    'idx_activity_actor',
    'idx_activity_resource',
    'idx_audit_org_time',
    'idx_audit_action',
    'idx_audit_severity'
  )
ORDER BY indexname;
```

**Kết quả mong đợi — 6 indexes:**

| Index | Table |
|---|---|
| idx_activity_actor | activity_logs |
| idx_activity_org_time | activity_logs |
| idx_activity_resource | activity_logs |
| idx_audit_action | audit_logs |
| idx_audit_org_time | audit_logs |
| idx_audit_severity | audit_logs |

- [ ] 6/6 indexes → tiếp tục

---

### Bước 012.8 — Verify Partial Index `idx_audit_severity`

```sql
-- V012-7: Partial index chỉ index warning + critical
SELECT indexdef FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'idx_audit_severity';
```

**Kết quả mong đợi:** `indexdef` chứa `WHERE ((severity)::text <> 'info'::text)`

- [ ] Partial condition đúng → ✅

---

### Bước 012.9 — Verify RLS & Policies

```sql
-- V012-8: RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('activity_logs', 'audit_logs');

-- V012-9: Policies
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('activity_logs', 'audit_logs')
ORDER BY tablename, policyname;
```

**Kết quả mong đợi — 4 policies:**

| Policy | Table | CMD |
|---|---|---|
| activity_insert | activity_logs | INSERT |
| activity_select | activity_logs | SELECT |
| audit_admin_select | audit_logs | SELECT |
| audit_insert | audit_logs | INSERT |

**Kiểm tra quan trọng:** Không có UPDATE hoặc DELETE policy → Đúng thiết kế immutable.

- [ ] RLS true cho cả 2 → ✅
- [ ] 4/4 policies, không có UPDATE/DELETE → tiếp tục

---

### Bước 012.10 — Smoke Insert Test

```sql
-- V012-10: Test insert vào activity_logs (dùng UUID giả)
-- Thay org_id và actor_id bằng UUID thật từ organizations và auth.users sau khi có data
-- Hiện tại test bằng cách insert thẳng với quyền service_role:

-- Chạy trong SQL Editor (service_role bypass RLS):
INSERT INTO activity_logs (org_id, actor_id, action, resource_type, created_at)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(),
  'test.smoke_insert',
  'test',
  NOW()
) ON CONFLICT DO NOTHING;

-- Kiểm tra đã insert vào đúng partition
SELECT tableoid::regclass AS partition, action, created_at
FROM activity_logs
WHERE action = 'test.smoke_insert';

-- Xóa test row
DELETE FROM activity_logs WHERE action = 'test.smoke_insert';
```

- [ ] Insert thành công (1 row inserted) → ✅
- [ ] `tableoid::regclass` hiển thị `activity_logs_2026_q3` (vì NOW() ở Q3 2026) → ✅
- [ ] DELETE thành công → ✅

---

### Bước 012.11 — Rollback Script

```sql
-- ROLLBACK 012 — chỉ dùng khi cần
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
```

---

### ✅ Migration 012 Gate

- [ ] V012-1 Parent tables (2): PASS
- [ ] V012-2 Partitions (10/10): PASS
- [ ] V012-3 Columns activity_logs (10): PASS
- [ ] V012-4 Columns audit_logs (13): PASS
- [ ] V012-5 NO FK constraints (0 rows): PASS
- [ ] V012-6 Indexes (6/6): PASS
- [ ] V012-7 Partial index severity đúng: PASS
- [ ] V012-8 RLS (2/2): PASS
- [ ] V012-9 Policies (4/4, no UPDATE/DELETE): PASS
- [ ] V012-10 Smoke insert test: PASS

**`Migration 012 PASS — [timestamp]: __________________`**

---

### ✅ Phase 2 Final Gate

> **Ghi lại trước khi tiếp tục Phase 3:**

- [ ] Migration 009 PASS — timestamp: `__________________`
- [ ] Migration 010 PASS — timestamp: `__________________`
- [ ] Migration 011 PASS — timestamp: `__________________`
- [ ] Migration 012 PASS — timestamp: `__________________`
- [ ] Tổng số tables mới: 7 (organizations, organization_members, teams, team_members, invitations, activity_logs, audit_logs)
- [ ] workspace_settings.org_id đã có
- [ ] Không có data loss

**`Phase 2 Migration COMPLETE — [timestamp]: __________________`**

---

---

# PHASE 3 — E2E Test Checklist

> Thực hiện bằng tay trong trình duyệt. Dùng Chrome (primary) + Firefox (secondary).
> Không skip bất kỳ item nào.

---

## 3.1 Authentication

| # | Test | Bước | Expected | Chrome | Firefox |
|---|---|---|---|---|---|
| A1 | Login email/pass | Nhập email + password → Submit | Redirect /dashboard, sidebar hiện | `☐` | `☐` |
| A2 | Login sai mật khẩu | Nhập sai password → Submit | Error message rõ ràng, không redirect | `☐` | `☐` |
| A3 | Remember me | Login với "Remember me" → đóng tab → mở lại | Vẫn đang login | `☐` | `☐` |
| A4 | Logout | Click avatar → Logout | Redirect /auth/login, session cleared | `☐` | `☐` |
| A5 | Session sau logout | Sau logout, vào /dashboard bằng URL | Redirect login | `☐` | `☐` |

---

## 3.2 Workspace

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| W1 | Workspace load | Dashboard hiển thị đúng workspace name | `☐` | `☐` |
| W2 | Workspace switcher | Click switcher → đổi workspace | Reload với workspace mới | `☐` | `☐` |
| W3 | Settings → Workspace | Tab Workspace load, name + description | `☐` | `☐` |
| W4 | Save workspace name | Đổi name → Save | Toast success, name cập nhật | `☐` | `☐` |

---

## 3.3 Organization Center

### 3.3.1 Setup (chạy trước khi test UI)

```sql
-- Tạo org test trong Supabase SQL Editor
-- Thay YOUR_USER_ID bằng UUID của tài khoản đang test

INSERT INTO organizations (name, slug, owner_id, plan)
VALUES ('AIFUN Test Org', 'aifun-test-org', 'YOUR_USER_ID'::uuid, 'free')
RETURNING id;
-- Ghi lại org_id: __________________

INSERT INTO organization_members (org_id, user_id, role)
VALUES ('ORG_ID'::uuid, 'YOUR_USER_ID'::uuid, 'owner');
```

### 3.3.2 Overview

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| O1 | Navigate /organization | Sidebar "Tổ chức" → click | /organization load, sub-nav hiện | `☐` | `☐` |
| O2 | Org hero | Org name, slug, plan badge hiện | `☐` | `☐` |
| O3 | Stat cards | Member count, team count, my role | `☐` | `☐` |
| O4 | Sub-nav render | 7 items: Tổng quan/Thành viên/Nhóm/Phân quyền/Lời mời/Hoạt động/Kiểm toán | `☐` | `☐` |
| O5 | Active nav state | Current item có class `org-subnav-link--active` | `☐` | `☐` |

### 3.3.3 Members

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| M1 | Navigate /organization/members | Member table hiện | `☐` | `☐` |
| M2 | Self row | "Bạn" badge trên current user | `☐` | `☐` |
| M3 | Self row no actions | Không có nút Vai trò/Đình chỉ/Xóa trên self | `☐` | `☐` |
| M4 | Search | Gõ tên/email → filter table | `☐` | `☐` |
| M5 | Role change modal | Click "Vai trò" → modal hiện đúng roles | `☐` | `☐` |
| M6 | Confirm role change | Chọn role mới → Xác nhận | Toast, badge cập nhật | `☐` | `☐` |
| M7 | Suspend member | Click "Đình chỉ" → confirm | Status dot đổi, toast | `☐` | `☐` |
| M8 | Reactivate member | Click "Kích hoạt" trên suspended | Status active lại | `☐` | `☐` |
| M9 | SPA navigation | Click "Nhóm" trong sub-nav | Không full reload, URL đổi | `☐` | `☐` |

### 3.3.4 Teams

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| T1 | Navigate /organization/teams | Team grid hoặc empty state | `☐` | `☐` |
| T2 | Create team modal | Click "+ Tạo nhóm" → modal mở | `☐` | `☐` |
| T3 | Slug auto-fill | Gõ name "Marketing" → slug tự fill "marketing" | `☐` | `☐` |
| T4 | Create team | Fill form → Submit | Team card xuất hiện | `☐` | `☐` |
| T5 | Team card color | Color bar đúng màu đã chọn | `☐` | `☐` |
| T6 | Creator là lead | Sau tạo, query `SELECT * FROM team_members` → role = 'lead' | `☐` | N/A |
| T7 | Delete team | Click "Xóa" → confirm | Team card biến mất | `☐` | `☐` |

### 3.3.5 Roles

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| R1 | Navigate /organization/roles | Permission matrix 5 cột hiện | `☐` | `☐` |
| R2 | Owner row | TẤT CẢ ô có checkmark | `☐` | `☐` |
| R3 | Viewer row | CHỈ có org:read, member:read, team:read, activity:read | `☐` | `☐` |
| R4 | audit:read | CHỈ owner và admin có checkmark | `☐` | `☐` |
| R5 | Page là read-only | Không có input, button chỉnh sửa nào | `☐` | `☐` |

### 3.3.6 Invitations

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| I1 | Navigate /organization/invites | Empty state hoặc invite list | `☐` | `☐` |
| I2 | Send invite modal | Click "+ Mời" → modal mở | `☐` | `☐` |
| I3 | Send invite | Nhập email test → Send | Invite row xuất hiện | `☐` | `☐` |
| I4 | Invite in DB | `SELECT * FROM invitations` → row tồn tại | `☐` | N/A |
| I5 | Token generated | `token` column không null, 64 chars | `☐` | N/A |
| I6 | Revoke invite | Click "Thu hồi" → confirm | Row biến mất, `revoked_at` set trong DB | `☐` | `☐` |
| I7 | Duplicate block | Send invite cùng email lần 2 | Error: unique constraint | `☐` | `☐` |

### 3.3.7 Activity Feed

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| AC1 | Navigate /organization/activity | Feed hiện (hoặc empty nếu chưa có events) | `☐` | `☐` |
| AC2 | Activity logged | Sau test M6 (role change) → activity item xuất hiện | `☐` | `☐` |
| AC3 | Type filter | Chọn "Thành viên" → chỉ hiện member events | `☐` | `☐` |
| AC4 | Relative time | Time hiển thị "vừa xong" hoặc "X phút trước" | `☐` | `☐` |

### 3.3.8 Audit Log

| # | Test | Expected | Chrome | Firefox |
|---|---|---|---|---|
| AU1 | Access as owner | Navigate /organization/audit | Audit table hiện | `☐` | `☐` |
| AU2 | Access as editor | Logout → login editor account → /organization/audit | "Chỉ Owner và Admin" message | `☐` | `☐` |
| AU3 | Severity filter | Filter "Cảnh báo" → chỉ warning rows | `☐` | `☐` |

---

## 3.4 Sprint 14B Regression

| # | Test | Expected | Chrome |
|---|---|---|---|
| S1 | Settings → Thương hiệu | Branding tab load | `☐` |
| S2 | Color picker | Chọn màu → live preview cập nhật | `☐` |
| S3 | Save brand color | Save → CSS var đổi, persist qua reload | `☐` |
| S4 | Logo upload | Upload PNG → preview hiện | `☐` |
| S5 | Brand preset | Click preset màu → picker sync | `☐` |
| S6 | Theme inspector | Details toggle → CSS vars hiện | `☐` |
| S7 | Export theme | Click Export → theme.json download | `☐` |
| S8 | Danger Zone → Clear cache | Confirm → reload | `☐` |
| S9 | Settings → Thành viên | "Coming soon Sprint 15" placeholder | `☐` |

---

## 3.5 Sprint 14A Regression

| # | Test | Expected | Chrome |
|---|---|---|---|
| D1 | Dashboard | Load, stats, workspace name đúng | `☐` |
| D2 | AI Builders | Builder list hiện đủ 8 builders | `☐` |
| D3 | Builder modal | Click builder → 3-step modal mở | `☐` |
| D4 | Documents | Document library load | `☐` |
| D5 | Marketplace | Marketplace grid hiện | `☐` |
| D6 | AI History | History list hoặc empty | `☐` |
| D7 | Reports | Reports page load | `☐` |
| D8 | Settings → Profile | Profile form hiện | `☐` |

---

## 3.6 Cross-cutting

| # | Test | Expected | Chrome |
|---|---|---|---|
| X1 | Dark mode toggle | Tất cả org pages đổi sang dark | `☐` |
| X2 | Mobile 375px | Sub-nav horizontal scroll, table scroll | `☐` |
| X3 | Keyboard nav | Tab qua sub-nav, Enter để navigate | `☐` |
| X4 | Browser back/forward | History đúng giữa org sub-pages | `☐` |
| X5 | No console errors | DevTools Console → 0 red errors | `☐` |
| X6 | No unhandled promises | DevTools Console → 0 "Unhandled Promise Rejection" | `☐` |
| X7 | V2 fallback (index.html) | Mở `portal.aifun.ai.vn` (main branch) → V2 vẫn hoạt động | `☐` |

---

## 3.7 Phase 3 Gate

Đếm kết quả:

- Total tests: **78**
- PASS: `__________________`
- FAIL: `__________________`
- SKIP: `__________________`

**Điều kiện PASS Phase 3:** FAIL = 0 (SKIP được phép nếu có lý do hợp lệ)

**`Phase 3 E2E PASS/FAIL — [timestamp]: __________________`**

---

---

# PHASE 4 — SPRINT15_RC2_REPORT.md (Nội dung điền sau E2E)

> File này sẽ được điền sau khi Phase 1–3 hoàn thành.
> Template dưới đây để hướng dẫn — các ô `[...]` cần điền kết quả thực tế.

---

## Migration Summary

| Migration | Chạy lúc | Trạng thái | Tables tạo |
|---|---|---|---|
| 009-organizations | `[timestamp]` | `[PASS/FAIL]` | organizations, organization_members |
| 010-teams | `[timestamp]` | `[PASS/FAIL]` | teams, team_members |
| 011-invitations | `[timestamp]` | `[PASS/FAIL]` | invitations |
| 012-activity-audit | `[timestamp]` | `[PASS/FAIL]` | activity_logs, audit_logs (+10 partitions) |

## E2E Result

| Module | Tests | PASS | FAIL | SKIP |
|---|---|---|---|---|
| Authentication | 5 | `[n]` | `[n]` | `[n]` |
| Workspace | 4 | | | |
| Organization Overview | 5 | | | |
| Members | 9 | | | |
| Teams | 7 | | | |
| Roles | 5 | | | |
| Invitations | 7 | | | |
| Activity | 4 | | | |
| Audit | 3 | | | |
| Sprint 14B Regression | 9 | | | |
| Sprint 14A Regression | 8 | | | |
| Cross-cutting | 7 | | | |
| **TOTAL** | **78** | | | |

## Known Warnings (từ RC1)

| # | Warning | Severity | Status sau E2E |
|---|---|---|---|
| L1 | auth.users join trong org-member-service | WARNING | `[Xác nhận OK / Vẫn còn vấn đề]` |
| L2 | Module-level state _cursor/_items persist | WARNING | `[Xác nhận OK / Vẫn còn vấn đề]` |
| L3 | orgStore.load() gọi mỗi route visit | WARNING | `[Xác nhận OK / Vẫn còn vấn đề]` |

## Rollback

Xem `docs/SPRINT15_RC1_REPORT.md` §10 để biết toàn bộ rollback commands.

## Deployment Checklist (chỉ thực hiện sau RC2 PASS)

- [ ] Merge `develop-v4` → `release/v4.1.0`
- [ ] Final regression trên `release/v4.1.0`
- [ ] Production Supabase: chạy migration 009 → 012 theo đúng Phase 2
- [ ] `config.js` version = `v4.1.0`
- [ ] Merge `release/v4.1.0` → `main`
- [ ] Tag: `git tag -a v4.1.0 -m "Sprint 15 — Organization Center"`
- [ ] Verify GitHub Pages deploy
- [ ] Smoke test `portal.aifun.ai.vn`
- [ ] Monitor 30 phút
- [ ] Back-merge `release/v4.1.0` → `develop-v4`

## Merge Recommendation

> **Điền sau khi có kết quả E2E:**

```
[ ] RC2 PASS — ĐỀ XUẤT MERGE sau khi Production Migration xong
[ ] RC2 FAIL — KHÔNG MERGE — Fix issues và re-run RC2
[ ] RC2 PASS WITH WARNINGS — MERGE với tracking issues trong backlog
```

**Known limitation cần track sau merge:**
- L1: Nếu `auth.users` join fail production → tạo `profiles` view trong Supabase
- L2: Refactor `org-activity.js` state management trong Sprint 15.x
- L3: Thêm `_loaded` flag vào `orgStore` trong Sprint 15.x

---

*SPRINT15_RC2_REPORT.md*
*Template generated: 2026-06-28*
*Điền kết quả thực tế sau khi hoàn thành Phase 1–3*
*Branch: develop-v4 | Không merge main cho đến khi RC2 PASS*
