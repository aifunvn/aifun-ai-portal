-- ============================================================
-- Hotfix for Migration 013: Builder Studio RLS
-- Symptom: PATCH .../custom_builders (soft-delete, setting only
-- deleted_at) returns 403, while a full-row UPDATE (Edit) on the
-- exact same table/policy succeeds.
--
-- Root cause: the UPDATE policy's USING/WITH CHECK contains an
-- inline `EXISTS (SELECT 1 FROM workspace_members wm WHERE ...)`.
-- workspace_members has its own RLS; evaluating it from inside
-- another table's USING/WITH CHECK can behave inconsistently
-- depending on which clause (USING vs WITH CHECK) the planner
-- folds the subquery into — the same class of nested-RLS issue
-- fixed in Sprint 15 for organization_members (see
-- _aifun_is_org_member). Fix: wrap the membership check in a
-- SECURITY DEFINER function so it always bypasses RLS on
-- workspace_members, regardless of evaluation context.
-- ============================================================

CREATE OR REPLACE FUNCTION _aifun_is_workspace_member(p_workspace_id TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = p_user_id
  );
$$;

-- ── custom_builders ──────────────────────────────────────────
DROP POLICY IF EXISTS "custom_builders_member_select" ON custom_builders;
CREATE POLICY "custom_builders_member_select" ON custom_builders FOR SELECT
  USING (
    deleted_at IS NULL AND _aifun_is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "custom_builders_member_insert" ON custom_builders;
CREATE POLICY "custom_builders_member_insert" ON custom_builders FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND _aifun_is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "custom_builders_member_update" ON custom_builders;
CREATE POLICY "custom_builders_member_update" ON custom_builders FOR UPDATE
  USING (     _aifun_is_workspace_member(workspace_id, auth.uid()) )
  WITH CHECK ( _aifun_is_workspace_member(workspace_id, auth.uid()) );

-- ── custom_builder_versions ──────────────────────────────────
DROP POLICY IF EXISTS "builder_versions_member_select" ON custom_builder_versions;
CREATE POLICY "builder_versions_member_select" ON custom_builder_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_builders cb
      WHERE cb.id = custom_builder_versions.builder_id
        AND _aifun_is_workspace_member(cb.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "builder_versions_member_insert" ON custom_builder_versions;
CREATE POLICY "builder_versions_member_insert" ON custom_builder_versions FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM custom_builders cb
      WHERE cb.id = custom_builder_versions.builder_id
        AND _aifun_is_workspace_member(cb.workspace_id, auth.uid())
    )
  );

-- ── custom_builder_analytics ─────────────────────────────────
DROP POLICY IF EXISTS "builder_analytics_member_select" ON custom_builder_analytics;
CREATE POLICY "builder_analytics_member_select" ON custom_builder_analytics FOR SELECT
  USING ( _aifun_is_workspace_member(workspace_id, auth.uid()) );

DROP POLICY IF EXISTS "builder_analytics_member_insert" ON custom_builder_analytics;
CREATE POLICY "builder_analytics_member_insert" ON custom_builder_analytics FOR INSERT
  WITH CHECK ( _aifun_is_workspace_member(workspace_id, auth.uid()) );

COMMENT ON FUNCTION _aifun_is_workspace_member IS
  'SECURITY DEFINER helper — bypasses RLS on workspace_members so membership checks inside custom_builders* policies evaluate consistently for both USING and WITH CHECK. Mirrors the _aifun_is_org_member pattern from Sprint 15.';
