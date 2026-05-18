-- ============================================================
-- FFN Migration 003: Append-Only BEFORE DELETE Triggers
-- ADR-EXT-013: Two independent enforcement layers
-- This is Layer 1. Layer 2 is RLS DELETE=FALSE in 002_rls_policies.sql
-- Both layers are independent — both must be bypassed simultaneously
-- PREREQUISITE: 000_helpers_extensions.sql (defines prevent_delete())
-- ============================================================

-- x_ffn_audit_log (ADR-009)
CREATE TRIGGER no_delete_audit_log
  BEFORE DELETE ON x_ffn_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- x_ffn_override_request (ADR-005)
CREATE TRIGGER no_delete_override_request
  BEFORE DELETE ON x_ffn_override_request
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- x_ffn_score_audit (BR-SCR-005)
CREATE TRIGGER no_delete_score_audit
  BEFORE DELETE ON x_ffn_score_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- x_ffn_vms_inbox (raw email audit trail)
CREATE TRIGGER no_delete_vms_inbox
  BEFORE DELETE ON x_ffn_vms_inbox
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();
