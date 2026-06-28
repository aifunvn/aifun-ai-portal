-- Sprint 10 — User, Role & Permission System
-- Project: ogfuduavlgpdwqzcaqfy
-- Run in: Supabase Dashboard → SQL Editor

-- ── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
  ON user_profiles FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── roles ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          text        PRIMARY KEY,
  label       text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles readable by authenticated users"
  ON roles FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO roles (id, label, description) VALUES
  ('owner',  'Chủ sở hữu',    'Toàn quyền quản lý workspace'),
  ('admin',  'Quản trị viên',  'Quản lý thành viên và cài đặt'),
  ('editor', 'Biên tập viên',  'Tạo và chỉnh sửa tài liệu'),
  ('viewer', 'Người xem',      'Chỉ xem tài liệu')
ON CONFLICT (id) DO NOTHING;

-- ── permissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          text        PRIMARY KEY,
  group_name  text        NOT NULL,
  action      text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions readable by authenticated users"
  ON permissions FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO permissions (id, group_name, action) VALUES
  ('dashboard:read',      'dashboard',   'read'),
  ('builders:read',       'builders',    'read'),
  ('builders:run',        'builders',    'run'),
  ('builders:install',    'builders',    'install'),
  ('documents:read',      'documents',   'read'),
  ('documents:create',    'documents',   'create'),
  ('documents:delete',    'documents',   'delete'),
  ('marketplace:read',    'marketplace', 'read'),
  ('marketplace:install', 'marketplace', 'install'),
  ('settings:read',       'settings',    'read'),
  ('settings:update',     'settings',    'update'),
  ('billing:read',        'billing',     'read'),
  ('admin:read',          'admin',       'read')
ON CONFLICT (id) DO NOTHING;

-- ── role_permissions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       text REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id text REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role permissions readable by authenticated users"
  ON role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO role_permissions (role_id, permission_id) VALUES
  -- admin
  ('admin', 'dashboard:read'),
  ('admin', 'builders:read'),
  ('admin', 'builders:run'),
  ('admin', 'builders:install'),
  ('admin', 'documents:read'),
  ('admin', 'documents:create'),
  ('admin', 'documents:delete'),
  ('admin', 'marketplace:read'),
  ('admin', 'marketplace:install'),
  ('admin', 'settings:read'),
  ('admin', 'settings:update'),
  ('admin', 'billing:read'),
  ('admin', 'admin:read'),
  -- editor
  ('editor', 'dashboard:read'),
  ('editor', 'builders:read'),
  ('editor', 'builders:run'),
  ('editor', 'documents:read'),
  ('editor', 'documents:create'),
  ('editor', 'documents:delete'),
  ('editor', 'marketplace:read'),
  ('editor', 'settings:read'),
  -- viewer
  ('viewer', 'dashboard:read'),
  ('viewer', 'documents:read')
ON CONFLICT DO NOTHING;

-- ── workspace_members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  text        NOT NULL,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id       text        NOT NULL REFERENCES roles(id),
  invited_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws   ON workspace_members (workspace_id);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own memberships"
  ON workspace_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own membership"
  ON workspace_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── workspace_usage_limits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_usage_limits (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  text        NOT NULL UNIQUE,
  plan          text        NOT NULL DEFAULT 'free',
  daily_limit   int         NOT NULL DEFAULT 20,
  used_today    int         NOT NULL DEFAULT 0,
  reset_at      timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_limits_ws ON workspace_usage_limits (workspace_id);

ALTER TABLE workspace_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own workspace usage"
  ON workspace_usage_limits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_usage_limits.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members update own workspace usage"
  ON workspace_usage_limits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_usage_limits.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_usage_limits.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );
