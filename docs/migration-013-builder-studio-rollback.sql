-- ============================================================
-- Rollback for Migration 013: Builder Studio
-- Drops everything created by migration-013-builder-studio.sql,
-- in dependency order. Does NOT touch any other table.
-- ============================================================

DROP POLICY IF EXISTS "builder_analytics_member_insert" ON custom_builder_analytics;
DROP POLICY IF EXISTS "builder_analytics_member_select" ON custom_builder_analytics;
DROP POLICY IF EXISTS "builder_versions_member_insert"  ON custom_builder_versions;
DROP POLICY IF EXISTS "builder_versions_member_select"  ON custom_builder_versions;
DROP POLICY IF EXISTS "custom_builders_member_update"   ON custom_builders;
DROP POLICY IF EXISTS "custom_builders_member_insert"   ON custom_builders;
DROP POLICY IF EXISTS "custom_builders_member_select"   ON custom_builders;

DROP TRIGGER IF EXISTS trg_custom_builders_updated_at ON custom_builders;

-- Only drop the trigger function if nothing else uses it.
-- (Not currently used by any other table as of Sprint 17.)
DROP FUNCTION IF EXISTS _aifun_touch_updated_at();

DROP TABLE IF EXISTS custom_builder_analytics;
DROP TABLE IF EXISTS custom_builder_versions;
DROP TABLE IF EXISTS custom_builders;
