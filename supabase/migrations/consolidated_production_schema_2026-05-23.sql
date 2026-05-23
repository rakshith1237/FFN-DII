-- FFN Production Schema Export
-- Generated: 2026-05-23T15:42:22.720Z
-- Project: mnrwchtpethrbfdivkaa
-- Tables: 52

SET statement_timeout = 0;
SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS public.x_ffn_agency_factor_override (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  factor_code text NOT NULL,
  factor_group text NOT NULL,
  weight numeric NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_api_keys (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  key_hash text NOT NULL,
  name text NOT NULL,
  scopes ARRAY DEFAULT ARRAY['read'::text] NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  rate_limit_rpm integer DEFAULT 100 NOT NULL,
  last_used_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_approved_headcount (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  budget_request_id uuid,
  role text NOT NULL,
  headcount_count integer DEFAULT 1 NOT NULL,
  filled_count integer DEFAULT 0 NOT NULL,
  department text,
  business_unit text,
  required_skills jsonb,
  budget_approved numeric,
  currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
  target_start_date date,
  approved_by uuid,
  approved_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  actor_id uuid,
  persona_code text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_bench_index (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  skill_text text NOT NULL,
  embedding_model text DEFAULT 'text-embedding-ada-002'::text NOT NULL,
  embedded_at timestamp with time zone,
  is_current boolean DEFAULT true NOT NULL,
  bench_available_from date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  skill_vector USER-DEFINED,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_budget_request (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  role text NOT NULL,
  headcount_count integer DEFAULT 1 NOT NULL,
  department text,
  business_unit text,
  justification text NOT NULL,
  required_skills jsonb,
  budget_amount numeric,
  currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
  target_start_date date,
  status text DEFAULT 'draft'::text NOT NULL,
  submitted_by uuid,
  submitted_at timestamp with time zone,
  current_approver_level integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_business_domain (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_candidate (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  location_city text,
  location_country character(2),
  linkedin_url text,
  resume_storage_path text,
  resume_parsed_at timestamp with time zone,
  years_experience integer,
  current_employer text,
  current_title text,
  availability_date date,
  rate_expectation_min numeric,
  rate_expectation_max numeric,
  rate_model text,
  currency character(3) DEFAULT 'USD'::bpchar,
  ir35_status text,
  work_authorization text,
  bench_status text DEFAULT 'not_on_bench'::text NOT NULL,
  bench_available_from date,
  status text DEFAULT 'active'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_candidate_cert (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  cert_name text NOT NULL,
  cert_issuer text,
  cert_id text,
  issued_date date,
  expiry_date date,
  credly_badge_id text,
  verification_status text DEFAULT 'self_attested'::text NOT NULL,
  verification_checked_at timestamp with time zone,
  cert_storage_path text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_candidate_experience (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  employer text NOT NULL,
  role text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_candidate_skill (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  proficiency text DEFAULT 'intermediate'::text NOT NULL,
  years numeric,
  is_primary boolean DEFAULT false NOT NULL,
  source text DEFAULT 'manual'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_conclusion_summary (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  conclusion_reason text NOT NULL,
  client_feedback text,
  candidate_feedback text,
  nps_score_client integer,
  nps_score_candidate integer,
  concluded_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  agency_tenant_id uuid,
  conclusion_type text,
  conclusion_date date,
  total_days_active integer DEFAULT 0 NOT NULL,
  total_hours_worked numeric DEFAULT 0 NOT NULL,
  total_invoiced numeric DEFAULT 0 NOT NULL,
  total_paid numeric DEFAULT 0 NOT NULL,
  pending_amount numeric DEFAULT 0 NOT NULL,
  offboarding_tasks_total integer DEFAULT 0 NOT NULL,
  offboarding_tasks_complete integer DEFAULT 0 NOT NULL,
  tenure_total_days integer DEFAULT 0 NOT NULL,
  rehire_eligible boolean,
  rehire_notes text,
  re_bench_triggered boolean DEFAULT false NOT NULL,
  re_bench_triggered_at timestamp with time zone,
  performance_rating text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_contract_extension (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  new_end_date date NOT NULL,
  new_bill_rate numeric,
  reason text,
  status text DEFAULT 'requested'::text NOT NULL,
  requested_by uuid,
  approved_by uuid,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_engagement_alert (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid,
  submission_id uuid,
  candidate_id uuid,
  placement_id uuid,
  alert_type text NOT NULL,
  severity text DEFAULT 'medium'::text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false NOT NULL,
  is_actioned boolean DEFAULT false NOT NULL,
  actioned_by uuid,
  actioned_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_functional_domain (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_headcount_approval (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  approved_by uuid,
  headcount_count integer DEFAULT 1 NOT NULL,
  budget_amount numeric,
  currency character(3),
  justification text,
  status text DEFAULT 'pending'::text NOT NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  decided_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_interview (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  interview_format text,
  panelists jsonb,
  panelists_total_count integer DEFAULT 0 NOT NULL,
  panelists_submitted_count integer DEFAULT 0 NOT NULL,
  composite_interview_score numeric,
  score_computed_at timestamp with time zone,
  offer_recommendation text,
  anonymous_panel_mode boolean DEFAULT false NOT NULL,
  scorecard_deadline timestamp with time zone,
  status text DEFAULT 'scheduled'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  duration_minutes integer,
  meeting_url text,
  meeting_platform text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_interview_score (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  interview_id uuid NOT NULL,
  panelist_id uuid NOT NULL,
  scores jsonb NOT NULL,
  notes text,
  recommendation text,
  is_submitted boolean DEFAULT false NOT NULL,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_invoice (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  number text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL,
  currency character(3) NOT NULL,
  tax_amount numeric DEFAULT 0 NOT NULL,
  total_amount numeric NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,
  stripe_invoice_id text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_ir35_sds (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  determination text DEFAULT 'undetermined'::text NOT NULL,
  determination_score integer DEFAULT 0 NOT NULL,
  pdf_storage_path text,
  submitted_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_jd (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  number text NOT NULL,
  title text NOT NULL,
  functional_domain_id uuid,
  business_domain_id uuid,
  rtr_template_id uuid,
  hm_id uuid NOT NULL,
  recruiter_id uuid,
  description text,
  requirements text,
  location_city text,
  location_country character(2),
  location_type text DEFAULT 'onsite'::text NOT NULL,
  employment_type text DEFAULT 'contract'::text NOT NULL,
  currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
  bill_rate_min numeric,
  bill_rate_max numeric,
  rate_model text DEFAULT 'hourly'::text NOT NULL,
  headcount integer DEFAULT 1 NOT NULL,
  target_start_date date,
  vms_ref text,
  vms_source text,
  intellimatch_threshold integer DEFAULT 70 NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  published_at timestamp with time zone,
  closed_at timestamp with time zone,
  parsed_from_vms_inbox_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_jd_assignment (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  assigned_by_id uuid NOT NULL,
  submission_quota integer NOT NULL,
  submissions_used integer DEFAULT 0 NOT NULL,
  target_submission_date date NOT NULL,
  notes text,
  status text DEFAULT 'active'::text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_jd_broadcast (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  broadcast_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  status text DEFAULT 'active'::text NOT NULL,
  message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  sla_deadline timestamp with time zone,
  sla_breached boolean DEFAULT false NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_jd_factor_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  factor_code text NOT NULL,
  weight numeric NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_jd_geo_rule (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  rule_type text NOT NULL,
  geo_scope text NOT NULL,
  geo_value text NOT NULL,
  reason text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_jd_interview_criterion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  criterion_text text NOT NULL,
  weight numeric DEFAULT 1.0 NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_job_description (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  title text DEFAULT ''::text NOT NULL,
  source text DEFAULT 'Manual'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  vms_inbox_id uuid,
  jd_canonical_id uuid,
  requisition_id text,
  dept_code text,
  engagement_type text,
  currency text,
  rate_model text,
  bill_rate numeric,
  start_date date,
  end_date date,
  location_city text,
  location_state text,
  location_country text,
  work_type text,
  skills text,
  skills_json jsonb,
  certifications text,
  intellimatch_threshold integer DEFAULT 75 NOT NULL,
  screening_required boolean DEFAULT false NOT NULL,
  geo_rules jsonb,
  assigned_hm_id uuid,
  assigned_recruiter_id uuid,
  description_html text,
  scoring_criteria jsonb,
  inclusive_scan_passed boolean DEFAULT false NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_market_rate (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  role text NOT NULL,
  location text NOT NULL,
  rate_min numeric NOT NULL,
  rate_p50 numeric NOT NULL,
  rate_p75 numeric NOT NULL,
  rate_max numeric NOT NULL,
  rate_model text DEFAULT 'daily'::text NOT NULL,
  currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
  source text DEFAULT 'internal'::text NOT NULL,
  sample_size integer DEFAULT 0 NOT NULL,
  effective_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_notification (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  read boolean DEFAULT false NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_offboarding_task (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  task_name text NOT NULL,
  task_description text,
  task_type text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  due_date date,
  completed_at timestamp with time zone,
  completed_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_offer (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  bill_rate numeric NOT NULL,
  currency character(3) NOT NULL,
  rate_model text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  payment_terms text DEFAULT 'net_30'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  latest_counter_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_offer_approval (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  offer_id uuid NOT NULL,
  approver_id uuid NOT NULL,
  level integer NOT NULL,
  decision text NOT NULL,
  notes text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_offer_approval_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  level integer NOT NULL,
  approver_persona text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_offer_counter (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  original_offer_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  proposed_bill_rate numeric NOT NULL,
  proposed_start_date date,
  proposed_end_date date,
  currency character(3) DEFAULT 'GBP'::bpchar NOT NULL,
  counter_notes text,
  status text DEFAULT 'pending'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_onboarding_document (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  task_id uuid NOT NULL,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  original_name text,
  expiry_date date,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_onboarding_task (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  task_name text NOT NULL,
  task_description text,
  task_type text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  blocks_start boolean DEFAULT false NOT NULL,
  due_date date,
  completed_at timestamp with time zone,
  completed_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_override_request (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  number text NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  requesting_hm_role text DEFAULT 'Partner Hiring Manager'::text NOT NULL,
  reason_code text NOT NULL,
  justification text NOT NULL,
  score_at_request numeric NOT NULL,
  threshold_at_request integer NOT NULL,
  score_gap numeric NOT NULL,
  status text DEFAULT 'requested'::text NOT NULL,
  approver_arm_role text,
  approver_agency_tenant_id uuid,
  approval_date timestamp with time zone,
  rejection_date timestamp with time zone,
  rejection_reason_code text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_placement (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  offer_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  bill_rate numeric NOT NULL,
  currency character(3) NOT NULL,
  rate_model text NOT NULL,
  payment_terms text NOT NULL,
  ir35_status text,
  status text DEFAULT 'active'::text NOT NULL,
  ended_at timestamp with time zone,
  end_reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  conclusion_type text,
  concluded_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_rtr (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  number text NOT NULL,
  jd_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  template_id uuid,
  recruiter_id uuid NOT NULL,
  arm_id uuid,
  docusign_envelope_id text,
  docusign_status text,
  signed_at timestamp with time zone,
  voided_at timestamp with time zone,
  void_reason text,
  expires_at timestamp with time zone,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_rtr_template (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  body_html text NOT NULL,
  body_plain text NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_score_audit (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  intellimatch_score numeric NOT NULL,
  technical_fit_score numeric NOT NULL,
  auxiliary_fit_score numeric NOT NULL,
  factor_scores jsonb NOT NULL,
  bench_vector_snapshot jsonb,
  model_version text NOT NULL,
  scored_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_setting (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  user_id uuid,
  tier integer NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  data_type text DEFAULT 'string'::text NOT NULL,
  description text,
  is_sensitive boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_skill_taxonomy (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  parent_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_sso_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  idp_metadata_xml text NOT NULL,
  attribute_persona_key text DEFAULT 'groups'::text NOT NULL,
  attribute_email_key text DEFAULT 'email'::text NOT NULL,
  attribute_name_key text DEFAULT 'displayName'::text NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  configured_at timestamp with time zone DEFAULT now() NOT NULL,
  activated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_submission (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  jd_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  rtr_id uuid NOT NULL,
  agency_tenant_id uuid NOT NULL,
  partner_tenant_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  cover_note character varying(500),
  intellimatch_score numeric,
  technical_fit_score numeric,
  auxiliary_fit_score numeric,
  score_factor_snapshot jsonb,
  scored_at timestamp with time zone,
  geo_routing_result text,
  status text DEFAULT 'received'::text NOT NULL,
  disposition_outcome text,
  disposition_notes text,
  dispositioned_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  score_explanation text,
  override_approved boolean DEFAULT false NOT NULL,
  override_request_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_tenant (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  subscription_plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  primary_contact_email text,
  primary_contact_name text,
  logo_storage_path text,
  timezone text DEFAULT 'UTC'::text NOT NULL,
  max_users integer DEFAULT 50 NOT NULL,
  storage_quota_mb integer DEFAULT 10240 NOT NULL,
  suspended_at timestamp with time zone,
  suspension_reason text,
  deactivated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  subscription_status text DEFAULT 'trialing'::text NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_tenure_summary (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  total_days integer DEFAULT 0 NOT NULL,
  total_hours numeric DEFAULT 0 NOT NULL,
  total_invoiced numeric DEFAULT 0 NOT NULL,
  currency character(3) NOT NULL,
  performance_rating numeric,
  rehire_eligible boolean DEFAULT true NOT NULL,
  notes text,
  computed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_tier_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  tier_number integer NOT NULL,
  agency_tenant_id uuid NOT NULL,
  hold_window_hours integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_timesheet (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours_regular numeric DEFAULT 0 NOT NULL,
  hours_overtime numeric DEFAULT 0 NOT NULL,
  hours_total numeric,
  status text DEFAULT 'draft'::text NOT NULL,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  hours_mon numeric DEFAULT 0 NOT NULL,
  hours_tue numeric DEFAULT 0 NOT NULL,
  hours_wed numeric DEFAULT 0 NOT NULL,
  hours_thu numeric DEFAULT 0 NOT NULL,
  hours_fri numeric DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_user_profile (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid,
  persona_code text NOT NULL,
  full_name text,
  email text,
  is_active boolean DEFAULT true NOT NULL,
  invited_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  gdpr_erasure_requested_at timestamp with time zone,
  gdpr_erasure_completed_at timestamp with time zone,
  gdpr_export_last_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_vms_domain_map (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  vms_domain_raw text NOT NULL,
  functional_domain_id uuid,
  business_domain_id uuid,
  confidence numeric,
  mapped_by text DEFAULT 'ai'::text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.x_ffn_vms_inbox (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  received_at timestamp with time zone DEFAULT now() NOT NULL,
  sender_email text NOT NULL,
  sender_domain text NOT NULL,
  subject text NOT NULL,
  raw_body text NOT NULL,
  raw_headers jsonb,
  mailgun_message_id text,
  parse_status text DEFAULT 'pending'::text NOT NULL,
  parse_confidence numeric,
  parse_error text,
  parsed_jd_id uuid,
  parsed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  extracted_data jsonb,
  confidence_map jsonb,
  vms_mode text,
  cws_requisition_id text,
  PRIMARY KEY (id)
);

-- End of schema export
-- Table count: 52
