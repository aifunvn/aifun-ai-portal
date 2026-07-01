-- ============================================================
-- Migration 013c: Soft-delete SECURITY DEFINER function
-- Branch: develop-v4-sprint17
--
-- Root cause: PostgreSQL RLS enforces that after an UPDATE, the
-- new row must still satisfy the table's SELECT policy. The SELECT
-- policy on custom_builders requires `deleted_at IS NULL`. A
-- soft-delete sets deleted_at = now(), so the new row fails the
-- SELECT policy check → 42501 "new row violates row-level security
-- policy". Edit and Publish pass because they never touch deleted_at.
--
-- Fix: SECURITY DEFINER function that:
--   1. Verifies the caller is a workspace member (uses the existing
--      _aifun_is_workspace_member helper — also SECURITY DEFINER).
--   2. Performs the UPDATE outside of RLS, so the SELECT policy
--      visibility check is not applied to the new row.
--
-- No RLS policy changes. No schema changes. No table changes.
-- Only affects: soft-delete path. Edit, Publish, List are untouched.
-- ============================================================

CREATE OR REPLACE FUNCTION _aifun_soft_delete_builder(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id TEXT;
BEGIN
  -- Read the builder's workspace_id directly (SECURITY DEFINER bypasses
  -- SELECT RLS, so this works even if the row is already soft-deleted).
  SELECT workspace_id INTO v_workspace_id
  FROM custom_builders
  WHERE id = p_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    -- Row does not exist or is already soft-deleted.
    RETURN FALSE;
  END IF;

  -- Authorise: caller must be a member of the builder's workspace.
  -- _aifun_is_workspace_member is also SECURITY DEFINER, so this is
  -- safe from nested-RLS recursion.
  IF NOT _aifun_is_workspace_member(v_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'permission denied for table custom_builders'
      USING ERRCODE = '42501';
  END IF;

  -- Perform soft-delete outside of RLS (SECURITY DEFINER context).
  UPDATE custom_builders
  SET deleted_at = NOW()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Allow authenticated users to call this function via supabase.rpc().
GRANT EXECUTE ON FUNCTION _aifun_soft_delete_builder(UUID) TO authenticated;

COMMENT ON FUNCTION _aifun_soft_delete_builder IS
  'SECURITY DEFINER soft-delete for custom_builders. Checks membership '
  'via _aifun_is_workspace_member before updating deleted_at. Bypasses '
  'the SELECT RLS "deleted_at IS NULL" check that would block a plain '
  'UPDATE (PostgreSQL enforces SELECT policy visibility on the new row '
  'after any UPDATE — migration 013c root cause).';
