-- ============================================================
-- Migration 010: Teams + Team Members
-- Depends on: migration-009-organizations.sql
-- ============================================================

-- ── teams ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  slug         TEXT        NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,38}$'),
  description  TEXT        CHECK (char_length(description) <= 300),
  color        TEXT        NOT NULL DEFAULT '#6366f1',
  icon         TEXT,
  created_by   UUID        NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_teams_org
  ON teams(org_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION _aifun_set_updated_at();

-- ── team_members ──────────────────────────────────────────────
-- A team member must also be an org member (enforced at app layer).
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'member'
                            CHECK (role IN ('lead','member')),
  added_by     UUID        REFERENCES auth.users(id),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams: visible to org members
DROP POLICY IF EXISTS "teams_org_member_select" ON teams;
CREATE POLICY "teams_org_member_select" ON teams FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = teams.org_id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  );

-- Teams: managers+ can create/update/delete
DROP POLICY IF EXISTS "teams_manager_write" ON teams;
CREATE POLICY "teams_manager_write" ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = teams.org_id
        AND om.user_id = auth.uid()
        AND om.role   IN ('owner','admin','manager')
        AND om.status  = 'active'
    )
  );

-- Team members: org members can read
DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id       = team_members.team_id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  );

-- Team members: managers+ or team leads can manage
DROP POLICY IF EXISTS "team_members_manage" ON team_members;
CREATE POLICY "team_members_manage" ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON om.org_id = t.org_id
      WHERE t.id       = team_members.team_id
        AND om.user_id = auth.uid()
        AND om.role   IN ('owner','admin','manager')
        AND om.status  = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm2
      WHERE tm2.team_id = team_members.team_id
        AND tm2.user_id = auth.uid()
        AND tm2.role    = 'lead'
    )
  );

COMMENT ON TABLE teams        IS 'Sub-groups within an organization. A team can span multiple workspaces.';
COMMENT ON TABLE team_members IS 'Many-to-many: users ↔ teams, with lead/member role.';
