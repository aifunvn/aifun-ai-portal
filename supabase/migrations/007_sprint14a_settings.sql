-- ============================================================
-- Migration 007 — Sprint 14A: Workspace Settings
-- Branch: develop-v4
-- Date: 2026-06-27
-- Tables: workspace_settings
-- No changes to existing tables (001–006 untouched)
-- ============================================================

-- ── workspace_settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_settings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     TEXT         NOT NULL UNIQUE,
  display_name     TEXT         NOT NULL DEFAULT '',
  description      TEXT         NOT NULL DEFAULT '',
  timezone         TEXT         NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  ai_language      TEXT         NOT NULL DEFAULT 'vi',
  logo_url         TEXT         NOT NULL DEFAULT '',
  metadata         JSONB        NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id
  ON workspace_settings(workspace_id);

-- ── Auto-update updated_at ─────────────────────────────────────
-- Reuse the trigger function created in migration 002 if it exists,
-- otherwise create it here.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_workspace_settings_updated_at
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- Members of a workspace can read its settings
CREATE POLICY "workspace_settings_select"
  ON workspace_settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Only owner or admin can insert/update workspace settings
CREATE POLICY "workspace_settings_insert"
  ON workspace_settings FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      JOIN roles r ON r.id = wm.role_id
      WHERE wm.user_id = auth.uid()
        AND r.name IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_settings_update"
  ON workspace_settings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      JOIN roles r ON r.id = wm.role_id
      WHERE wm.user_id = auth.uid()
        AND r.name IN ('owner', 'admin')
    )
  );

-- ── Rollback instructions ──────────────────────────────────────
-- To undo this migration:
-- DROP TABLE IF EXISTS workspace_settings;
-- (No other tables are affected)
