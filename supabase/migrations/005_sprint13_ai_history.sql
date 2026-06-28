-- Sprint 13 — AI History Center
-- Project: ogfuduavlgpdwqzcaqfy
-- Run in: Supabase Dashboard → SQL Editor

-- ── ai_requests ───────────────────────────────────────────────────────────────
-- Immutable record of every AI generation request.
-- builder_history (Sprint 9) remains for backwards compatibility.
-- ai_requests is the authoritative table for Sprint 13+.

CREATE TABLE IF NOT EXISTS ai_requests (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     TEXT         NOT NULL,
  user_id          UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  builder_id       TEXT,
  builder_name     TEXT,
  provider         TEXT,
  model            TEXT,
  prompt           TEXT,
  response_time_ms INT          NOT NULL DEFAULT 0,
  input_tokens     INT          NOT NULL DEFAULT 0,
  output_tokens    INT          NOT NULL DEFAULT 0,
  total_tokens     INT          NOT NULL DEFAULT 0,
  estimated_cost   NUMERIC(10,6) NOT NULL DEFAULT 0,
  status           TEXT         NOT NULL DEFAULT 'completed'
                                CHECK (status IN ('completed','failed','fallback')),
  error_message    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace_created
  ON ai_requests (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace_status
  ON ai_requests (workspace_id, status)
  WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace_builder
  ON ai_requests (workspace_id, builder_id);

CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace_provider
  ON ai_requests (workspace_id, provider);

-- Row Level Security
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read ai_requests"
  ON ai_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = ai_requests.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users insert ai_requests"
  ON ai_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
