-- Sprint 11 — Builder Marketplace
-- Project: ogfuduavlgpdwqzcaqfy
-- Run in: Supabase Dashboard → SQL Editor

-- ── marketplace_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_items (
  id          text        PRIMARY KEY,
  name        text        NOT NULL,
  description text,
  category    text        NOT NULL DEFAULT 'Khac',
  plan        text        NOT NULL DEFAULT 'free',
  icon        text        NOT NULL DEFAULT 'sparkle',
  version     text        NOT NULL DEFAULT '1.0.0',
  is_featured boolean     NOT NULL DEFAULT false,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace items readable by authenticated users"
  ON marketplace_items FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO marketplace_items (id, name, description, category, plan, icon, is_featured) VALUES
  ('prompt-builder',  'Prompt Builder',           'Tao prompt AI chuyen nghiep de dung voi Claude, GPT va Gemini',                'Nang suat',  'free',    'sparkle',  true),
  ('sop-builder',     'SOP Builder',              'Tao quy trinh chuan (SOP) chuyen nghiep cho doanh nghiep',                     'Van hanh',   'starter', 'document', true),
  ('youtube-builder', 'YouTube Script Builder',   'Tao kich ban video YouTube hap dan voi cau truc chuyen nghiep',                'Noi dung',   'pro',     'video',    false),
  ('email-builder',   'Email Automation Builder', 'Tao chuoi email marketing, nurturing tu dong cho tung giai doan khach hang',   'Marketing',  'pro',     'sparkle',  false),
  ('sales-builder',   'Sales Script Builder',     'Tao kich ban ban hang thuyet phuc cho tung doi tuong khach hang',               'Kinh doanh', 'starter', 'sparkle',  false)
ON CONFLICT (id) DO NOTHING;

-- ── marketplace_installs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_installs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  text        NOT NULL,
  item_id       text        NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  installed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  installed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_installs_ws   ON marketplace_installs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_installs_item ON marketplace_installs (item_id);

ALTER TABLE marketplace_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own workspace installs"
  ON marketplace_installs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = marketplace_installs.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members manage own workspace installs"
  ON marketplace_installs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = marketplace_installs.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = marketplace_installs.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- ── marketplace_reviews ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     text        NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);

ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews readable by authenticated users"
  ON marketplace_reviews FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage own reviews"
  ON marketplace_reviews FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
