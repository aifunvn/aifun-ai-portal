-- ============================================================
-- Migration 013: Builder Studio
-- Custom AI Builder authoring: create/edit/publish, versioning,
-- and usage analytics. Independent of the static builder
-- registry used by the /builders runtime page (src/builders/registry.js).
--
-- workspace_id is TEXT to match the existing convention used by
-- documents, ai_requests, workspace_members, etc. (not a UUID FK).
-- ============================================================

-- ── custom_builders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_builders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      TEXT        NOT NULL,
  name              TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description       TEXT        CHECK (char_length(description) <= 500),
  category          TEXT        NOT NULL DEFAULT 'Khac',
  icon              TEXT        NOT NULL DEFAULT 'sparkles',
  status            TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  system_prompt     TEXT        NOT NULL DEFAULT '',
  prompt_template   TEXT        NOT NULL DEFAULT '',
  model             TEXT        NOT NULL DEFAULT 'claude',
  temperature       NUMERIC(2,1) NOT NULL DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 1),
  max_tokens        INTEGER     NOT NULL DEFAULT 4096 CHECK (max_tokens BETWEEN 1 AND 8192),
  knowledge_sources JSONB       NOT NULL DEFAULT '[]',
  current_version   INTEGER     NOT NULL DEFAULT 1,
  created_by        UUID        NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_custom_builders_workspace
  ON custom_builders(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_builders_status
  ON custom_builders(workspace_id, status) WHERE deleted_at IS NULL;

-- ── custom_builder_versions ──────────────────────────────────
-- Immutable snapshot written every time a builder is saved.
CREATE TABLE IF NOT EXISTS custom_builder_versions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id        UUID        NOT NULL REFERENCES custom_builders(id) ON DELETE CASCADE,
  version           INTEGER     NOT NULL,
  name              TEXT        NOT NULL,
  description       TEXT,
  system_prompt     TEXT        NOT NULL DEFAULT '',
  prompt_template   TEXT        NOT NULL DEFAULT '',
  model             TEXT        NOT NULL DEFAULT 'claude',
  temperature       NUMERIC(2,1) NOT NULL DEFAULT 0.7,
  max_tokens        INTEGER     NOT NULL DEFAULT 4096,
  knowledge_sources JSONB       NOT NULL DEFAULT '[]',
  change_note       TEXT        CHECK (char_length(change_note) <= 300),
  created_by        UUID        NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (builder_id, version)
);

CREATE INDEX IF NOT EXISTS idx_builder_versions_builder
  ON custom_builder_versions(builder_id, version DESC);

-- ── custom_builder_analytics ─────────────────────────────────
-- Append-only event log: one row per test run / usage event.
CREATE TABLE IF NOT EXISTS custom_builder_analytics (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id    UUID        NOT NULL REFERENCES custom_builders(id) ON DELETE CASCADE,
  workspace_id  TEXT        NOT NULL,
  event_type    TEXT        NOT NULL DEFAULT 'test_run' CHECK (event_type IN ('test_run', 'used')),
  success       BOOLEAN     NOT NULL DEFAULT true,
  tokens_used   INTEGER     NOT NULL DEFAULT 0,
  response_time_ms INTEGER  NOT NULL DEFAULT 0,
  actor_id      UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_builder_analytics_builder_time
  ON custom_builder_analytics(builder_id, created_at DESC);

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION _aifun_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_builders_updated_at ON custom_builders;
CREATE TRIGGER trg_custom_builders_updated_at
  BEFORE UPDATE ON custom_builders
  FOR EACH ROW EXECUTE FUNCTION _aifun_touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE custom_builders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_builder_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_builder_analytics   ENABLE ROW LEVEL SECURITY;

-- Any active member of the workspace can read/write its custom builders.
DROP POLICY IF EXISTS "custom_builders_member_select" ON custom_builders;
CREATE POLICY "custom_builders_member_select" ON custom_builders FOR SELECT
  USING (
    deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = custom_builders.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "custom_builders_member_insert" ON custom_builders;
CREATE POLICY "custom_builders_member_insert" ON custom_builders FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = custom_builders.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "custom_builders_member_update" ON custom_builders;
CREATE POLICY "custom_builders_member_update" ON custom_builders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = custom_builders.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Versions: readable/insertable by workspace members of the parent builder.
DROP POLICY IF EXISTS "builder_versions_member_select" ON custom_builder_versions;
CREATE POLICY "builder_versions_member_select" ON custom_builder_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_builders cb
      JOIN workspace_members wm ON wm.workspace_id = cb.workspace_id
      WHERE cb.id = custom_builder_versions.builder_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "builder_versions_member_insert" ON custom_builder_versions;
CREATE POLICY "builder_versions_member_insert" ON custom_builder_versions FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM custom_builders cb
      JOIN workspace_members wm ON wm.workspace_id = cb.workspace_id
      WHERE cb.id = custom_builder_versions.builder_id
        AND wm.user_id = auth.uid()
    )
  );

-- Analytics: readable by workspace members; insertable by any workspace member (test runs).
DROP POLICY IF EXISTS "builder_analytics_member_select" ON custom_builder_analytics;
CREATE POLICY "builder_analytics_member_select" ON custom_builder_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = custom_builder_analytics.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "builder_analytics_member_insert" ON custom_builder_analytics;
CREATE POLICY "builder_analytics_member_insert" ON custom_builder_analytics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = custom_builder_analytics.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE custom_builders IS
  'User-authored AI Builders managed via Builder Studio (/builder-studio). Distinct from the static read-only registry used by /builders.';
COMMENT ON TABLE custom_builder_versions IS
  'Immutable version snapshot, one row written per save in Builder Studio.';
COMMENT ON TABLE custom_builder_analytics IS
  'Append-only usage/test-run event log per custom builder.';
