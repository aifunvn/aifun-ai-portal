-- ============================================================
-- Migration 009: Organizations + Organization Members
-- AIFUN OS V4 — Organization Center Epic (Sprint 15)
-- Run in Supabase SQL Editor
-- Safe to re-run (IF NOT EXISTS throughout)
-- Does NOT drop or alter any existing table
-- ============================================================

-- ── Shared trigger function (idempotent) ─────────────────────
CREATE OR REPLACE FUNCTION _aifun_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ── organizations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug         TEXT        NOT NULL    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  plan         TEXT        NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free','starter','pro','enterprise')),
  owner_id     UUID        NOT NULL REFERENCES auth.users(id),
  avatar_url   TEXT,
  description  TEXT        CHECK (char_length(description) <= 500),
  seat_limit   INT         NOT NULL DEFAULT 5,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_slug
  ON organizations(slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_owner
  ON organizations(owner_id);

DROP TRIGGER IF EXISTS trg_organizations_updated ON organizations;
CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION _aifun_set_updated_at();

-- ── organization_members ──────────────────────────────────────
-- Links a user to an organization with a specific role.
-- One row per (org_id, user_id) pair — enforced by UNIQUE constraint.
CREATE TABLE IF NOT EXISTS organization_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'editor'
                            CHECK (role IN ('owner','admin','manager','editor','viewer')),
  status       TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','suspended')),
  invited_by   UUID        REFERENCES auth.users(id),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org  ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(org_id, role);

DROP TRIGGER IF EXISTS trg_org_members_updated ON organization_members;
CREATE TRIGGER trg_org_members_updated
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION _aifun_set_updated_at();

-- ── org_id back-ref on workspace_settings ────────────────────
-- Allows a workspace to be associated with an organization.
-- Existing rows will have org_id = NULL (unlinked) until migrated.
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_ws_settings_org
  ON workspace_settings(org_id) WHERE org_id IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- organizations: readable by members
DROP POLICY IF EXISTS "orgs_member_select" ON organizations;
CREATE POLICY "orgs_member_select" ON organizations FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  );

-- organizations: owner/admin can update
DROP POLICY IF EXISTS "orgs_admin_update" ON organizations;
CREATE POLICY "orgs_admin_update" ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner','admin')
        AND om.status  = 'active'
    )
  );

-- organizations: authenticated users can create (they become owner)
DROP POLICY IF EXISTS "orgs_create" ON organizations;
CREATE POLICY "orgs_create" ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- org_members: any org member can read the roster
DROP POLICY IF EXISTS "org_members_select" ON organization_members;
CREATE POLICY "org_members_select" ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om2
      WHERE om2.org_id  = org_id
        AND om2.user_id = auth.uid()
        AND om2.status  = 'active'
    )
  );

-- org_members: owner/admin can insert/update/delete
DROP POLICY IF EXISTS "org_members_manage" ON organization_members;
CREATE POLICY "org_members_manage" ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om3
      WHERE om3.org_id  = org_id
        AND om3.user_id = auth.uid()
        AND om3.role   IN ('owner','admin')
        AND om3.status  = 'active'
    )
  );

-- Allow users to insert themselves (accepting an invite)
DROP POLICY IF EXISTS "org_members_self_insert" ON organization_members;
CREATE POLICY "org_members_self_insert" ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE organizations        IS 'Top-level organizational entity. One org can own multiple workspaces.';
COMMENT ON TABLE organization_members IS 'Many-to-many: users ↔ organizations with a role.';
COMMENT ON COLUMN organization_members.role IS 'owner > admin > manager > editor > viewer';
