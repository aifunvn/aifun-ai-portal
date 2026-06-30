-- ============================================================
-- Migration 012: Activity Logs + Audit Logs
-- Depends on: migration-009-organizations.sql
-- Both tables are partitioned by quarter for scalability.
--
-- NOTE: Declarative partitioned tables cannot have FK constraints
-- in PostgreSQL (including PG 15/16). Referential integrity for
-- org_id and actor_id is enforced at the application layer
-- (org-activity-service.js, org-audit-service.js) and by RLS.
-- ============================================================

-- ── activity_logs ─────────────────────────────────────────────
-- Informational feed: member joined, document created, etc.
-- Purge when org is deleted: handled by app layer (no FK cascade on partitioned table).
CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,   -- logical FK → organizations(id), enforced in app
  workspace_id  TEXT,
  actor_id      UUID        NOT NULL,   -- logical FK → auth.users(id), enforced in app
  action        TEXT        NOT NULL,   -- e.g. 'member.invited', 'document.created'
  resource_type TEXT        NOT NULL,   -- 'member' | 'document' | 'team' | 'workspace' | 'invite'
  resource_id   TEXT,
  resource_name TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)          -- partition key must be in PK
) PARTITION BY RANGE (created_at);

-- Quarterly partitions — extend with a cron job or future migration
CREATE TABLE IF NOT EXISTS activity_logs_2026_q2 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS activity_logs_2026_q3 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS activity_logs_2026_q4 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS activity_logs_2027_q1 PARTITION OF activity_logs
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS activity_logs_2027_q2 PARTITION OF activity_logs
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');

CREATE INDEX IF NOT EXISTS idx_activity_org_time
  ON activity_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor
  ON activity_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_resource
  ON activity_logs(resource_type, resource_id);

-- ── audit_logs ────────────────────────────────────────────────
-- Immutable security record.
-- No FK cascade by design — actor_email is denormalized so records
-- survive after the user account is deleted.
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,   -- logical FK → organizations(id), no cascade by design
  workspace_id  TEXT,
  actor_id      UUID        NOT NULL,   -- logical FK → auth.users(id), no cascade by design
  actor_email   TEXT        NOT NULL,   -- denormalized for permanence after user deletion
  action        TEXT        NOT NULL,
  severity      TEXT        NOT NULL DEFAULT 'info'
                              CHECK (severity IN ('info','warning','critical')),
  before_state  JSONB,
  after_state   JSONB,
  ip_address    INET,
  user_agent    TEXT,
  session_id    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit_logs_2026_q2 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS audit_logs_2026_q3 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS audit_logs_2026_q4 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS audit_logs_2027_q1 PARTITION OF audit_logs
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS audit_logs_2027_q2 PARTITION OF audit_logs
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');

CREATE INDEX IF NOT EXISTS idx_audit_org_time
  ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity
  ON audit_logs(severity, created_at DESC) WHERE severity != 'info';

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs    ENABLE ROW LEVEL SECURITY;

-- Activity logs: all active org members can read
DROP POLICY IF EXISTS "activity_select" ON activity_logs;
CREATE POLICY "activity_select" ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = activity_logs.org_id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  );

-- Activity logs: any active org member can insert their own events
DROP POLICY IF EXISTS "activity_insert" ON activity_logs;
CREATE POLICY "activity_insert" ON activity_logs FOR INSERT
  WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = activity_logs.org_id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  );

-- Activity logs: NO UPDATE, NO DELETE — append-only enforced by omitting policies

-- Audit logs: owner/admin can read
DROP POLICY IF EXISTS "audit_admin_select" ON audit_logs;
CREATE POLICY "audit_admin_select" ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = audit_logs.org_id
        AND om.user_id = auth.uid()
        AND om.role   IN ('owner','admin')
        AND om.status  = 'active'
    )
  );

-- Audit logs: any authenticated user can insert (writes go through app layer)
-- No UPDATE or DELETE policies — immutable by design
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());

COMMENT ON TABLE activity_logs IS
  'Informational event feed. Partitioned quarterly. Append-only (no UPDATE/DELETE policy). No FK constraints (PG limitation on partitioned tables) — referential integrity enforced by app layer.';
COMMENT ON TABLE audit_logs IS
  'Immutable security audit trail. Partitioned quarterly. No UPDATE/DELETE ever. Actor email denormalized for permanence. No FK constraints (PG limitation) — referential integrity enforced by app layer.';
