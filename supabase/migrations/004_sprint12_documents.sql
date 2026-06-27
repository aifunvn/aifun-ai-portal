-- Sprint 12 — Document Intelligence
-- Project: ogfuduavlgpdwqzcaqfy
-- Run in: Supabase Dashboard → SQL Editor

-- ── Extend documents table ────────────────────────────────────────────────────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS prompt            TEXT,
  ADD COLUMN IF NOT EXISTS version           INT          NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS favorite          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned            BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_opened       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drive_sync_status TEXT         NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0;

-- Partial indexes for filter/sort performance
CREATE INDEX IF NOT EXISTS idx_documents_favorite    ON documents (workspace_id, favorite)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_pinned      ON documents (workspace_id, pinned)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_last_opened ON documents (workspace_id, last_opened) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_builder_id  ON documents (workspace_id, builder_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_at  ON documents (workspace_id, created_at)  WHERE deleted_at IS NULL;

-- ── document_versions ─────────────────────────────────────────────────────────
-- Immutable snapshot of each saved version. Version 1 is the original.

CREATE TABLE IF NOT EXISTS document_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id TEXT       NOT NULL,
  version     INT         NOT NULL,
  title       TEXT        NOT NULL,
  content     TEXT,
  prompt      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON document_versions (document_id, version DESC);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = document_versions.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members insert versions"
  ON document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = document_versions.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );
