-- ============================================================
-- Rollback for migration-013c-soft-delete-fn.sql
-- Drops the SECURITY DEFINER soft-delete function.
-- Does NOT touch tables, policies, or other functions.
-- After rollback, soft-delete will fail with 42501 again (expected).
-- ============================================================

DROP FUNCTION IF EXISTS _aifun_soft_delete_builder(UUID);
