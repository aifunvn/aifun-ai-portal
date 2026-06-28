-- Sprint 9 — Supabase Persistence Layer
-- Project: ogfuduavlgpdwqzcaqfy
-- Run in: Supabase Dashboard → SQL Editor

-- ── documents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                text         PRIMARY KEY,
  workspace_id      text         NOT NULL,
  user_id           uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  title             text         NOT NULL,
  content           text         NOT NULL DEFAULT '',
  builder_id        text,
  builder_name      text,
  provider          text,
  model             text,
  doc_url           text,
  tokens_prompt     int          NOT NULL DEFAULT 0,
  tokens_completion int          NOT NULL DEFAULT 0,
  tokens_total      int          NOT NULL DEFAULT 0,
  form_data         jsonb,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at   ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_id      ON documents (user_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON documents FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── builder_history ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS builder_history (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      text         NOT NULL,
  user_id           uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  builder_id        text         NOT NULL,
  builder_name      text,
  provider          text,
  model             text,
  tokens_prompt     int          NOT NULL DEFAULT 0,
  tokens_completion int          NOT NULL DEFAULT 0,
  tokens_total      int          NOT NULL DEFAULT 0,
  status            text         NOT NULL DEFAULT 'completed',
  document_id       text         REFERENCES documents(id) ON DELETE SET NULL,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_history_workspace ON builder_history (workspace_id);
CREATE INDEX IF NOT EXISTS idx_builder_history_user      ON builder_history (user_id);

ALTER TABLE builder_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own history"
  ON builder_history FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── builder_templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS builder_templates (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  text         NOT NULL,
  user_id       uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  builder_id    text         NOT NULL,
  name          text         NOT NULL,
  form_data     jsonb        NOT NULL DEFAULT '{}',
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_templates_ws_builder ON builder_templates (workspace_id, builder_id);

ALTER TABLE builder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates"
  ON builder_templates FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── favorite_builders ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_builders (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  text         NOT NULL,
  user_id       uuid         REFERENCES auth.users(id) ON DELETE CASCADE,
  builder_id    text         NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, builder_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_builders_user ON favorite_builders (user_id);

ALTER TABLE favorite_builders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON favorite_builders FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
