-- ============================================================
-- FFN Migration 001: Core Tables — All 37 x_ffn_* Tables
-- FRD: Section 115.3 | 06_FFN_Data_Model.md
-- PREREQUISITE: 000_helpers_extensions.sql must run first
-- RLS policies applied separately in 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- 01. x_ffn_tenant
-- Root entity. No tenant_id FK (IS the tenant).
-- ============================================================
CREATE TABLE x_ffn_tenant (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('partner', 'agency')),
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'suspended', 'deactivated')),
  subscription_plan       TEXT,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  primary_contact_email   TEXT,
  primary_contact_name    TEXT,
  logo_storage_path       TEXT,
  timezone                TEXT NOT NULL DEFAULT 'UTC',
  max_users               INTEGER NOT NULL DEFAULT 50,
  storage_quota_mb        INTEGER NOT NULL DEFAULT 10240,
  suspended_at            TIMESTAMPTZ,
  suspension_reason       TEXT,
  deactivated_at          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_type   ON x_ffn_tenant (type);
CREATE INDEX idx_tenant_status ON x_ffn_tenant (status);

-- ============================================================
-- 02. x_ffn_setting — 3-tier key-value store
-- ============================================================
CREATE TABLE x_ffn_setting (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES x_ffn_tenant(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier         INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  key          TEXT NOT NULL,
  value        TEXT NOT NULL,
  data_type    TEXT NOT NULL DEFAULT 'string'
                 CHECK (data_type IN ('string', 'integer', 'boolean', 'decimal', 'json')),
  description  TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, tier, key)
);
CREATE INDEX idx_setting_tenant   ON x_ffn_setting (tenant_id);
CREATE INDEX idx_setting_user     ON x_ffn_setting (user_id);
CREATE INDEX idx_setting_tier_key ON x_ffn_setting (tier, key);

-- ============================================================
-- 03. x_ffn_audit_log — APPEND-ONLY (ADR-009)
-- ============================================================
CREATE TABLE x_ffn_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES x_ffn_tenant(id),
  actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  persona_code TEXT NOT NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NO updated_at: append-only table
);
CREATE INDEX idx_audit_tenant     ON x_ffn_audit_log (tenant_id);
CREATE INDEX idx_audit_actor      ON x_ffn_audit_log (actor_id);
CREATE INDEX idx_audit_entity     ON x_ffn_audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON x_ffn_audit_log (created_at DESC);

-- ============================================================
-- 04. x_ffn_skill_taxonomy — Platform-level (no tenant_id)
-- ============================================================
CREATE TABLE x_ffn_skill_taxonomy (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
                'technical', 'certification', 'soft_skill',
                'tool', 'language', 'domain', 'other'
              )),
  parent_id   UUID REFERENCES x_ffn_skill_taxonomy(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_skill_taxonomy_category ON x_ffn_skill_taxonomy (category);
CREATE INDEX idx_skill_taxonomy_active   ON x_ffn_skill_taxonomy (is_active);
CREATE INDEX idx_skill_taxonomy_parent   ON x_ffn_skill_taxonomy (parent_id);

-- ============================================================
-- 05. x_ffn_functional_domain — Platform-level
-- ============================================================
CREATE TABLE x_ffn_functional_domain (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_functional_domain_active ON x_ffn_functional_domain (is_active);

-- ============================================================
-- 06. x_ffn_business_domain — Platform-level
-- ============================================================
CREATE TABLE x_ffn_business_domain (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_domain_active ON x_ffn_business_domain (is_active);

-- ============================================================
-- 07. x_ffn_vms_domain_map
-- ============================================================
CREATE TABLE x_ffn_vms_domain_map (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES x_ffn_tenant(id),
  vms_domain_raw       TEXT NOT NULL,
  functional_domain_id UUID REFERENCES x_ffn_functional_domain(id) ON DELETE SET NULL,
  business_domain_id   UUID REFERENCES x_ffn_business_domain(id) ON DELETE SET NULL,
  confidence           NUMERIC(5,2),
  mapped_by            TEXT NOT NULL DEFAULT 'ai' CHECK (mapped_by IN ('ai', 'manual')),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, vms_domain_raw)
);
CREATE INDEX idx_vms_domain_map_tenant ON x_ffn_vms_domain_map (tenant_id);

-- ============================================================
-- 08. x_ffn_rtr_template
-- ============================================================
CREATE TABLE x_ffn_rtr_template (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES x_ffn_tenant(id),
  name            TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  body_plain      TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rtr_template_tenant ON x_ffn_rtr_template (tenant_id);

-- ============================================================
-- 09. x_ffn_jd — Job Description (central table)
-- ADR-001: hm_id != recruiter_id enforced as CHECK
-- ============================================================
CREATE TABLE x_ffn_jd (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES x_ffn_tenant(id),
  number                  TEXT NOT NULL UNIQUE,
  title                   TEXT NOT NULL,
  functional_domain_id    UUID REFERENCES x_ffn_functional_domain(id) ON DELETE SET NULL,
  business_domain_id      UUID REFERENCES x_ffn_business_domain(id) ON DELETE SET NULL,
  rtr_template_id         UUID REFERENCES x_ffn_rtr_template(id) ON DELETE SET NULL,
  hm_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recruiter_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description             TEXT,
  requirements            TEXT,
  location_city           TEXT,
  location_country        CHAR(2),
  location_type           TEXT NOT NULL DEFAULT 'onsite'
                            CHECK (location_type IN ('onsite', 'remote', 'hybrid')),
  employment_type         TEXT NOT NULL DEFAULT 'contract'
                            CHECK (employment_type IN ('contract', 'contract_to_hire', 'permanent')),
  currency                CHAR(3) NOT NULL DEFAULT 'USD',
  bill_rate_min           NUMERIC(15,2),
  bill_rate_max           NUMERIC(15,2),
  rate_model              TEXT NOT NULL DEFAULT 'hourly'
                            CHECK (rate_model IN ('hourly', 'daily', 'fixed')),
  headcount               INTEGER NOT NULL DEFAULT 1 CHECK (headcount > 0),
  target_start_date       DATE,
  vms_ref                 TEXT,
  vms_source              TEXT,
  intellimatch_threshold  INTEGER NOT NULL DEFAULT 70
                            CHECK (intellimatch_threshold BETWEEN 0 AND 100),
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN (
                              'draft', 'active', 'broadcast', 'filled',
                              'retracted', 'expired', 'closed'
                            )),
  published_at            TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  parsed_from_vms_inbox_id UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ADR-001: Hiring Manager cannot be the same person as the Recruiter
  CONSTRAINT chk_hm_ne_recruiter CHECK (hm_id != recruiter_id)
);
CREATE INDEX idx_jd_tenant       ON x_ffn_jd (tenant_id);
CREATE INDEX idx_jd_hm           ON x_ffn_jd (hm_id);
CREATE INDEX idx_jd_recruiter    ON x_ffn_jd (recruiter_id);
CREATE INDEX idx_jd_status       ON x_ffn_jd (status);
CREATE INDEX idx_jd_published_at ON x_ffn_jd (published_at DESC);

-- ============================================================
-- 10. x_ffn_jd_factor_config
-- ============================================================
CREATE TABLE x_ffn_jd_factor_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id        UUID NOT NULL REFERENCES x_ffn_jd(id) ON DELETE CASCADE,
  factor_code  TEXT NOT NULL,
  weight       NUMERIC(5,2) NOT NULL CHECK (weight BETWEEN 0 AND 100),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jd_id, factor_code)
);
CREATE INDEX idx_jd_factor_config_jd     ON x_ffn_jd_factor_config (jd_id);
CREATE INDEX idx_jd_factor_config_tenant ON x_ffn_jd_factor_config (tenant_id);

-- ============================================================
-- 11. x_ffn_jd_factor_scenario
-- ============================================================
CREATE TABLE x_ffn_jd_factor_scenario (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id            UUID NOT NULL REFERENCES x_ffn_jd(id) ON DELETE CASCADE,
  factor_config_id UUID NOT NULL REFERENCES x_ffn_jd_factor_config(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  score            NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 10),
  description      TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jd_factor_scenario_jd     ON x_ffn_jd_factor_scenario (jd_id);
CREATE INDEX idx_jd_factor_scenario_factor ON x_ffn_jd_factor_scenario (factor_config_id);

-- ============================================================
-- 12. x_ffn_jd_interview_criterion
-- ============================================================
CREATE TABLE x_ffn_jd_interview_criterion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id       UUID NOT NULL REFERENCES x_ffn_jd(id) ON DELETE CASCADE,
  criterion   TEXT NOT NULL,
  weight      NUMERIC(5,2) NOT NULL CHECK (weight BETWEEN 0 AND 100),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jd_interview_criterion_jd ON x_ffn_jd_interview_criterion (jd_id);

-- ============================================================
-- 13. x_ffn_jd_broadcast
-- ============================================================
CREATE TABLE x_ffn_jd_broadcast (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id            UUID NOT NULL REFERENCES x_ffn_jd(id) ON DELETE CASCADE,
  agency_tenant_id UUID NOT NULL REFERENCES x_ffn_tenant(id),
  broadcast_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'expired', 'withdrawn')),
  message          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jd_id, agency_tenant_id)
);
CREATE INDEX idx_jd_broadcast_jd     ON x_ffn_jd_broadcast (jd_id);
CREATE INDEX idx_jd_broadcast_agency ON x_ffn_jd_broadcast (agency_tenant_id);
CREATE INDEX idx_jd_broadcast_tenant ON x_ffn_jd_broadcast (tenant_id);

-- ============================================================
-- 14. x_ffn_candidate
-- ============================================================
CREATE TABLE x_ffn_candidate (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES x_ffn_tenant(id),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT NOT NULL,
  phone                    TEXT,
  location_city            TEXT,
  location_country         CHAR(2),
  linkedin_url             TEXT,
  resume_storage_path      TEXT,
  resume_parsed_at         TIMESTAMPTZ,
  years_experience         INTEGER,
  current_employer         TEXT,
  current_title            TEXT,
  availability_date        DATE,
  rate_expectation_min     NUMERIC(15,2),
  rate_expectation_max     NUMERIC(15,2),
  rate_model               TEXT CHECK (rate_model IN ('hourly', 'daily', 'fixed')),
  currency                 CHAR(3) DEFAULT 'USD',
  ir35_status              TEXT CHECK (ir35_status IN ('inside', 'outside', 'undetermined')),
  work_authorization       TEXT,
  bench_status             TEXT NOT NULL DEFAULT 'not_on_bench'
                             CHECK (bench_status IN ('on_bench', 'not_on_bench', 'engaged')),
  bench_available_from     DATE,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'inactive', 'blacklisted')),
  created_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_candidate_tenant     ON x_ffn_candidate (tenant_id);
CREATE INDEX idx_candidate_email      ON x_ffn_candidate (tenant_id, email);
CREATE INDEX idx_candidate_bench      ON x_ffn_candidate (bench_status);
CREATE INDEX idx_candidate_status     ON x_ffn_candidate (status);

-- ============================================================
-- 15. x_ffn_candidate_skill
-- ============================================================
CREATE TABLE x_ffn_candidate_skill (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES x_ffn_tenant(id),
  candidate_id    UUID NOT NULL REFERENCES x_ffn_candidate(id) ON DELETE CASCADE,
  skill_id        UUID NOT NULL REFERENCES x_ffn_skill_taxonomy(id) ON DELETE RESTRICT,
  proficiency     TEXT NOT NULL DEFAULT 'intermediate'
                    CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years           NUMERIC(4,1),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'resume_parse', 'ai_inferred')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, skill_id)
);
CREATE INDEX idx_candidate_skill_candidate ON x_ffn_candidate_skill (candidate_id);
CREATE INDEX idx_candidate_skill_skill     ON x_ffn_candidate_skill (skill_id);
CREATE INDEX idx_candidate_skill_tenant    ON x_ffn_candidate_skill (tenant_id);

-- ============================================================
-- 16. x_ffn_candidate_cert
-- ============================================================
CREATE TABLE x_ffn_candidate_cert (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES x_ffn_tenant(id),
  candidate_id          UUID NOT NULL REFERENCES x_ffn_candidate(id) ON DELETE CASCADE,
  cert_name             TEXT NOT NULL,
  cert_issuer           TEXT,
  cert_id               TEXT,
  issued_date           DATE,
  expiry_date           DATE,
  credly_badge_id       TEXT,
  verification_status   TEXT NOT NULL DEFAULT 'self_attested'
                          CHECK (verification_status IN (
                            'self_attested', 'credly_verified',
                            'expired', 'revoked'
                          )),
  verification_checked_at TIMESTAMPTZ,
  cert_storage_path     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_cert_candidate ON x_ffn_candidate_cert (candidate_id);
CREATE INDEX idx_candidate_cert_tenant    ON x_ffn_candidate_cert (tenant_id);
CREATE INDEX idx_candidate_cert_credly    ON x_ffn_candidate_cert (credly_badge_id);

-- ============================================================
-- 17. x_ffn_bench_index
-- skill_vector vector(1536) added separately in 004_bench_vector.sql
-- ============================================================
CREATE TABLE x_ffn_bench_index (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES x_ffn_tenant(id),
  candidate_id        UUID NOT NULL REFERENCES x_ffn_candidate(id) ON DELETE CASCADE,
  skill_text          TEXT NOT NULL,
  embedding_model     TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
  embedded_at         TIMESTAMPTZ,
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  bench_available_from DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bench_index_tenant    ON x_ffn_bench_index (tenant_id);
CREATE INDEX idx_bench_index_candidate ON x_ffn_bench_index (candidate_id);
CREATE INDEX idx_bench_index_current   ON x_ffn_bench_index (is_current);

-- ============================================================
-- 18. x_ffn_rtr — Right to Represent
-- ============================================================
CREATE TABLE x_ffn_rtr (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES x_ffn_tenant(id),
  number              TEXT NOT NULL UNIQUE,
  jd_id               UUID NOT NULL REFERENCES x_ffn_jd(id),
  candidate_id        UUID NOT NULL REFERENCES x_ffn_candidate(id),
  agency_tenant_id    UUID NOT NULL REFERENCES x_ffn_tenant(id),
  template_id         UUID REFERENCES x_ffn_rtr_template(id) ON DELETE SET NULL,
  recruiter_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  arm_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  docusign_envelope_id TEXT,
  docusign_status     TEXT CHECK (docusign_status IN (
                        'sent', 'delivered', 'completed', 'voided', 'declined'
                      )),
  signed_at           TIMESTAMPTZ,
  voided_at           TIMESTAMPTZ,
  void_reason         TEXT,
  expires_at          TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'sent', 'signed', 'expired', 'voided'
                        )),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rtr_tenant    ON x_ffn_rtr (tenant_id);
CREATE INDEX idx_rtr_jd        ON x_ffn_rtr (jd_id);
CREATE INDEX idx_rtr_candidate ON x_ffn_rtr (candidate_id);
CREATE INDEX idx_rtr_agency    ON x_ffn_rtr (agency_tenant_id);
CREATE INDEX idx_rtr_status    ON x_ffn_rtr (status);

-- ============================================================
-- 19. x_ffn_submission
-- Created only on ARM RTR approval (BR-RTR-001)
-- ============================================================
CREATE TABLE x_ffn_submission (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id                 UUID NOT NULL REFERENCES x_ffn_jd(id),
  candidate_id          UUID NOT NULL REFERENCES x_ffn_candidate(id),
  rtr_id                UUID NOT NULL REFERENCES x_ffn_rtr(id),
  agency_tenant_id      UUID NOT NULL REFERENCES x_ffn_tenant(id),
  partner_tenant_id     UUID NOT NULL REFERENCES x_ffn_tenant(id),
  recruiter_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  cover_note            VARCHAR(500),
  intellimatch_score    NUMERIC(5,2),
  technical_fit_score   NUMERIC(5,2),
  auxiliary_fit_score   NUMERIC(5,2),
  score_factor_snapshot JSONB,
  scored_at             TIMESTAMPTZ,
  geo_routing_result    TEXT CHECK (geo_routing_result IN ('passed', 'soft_warning', 'hard_block')),
  status                TEXT NOT NULL DEFAULT 'received'
                          CHECK (status IN (
                            'received', 'under_review', 'shortlisted',
                            'interview_scheduled', 'rejected', 'offer_made', 'filled'
                          )),
  disposition_outcome   TEXT CHECK (disposition_outcome IN (
                          'offer_accepted', 'rejected_by_partner',
                          'withdrawn_by_agency', 'filled_by_other'
                        )),
  disposition_notes     TEXT,
  dispositioned_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submission_jd           ON x_ffn_submission (jd_id);
CREATE INDEX idx_submission_candidate    ON x_ffn_submission (candidate_id);
CREATE INDEX idx_submission_agency       ON x_ffn_submission (agency_tenant_id);
CREATE INDEX idx_submission_partner      ON x_ffn_submission (partner_tenant_id);
CREATE INDEX idx_submission_status       ON x_ffn_submission (status);
CREATE INDEX idx_submission_rtr          ON x_ffn_submission (rtr_id);
CREATE INDEX idx_submission_submitted_at ON x_ffn_submission (submitted_at DESC);

-- ============================================================
-- 20. x_ffn_override_request — APPEND-ONLY (ADR-005)
-- ============================================================
CREATE TABLE x_ffn_override_request (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number                    TEXT NOT NULL UNIQUE,
  tenant_id                 UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id                     UUID NOT NULL REFERENCES x_ffn_jd(id),
  submission_id             UUID NOT NULL REFERENCES x_ffn_submission(id),
  candidate_id              UUID NOT NULL REFERENCES x_ffn_candidate(id),
  agency_tenant_id          UUID NOT NULL REFERENCES x_ffn_tenant(id),
  requesting_hm_role        TEXT NOT NULL DEFAULT 'Partner Hiring Manager',
  reason_code               TEXT NOT NULL
                              CHECK (reason_code IN (
                                'talent_scarcity', 'exceptional_experience',
                                'client_relationship', 'urgent_business_need',
                                'cert_expected', 'other'
                              )),
  justification             TEXT NOT NULL CHECK (LENGTH(justification) >= 20),
  score_at_request          NUMERIC(5,2) NOT NULL,
  threshold_at_request      INTEGER NOT NULL,
  score_gap                 NUMERIC(5,2) NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'requested'
                              CHECK (status IN ('requested', 'approved', 'rejected', 'withdrawn')),
  approver_arm_role         TEXT DEFAULT 'Agency Recruiting Manager',
  approver_agency_tenant_id UUID REFERENCES x_ffn_tenant(id),
  approval_date             TIMESTAMPTZ,
  rejection_date            TIMESTAMPTZ,
  rejection_reason_code     TEXT CHECK (rejection_reason_code IN (
                              'insufficient_justification', 'score_gap_too_large',
                              'candidate_not_suitable', 'other'
                            )),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NO updated_at: append-only. Only status field is mutated.
);
CREATE INDEX idx_override_tenant       ON x_ffn_override_request (tenant_id);
CREATE INDEX idx_override_jd           ON x_ffn_override_request (jd_id);
CREATE INDEX idx_override_submission   ON x_ffn_override_request (submission_id);
CREATE INDEX idx_override_status       ON x_ffn_override_request (status);
CREATE INDEX idx_override_created_at   ON x_ffn_override_request (created_at DESC);

-- ============================================================
-- 21. x_ffn_score_audit — APPEND-ONLY (BR-SCR-005)
-- ============================================================
CREATE TABLE x_ffn_score_audit (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES x_ffn_tenant(id),
  submission_id         UUID NOT NULL REFERENCES x_ffn_submission(id),
  candidate_id          UUID NOT NULL REFERENCES x_ffn_candidate(id),
  jd_id                 UUID NOT NULL REFERENCES x_ffn_jd(id),
  intellimatch_score    NUMERIC(5,2) NOT NULL,
  technical_fit_score   NUMERIC(5,2) NOT NULL,
  auxiliary_fit_score   NUMERIC(5,2) NOT NULL,
  factor_scores         JSONB NOT NULL,
  bench_vector_snapshot JSONB,
  model_version         TEXT NOT NULL,
  scored_at             TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NO updated_at: append-only. Score records are immutable.
);
CREATE INDEX idx_score_audit_submission ON x_ffn_score_audit (submission_id);
CREATE INDEX idx_score_audit_candidate  ON x_ffn_score_audit (candidate_id);
CREATE INDEX idx_score_audit_tenant     ON x_ffn_score_audit (tenant_id);
CREATE INDEX idx_score_audit_scored_at  ON x_ffn_score_audit (scored_at DESC);

-- ============================================================
-- 22. x_ffn_interview
-- ============================================================
CREATE TABLE x_ffn_interview (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id                     UUID NOT NULL REFERENCES x_ffn_jd(id),
  submission_id             UUID NOT NULL REFERENCES x_ffn_submission(id),
  candidate_id              UUID NOT NULL REFERENCES x_ffn_candidate(id),
  scheduled_at              TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  interview_format          TEXT CHECK (interview_format IN ('video', 'in_person', 'phone')),
  panelists                 JSONB,
  panelists_total_count     INTEGER NOT NULL DEFAULT 0,
  panelists_submitted_count INTEGER NOT NULL DEFAULT 0,
  composite_interview_score NUMERIC(5,2),
  score_computed_at         TIMESTAMPTZ,
  offer_recommendation      TEXT CHECK (offer_recommendation IN (
                              'strong_recommend', 'recommend',
                              'borderline', 'do_not_recommend'
                            )),
  anonymous_panel_mode      BOOLEAN NOT NULL DEFAULT FALSE,
  scorecard_deadline        TIMESTAMPTZ,
  status                    TEXT NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled', 'completed', 'cancelled', 'scored')),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interview_tenant     ON x_ffn_interview (tenant_id);
CREATE INDEX idx_interview_jd         ON x_ffn_interview (jd_id);
CREATE INDEX idx_interview_submission ON x_ffn_interview (submission_id);
CREATE INDEX idx_interview_status     ON x_ffn_interview (status);

-- ============================================================
-- 23. x_ffn_interview_score
-- ============================================================
CREATE TABLE x_ffn_interview_score (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES x_ffn_tenant(id),
  interview_id  UUID NOT NULL REFERENCES x_ffn_interview(id) ON DELETE CASCADE,
  panelist_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  scores        JSONB NOT NULL,
  notes         TEXT,
  recommendation TEXT CHECK (recommendation IN (
                   'strong_recommend', 'recommend', 'borderline', 'do_not_recommend'
                 )),
  is_submitted  BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, panelist_id)
);
CREATE INDEX idx_interview_score_interview ON x_ffn_interview_score (interview_id);
CREATE INDEX idx_interview_score_panelist  ON x_ffn_interview_score (panelist_id);

-- ============================================================
-- 24. x_ffn_offer
-- ============================================================
CREATE TABLE x_ffn_offer (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES x_ffn_tenant(id),
  number                TEXT NOT NULL UNIQUE,
  jd_id                 UUID NOT NULL REFERENCES x_ffn_jd(id),
  submission_id         UUID NOT NULL REFERENCES x_ffn_submission(id),
  candidate_id          UUID NOT NULL REFERENCES x_ffn_candidate(id),
  agency_tenant_id      UUID NOT NULL REFERENCES x_ffn_tenant(id),
  currency              CHAR(3) NOT NULL,
  rate_model            TEXT NOT NULL CHECK (rate_model IN ('hourly', 'daily', 'fixed')),
  offered_bill_rate     NUMERIC(15,2) NOT NULL CHECK (offered_bill_rate > 0),
  payment_terms         TEXT NOT NULL DEFAULT 'net_30'
                          CHECK (payment_terms IN ('net_30', 'net_45', 'net_60', 'net_90')),
  estimated_start_date  DATE NOT NULL,
  estimated_end_date    DATE,
  offer_expiry_date     DATE NOT NULL,
  engagement_duration_weeks INTEGER,
  ir35_determination    TEXT CHECK (ir35_determination IN ('inside', 'outside', 'not_applicable')),
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN (
                            'draft', 'pending_approval', 'approved', 'sent',
                            'accepted', 'declined', 'expired', 'withdrawn'
                          )),
  approved_at           TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  accepted_at           TIMESTAMPTZ,
  declined_at           TIMESTAMPTZ,
  decline_reason        TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offer_tenant    ON x_ffn_offer (tenant_id);
CREATE INDEX idx_offer_jd        ON x_ffn_offer (jd_id);
CREATE INDEX idx_offer_candidate ON x_ffn_offer (candidate_id);
CREATE INDEX idx_offer_agency    ON x_ffn_offer (agency_tenant_id);
CREATE INDEX idx_offer_status    ON x_ffn_offer (status);

-- ============================================================
-- 25. x_ffn_offer_approval_config
-- ============================================================
CREATE TABLE x_ffn_offer_approval_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES x_ffn_tenant(id) UNIQUE,
  requires_psa    BOOLEAN NOT NULL DEFAULT TRUE,
  threshold_amount NUMERIC(15,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 26. x_ffn_offer_approval
-- ============================================================
CREATE TABLE x_ffn_offer_approval (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES x_ffn_tenant(id),
  offer_id      UUID NOT NULL REFERENCES x_ffn_offer(id) ON DELETE CASCADE,
  approver_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  config_id     UUID REFERENCES x_ffn_offer_approval_config(id) ON DELETE SET NULL,
  decision      TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'pending')),
  notes         TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offer_approval_offer    ON x_ffn_offer_approval (offer_id);
CREATE INDEX idx_offer_approval_approver ON x_ffn_offer_approval (approver_id);

-- ============================================================
-- 27. x_ffn_placement
-- ============================================================
CREATE TABLE x_ffn_placement (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES x_ffn_tenant(id),
  agency_tenant_id  UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id             UUID NOT NULL REFERENCES x_ffn_jd(id),
  candidate_id      UUID NOT NULL REFERENCES x_ffn_candidate(id),
  offer_id          UUID NOT NULL REFERENCES x_ffn_offer(id),
  start_date        DATE NOT NULL,
  end_date          DATE,
  bill_rate         NUMERIC(15,2) NOT NULL,
  currency          CHAR(3) NOT NULL,
  rate_model        TEXT NOT NULL CHECK (rate_model IN ('hourly', 'daily', 'fixed')),
  payment_terms     TEXT NOT NULL,
  ir35_status       TEXT CHECK (ir35_status IN ('inside', 'outside', 'not_applicable')),
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN (
                        'active', 'extended', 'ended', 'terminated', 'on_hold'
                      )),
  ended_at          TIMESTAMPTZ,
  end_reason        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_placement_tenant    ON x_ffn_placement (tenant_id);
CREATE INDEX idx_placement_agency    ON x_ffn_placement (agency_tenant_id);
CREATE INDEX idx_placement_jd        ON x_ffn_placement (jd_id);
CREATE INDEX idx_placement_candidate ON x_ffn_placement (candidate_id);
CREATE INDEX idx_placement_status    ON x_ffn_placement (status);
CREATE INDEX idx_placement_start     ON x_ffn_placement (start_date);

-- ============================================================
-- 28. x_ffn_onboarding_task
-- ============================================================
CREATE TABLE x_ffn_onboarding_task (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  placement_id     UUID NOT NULL REFERENCES x_ffn_placement(id) ON DELETE CASCADE,
  task_name        TEXT NOT NULL,
  task_description TEXT,
  task_type        TEXT NOT NULL CHECK (task_type IN (
                     'ir35', 'work_authorization', 'background_check',
                     'compliance', 'equipment', 'custom'
                   )),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN (
                       'pending', 'in_progress', 'completed', 'waived', 'not_applicable'
                     )),
  blocks_start     BOOLEAN NOT NULL DEFAULT FALSE,
  due_date         DATE,
  completed_at     TIMESTAMPTZ,
  completed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_onboarding_task_placement ON x_ffn_onboarding_task (placement_id);
CREATE INDEX idx_onboarding_task_tenant    ON x_ffn_onboarding_task (tenant_id);

-- ============================================================
-- 29. x_ffn_offboarding_task
-- ============================================================
CREATE TABLE x_ffn_offboarding_task (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  placement_id     UUID NOT NULL REFERENCES x_ffn_placement(id) ON DELETE CASCADE,
  task_name        TEXT NOT NULL,
  task_description TEXT,
  task_type        TEXT NOT NULL CHECK (task_type IN (
                     'equipment_return', 'access_revocation', 'final_invoice',
                     'exit_survey', 'compliance', 'custom'
                   )),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN (
                       'pending', 'in_progress', 'completed', 'waived', 'not_applicable'
                     )),
  due_date         DATE,
  completed_at     TIMESTAMPTZ,
  completed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offboarding_task_placement ON x_ffn_offboarding_task (placement_id);
CREATE INDEX idx_offboarding_task_tenant    ON x_ffn_offboarding_task (tenant_id);

-- ============================================================
-- 30. x_ffn_timesheet
-- ============================================================
CREATE TABLE x_ffn_timesheet (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  placement_id     UUID NOT NULL REFERENCES x_ffn_placement(id),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  hours_regular    NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (hours_regular >= 0),
  hours_overtime   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (hours_overtime >= 0),
  hours_total      NUMERIC(6,2) GENERATED ALWAYS AS (hours_regular + hours_overtime) STORED,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced')),
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (placement_id, period_start, period_end)
);
CREATE INDEX idx_timesheet_placement ON x_ffn_timesheet (placement_id);
CREATE INDEX idx_timesheet_tenant    ON x_ffn_timesheet (tenant_id);
CREATE INDEX idx_timesheet_status    ON x_ffn_timesheet (status);
CREATE INDEX idx_timesheet_period    ON x_ffn_timesheet (period_start);

-- ============================================================
-- 31. x_ffn_invoice
-- ============================================================
CREATE TABLE x_ffn_invoice (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  agency_tenant_id UUID NOT NULL REFERENCES x_ffn_tenant(id),
  placement_id     UUID NOT NULL REFERENCES x_ffn_placement(id),
  number           TEXT NOT NULL UNIQUE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency         CHAR(3) NOT NULL,
  tax_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(15,2) NOT NULL,
  due_date         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'disputed', 'cancelled')),
  sent_at          TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  stripe_invoice_id TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_tenant    ON x_ffn_invoice (tenant_id);
CREATE INDEX idx_invoice_agency    ON x_ffn_invoice (agency_tenant_id);
CREATE INDEX idx_invoice_placement ON x_ffn_invoice (placement_id);
CREATE INDEX idx_invoice_status    ON x_ffn_invoice (status);
CREATE INDEX idx_invoice_due_date  ON x_ffn_invoice (due_date);

-- ============================================================
-- 32. x_ffn_contract_extension
-- ============================================================
CREATE TABLE x_ffn_contract_extension (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  placement_id     UUID NOT NULL REFERENCES x_ffn_placement(id),
  new_end_date     DATE NOT NULL,
  new_bill_rate    NUMERIC(15,2),
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested', 'approved', 'rejected', 'executed')),
  requested_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contract_extension_placement ON x_ffn_contract_extension (placement_id);
CREATE INDEX idx_contract_extension_tenant    ON x_ffn_contract_extension (tenant_id);

-- ============================================================
-- 33. x_ffn_engagement_alert
-- ============================================================
CREATE TABLE x_ffn_engagement_alert (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id           UUID REFERENCES x_ffn_jd(id) ON DELETE SET NULL,
  submission_id   UUID REFERENCES x_ffn_submission(id) ON DELETE SET NULL,
  candidate_id    UUID REFERENCES x_ffn_candidate(id) ON DELETE SET NULL,
  placement_id    UUID REFERENCES x_ffn_placement(id) ON DELETE SET NULL,
  alert_type      TEXT NOT NULL CHECK (alert_type IN (
                    'contract_expiry', 'timesheet_overdue', 'invoice_overdue',
                    'bench_available', 'engagement_risk', 'compliance_expiry', 'other'
                  )),
  severity        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title           TEXT NOT NULL,
  body            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  is_actioned     BOOLEAN NOT NULL DEFAULT FALSE,
  actioned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actioned_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_engagement_alert_tenant      ON x_ffn_engagement_alert (tenant_id);
CREATE INDEX idx_engagement_alert_type        ON x_ffn_engagement_alert (alert_type);
CREATE INDEX idx_engagement_alert_severity    ON x_ffn_engagement_alert (severity);
CREATE INDEX idx_engagement_alert_unread      ON x_ffn_engagement_alert (tenant_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- 34. x_ffn_tenure_summary
-- ============================================================
CREATE TABLE x_ffn_tenure_summary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES x_ffn_tenant(id),
  candidate_id        UUID NOT NULL REFERENCES x_ffn_candidate(id),
  placement_id        UUID NOT NULL REFERENCES x_ffn_placement(id),
  total_days          INTEGER NOT NULL DEFAULT 0,
  total_hours         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_invoiced      NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL,
  performance_rating  NUMERIC(3,1) CHECK (performance_rating BETWEEN 1 AND 5),
  rehire_eligible     BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenure_summary_candidate ON x_ffn_tenure_summary (candidate_id);
CREATE INDEX idx_tenure_summary_placement ON x_ffn_tenure_summary (placement_id);
CREATE INDEX idx_tenure_summary_tenant    ON x_ffn_tenure_summary (tenant_id);

-- ============================================================
-- 35. x_ffn_conclusion_summary
-- ============================================================
CREATE TABLE x_ffn_conclusion_summary (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES x_ffn_tenant(id),
  placement_id      UUID NOT NULL REFERENCES x_ffn_placement(id),
  candidate_id      UUID NOT NULL REFERENCES x_ffn_candidate(id),
  conclusion_reason TEXT NOT NULL CHECK (conclusion_reason IN (
                      'natural_end', 'extension', 'early_termination_client',
                      'early_termination_candidate', 'conversion_to_perm', 'other'
                    )),
  client_feedback   TEXT,
  candidate_feedback TEXT,
  nps_score_client  INTEGER CHECK (nps_score_client BETWEEN 0 AND 10),
  nps_score_candidate INTEGER CHECK (nps_score_candidate BETWEEN 0 AND 10),
  concluded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conclusion_placement ON x_ffn_conclusion_summary (placement_id);
CREATE INDEX idx_conclusion_candidate ON x_ffn_conclusion_summary (candidate_id);
CREATE INDEX idx_conclusion_tenant    ON x_ffn_conclusion_summary (tenant_id);

-- ============================================================
-- GAP TABLE G-01: x_ffn_vms_inbox
-- Stores raw inbound VMS emails for audit + reprocessing
-- FRD: VMS Rail workflow (Sprint 3)
-- ============================================================
CREATE TABLE x_ffn_vms_inbox (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES x_ffn_tenant(id),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  sender_email          TEXT NOT NULL,
  sender_domain         TEXT NOT NULL,
  subject               TEXT NOT NULL,
  raw_body              TEXT NOT NULL,
  raw_headers           JSONB,
  mailgun_message_id    TEXT UNIQUE,
  parse_status          TEXT NOT NULL DEFAULT 'pending'
                          CHECK (parse_status IN (
                            'pending', 'parsing', 'parsed', 'failed', 'skipped'
                          )),
  parse_confidence      NUMERIC(5,2),
  parse_error           TEXT,
  parsed_jd_id          UUID REFERENCES x_ffn_jd(id) ON DELETE SET NULL,
  parsed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Append-only: no updated_at
);
CREATE INDEX idx_vms_inbox_tenant     ON x_ffn_vms_inbox (tenant_id);
CREATE INDEX idx_vms_inbox_status     ON x_ffn_vms_inbox (parse_status);
CREATE INDEX idx_vms_inbox_received   ON x_ffn_vms_inbox (received_at DESC);
CREATE INDEX idx_vms_inbox_mailgun_id ON x_ffn_vms_inbox (mailgun_message_id);

-- ============================================================
-- GAP TABLE G-02: x_ffn_headcount_approval
-- FRD: Stage 0 Workforce Planning
-- ============================================================
CREATE TABLE x_ffn_headcount_approval (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES x_ffn_tenant(id),
  jd_id            UUID NOT NULL REFERENCES x_ffn_jd(id) ON DELETE CASCADE,
  requested_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  headcount_count  INTEGER NOT NULL DEFAULT 1 CHECK (headcount_count > 0),
  budget_amount    NUMERIC(15,2),
  currency         CHAR(3),
  justification    TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at       TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_headcount_approval_jd     ON x_ffn_headcount_approval (jd_id);
CREATE INDEX idx_headcount_approval_tenant ON x_ffn_headcount_approval (tenant_id);
CREATE INDEX idx_headcount_approval_status ON x_ffn_headcount_approval (status);
