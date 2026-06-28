-- Migration 008: Workspace Branding
-- Thêm cột brand_color và favicon_url vào bảng workspace_settings
-- Chạy trong Supabase SQL Editor

ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN workspace_settings.brand_color IS
  'Primary brand colour (hex #rrggbb). Applied as --c-primary CSS variable across the app.';
COMMENT ON COLUMN workspace_settings.favicon_url IS
  'URL of workspace favicon (32x32 ICO/PNG). Empty = use default AIFUN favicon.';
