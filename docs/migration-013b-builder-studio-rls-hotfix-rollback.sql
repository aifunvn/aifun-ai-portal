-- ============================================================
-- Rollback for migration-013b-builder-studio-rls-hotfix.sql
-- Restores the original inline-EXISTS policies from migration 013
-- and drops the SECURITY DEFINER helper function.
-- ============================================================

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

DROP FUNCTION IF EXISTS _aifun_is_workspace_member(TEXT, UUID);
