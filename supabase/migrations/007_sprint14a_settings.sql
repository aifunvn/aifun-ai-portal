-- ============================================================
-- Migration 007 — Sprint 14A: Workspace Settings
-- Branch: develop-v4
-- Date: 2026-06-27
-- Tables: workspace_settings
-- No changes to existing tables (001–006 untouched)
--
-- Fix: roles.id is TEXT PRIMARY KEY ('owner','admin','editor','viewer')
--      workspace_members.role_id is TEXT REFERENCES roles(id)
--      No column roles.name — compare role_id directly
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

-- Any workspace member can read settings
CREATE POLICY "workspace_settings_select"
  ON workspace_settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Only owner or admin can insert workspace settings
-- roles.id is TEXT: 'owner' | 'admin' | 'editor' | 'viewer'
CREATE POLICY "workspace_settings_insert"
  ON workspace_settings FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role_id IN ('owner', 'admin')
    )
  );

-- Only owner or admin can update workspace settings
CREATE POLICY "workspace_settings_update"
  ON workspace_settings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role_id IN ('owner', 'admin')
    )
  );

-- ── Rollback instructions ──────────────────────────────────────
-- To undo this migration:
-- DROP TABLE IF EXISTS workspace_settings;
-- (No other tables are affected)
