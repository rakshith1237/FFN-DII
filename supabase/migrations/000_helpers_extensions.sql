-- ============================================================
-- FFN Migration 000: Helpers & Extensions
-- EXECUTE FIRST — all subsequent migrations depend on these
-- FRD: Section 115.3 | ADR-EXT-002 | ADR-EXT-008 | ADR-EXT-013
-- ============================================================

-- pgvector extension (ADR-EXT-008)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- JWT CLAIM HELPERS
-- All RLS policies call these — never auth.jwt() directly
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(auth.jwt() ->> 'tenant_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION get_persona_code()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT auth.jwt() ->> 'persona_code';
$$;

CREATE OR REPLACE FUNCTION get_org_type()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT auth.jwt() ->> 'org_type';
$$;

CREATE OR REPLACE FUNCTION is_flex_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT (auth.jwt() ->> 'persona_code') = 'flex_admin';
$$;

CREATE OR REPLACE FUNCTION is_partner_org()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT (auth.jwt() ->> 'org_type') = 'partner';
$$;

CREATE OR REPLACE FUNCTION is_agency_org()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT (auth.jwt() ->> 'org_type') = 'agency';
$$;

-- ============================================================
-- UTILITY TRIGGER FUNCTIONS
-- ============================================================

-- Fires BEFORE UPDATE on all non-append-only tables
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fires BEFORE DELETE on append-only tables (Layer 1 of 2 — ADR-EXT-013)
-- Layer 2 is the RLS DELETE=FALSE policy in 002_rls_policies.sql
-- Both layers are independent; both must be simultaneously bypassed
CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Deletes are not permitted on this table. This record is append-only per ADR-EXT-013.';
END;
$$;
