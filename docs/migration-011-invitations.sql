-- ============================================================
-- Migration 011: Invitations
-- Depends on: migration-009-organizations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id TEXT,                      -- optional: invite to specific workspace
  team_id      UUID        REFERENCES teams(id) ON DELETE SET NULL,
  email        TEXT        NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         TEXT        NOT NULL DEFAULT 'editor'
                            CHECK (role IN ('admin','manager','editor','viewer')),
  token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by   UUID        NOT NULL REFERENCES auth.users(id),
  message      TEXT        CHECK (char_length(message) <= 500),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,              -- set when user accepts
  revoked_at   TIMESTAMPTZ,              -- set when admin revokes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate pending invites: one per (org, email) while not accepted/revoked
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_pending
  ON invitations(org_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_org_pending
  ON invitations(org_id, created_at DESC)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_token  ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email  ON invitations(email);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Managers+ can read all invites for their org
DROP POLICY IF EXISTS "invitations_manager_select" ON invitations;
CREATE POLICY "invitations_manager_select" ON invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role   IN ('owner','admin','manager')
        AND om.status  = 'active'
    )
  );

-- Managers+ can create invites
DROP POLICY IF EXISTS "invitations_manager_insert" ON invitations;
CREATE POLICY "invitations_manager_insert" ON invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role   IN ('owner','admin','manager')
        AND om.status  = 'active'
    )
  );

-- Managers+ can revoke (update revoked_at)
DROP POLICY IF EXISTS "invitations_manager_revoke" ON invitations;
CREATE POLICY "invitations_manager_revoke" ON invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id  = invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role   IN ('owner','admin','manager')
        AND om.status  = 'active'
    )
  );

-- Public token lookup (for invite acceptance page — no auth required)
DROP POLICY IF EXISTS "invitations_public_token_select" ON invitations;
CREATE POLICY "invitations_public_token_select" ON invitations FOR SELECT
  USING (accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW());

COMMENT ON TABLE invitations IS
  'Pending email invitations to join an organization. Token is single-use and expires in 7 days.';
