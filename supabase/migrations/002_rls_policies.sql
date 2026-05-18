-- ============================================================
-- FFN Migration 002: RLS Policies + updated_at Triggers
-- FRD: Section 115.3 | ADR-EXT-002 | 06_FFN_Data_Model.md
-- PREREQUISITE: 000_helpers_extensions.sql + 001_core_tables.sql
-- ============================================================

-- ============================================================
-- 01. x_ffn_tenant
-- ============================================================
ALTER TABLE x_ffn_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_tenant FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON x_ffn_tenant FOR SELECT TO authenticated
  USING (is_flex_admin() OR id = get_tenant_id());

CREATE POLICY "tenant_insert" ON x_ffn_tenant FOR INSERT TO authenticated
  WITH CHECK (is_flex_admin());

CREATE POLICY "tenant_update" ON x_ffn_tenant FOR UPDATE TO authenticated
  USING (is_flex_admin() OR (id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'a_super_admin')))
  WITH CHECK (is_flex_admin() OR (id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'a_super_admin')));

CREATE POLICY "tenant_delete" ON x_ffn_tenant FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_tenant_updated_at
  BEFORE UPDATE ON x_ffn_tenant FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 02. x_ffn_setting
-- ============================================================
ALTER TABLE x_ffn_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_setting FORCE ROW LEVEL SECURITY;

CREATE POLICY "setting_select" ON x_ffn_setting FOR SELECT TO authenticated
  USING (
    is_flex_admin()
    OR (tier = 3)
    OR (tier = 2 AND tenant_id = get_tenant_id())
    OR (tier = 1 AND user_id = auth.uid())
  );

CREATE POLICY "setting_insert" ON x_ffn_setting FOR INSERT TO authenticated
  WITH CHECK (
    (tier = 3 AND is_flex_admin())
    OR (tier = 2 AND tenant_id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'a_super_admin'))
    OR (tier = 1 AND user_id = auth.uid())
  );

CREATE POLICY "setting_update" ON x_ffn_setting FOR UPDATE TO authenticated
  USING (
    (tier = 3 AND is_flex_admin())
    OR (tier = 2 AND tenant_id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'a_super_admin'))
    OR (tier = 1 AND user_id = auth.uid())
  )
  WITH CHECK (
    (tier = 3 AND is_flex_admin())
    OR (tier = 2 AND tenant_id = get_tenant_id())
    OR (tier = 1 AND user_id = auth.uid())
  );

CREATE POLICY "setting_delete" ON x_ffn_setting FOR DELETE TO authenticated
  USING (is_flex_admin() OR (tier = 1 AND user_id = auth.uid()));

CREATE TRIGGER trg_setting_updated_at
  BEFORE UPDATE ON x_ffn_setting FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 03. x_ffn_audit_log — APPEND-ONLY
-- ============================================================
ALTER TABLE x_ffn_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select" ON x_ffn_audit_log FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());

CREATE POLICY "audit_log_insert" ON x_ffn_audit_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());

CREATE POLICY "audit_log_update" ON x_ffn_audit_log FOR UPDATE TO authenticated USING (FALSE);

-- Layer 2 of 2: RLS DELETE block (Layer 1 is BEFORE DELETE trigger in 003_append_only_triggers.sql)
CREATE POLICY "audit_log_delete" ON x_ffn_audit_log FOR DELETE TO authenticated USING (FALSE);

-- ============================================================
-- 04. x_ffn_skill_taxonomy — Platform-level
-- ============================================================
ALTER TABLE x_ffn_skill_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_skill_taxonomy FORCE ROW LEVEL SECURITY;

CREATE POLICY "skill_taxonomy_select" ON x_ffn_skill_taxonomy FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "skill_taxonomy_insert" ON x_ffn_skill_taxonomy FOR INSERT TO authenticated WITH CHECK (is_flex_admin());
CREATE POLICY "skill_taxonomy_update" ON x_ffn_skill_taxonomy FOR UPDATE TO authenticated USING (is_flex_admin()) WITH CHECK (is_flex_admin());
CREATE POLICY "skill_taxonomy_delete" ON x_ffn_skill_taxonomy FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_skill_taxonomy_updated_at
  BEFORE UPDATE ON x_ffn_skill_taxonomy FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 05. x_ffn_functional_domain — Platform-level
-- ============================================================
ALTER TABLE x_ffn_functional_domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_functional_domain FORCE ROW LEVEL SECURITY;

CREATE POLICY "functional_domain_select" ON x_ffn_functional_domain FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "functional_domain_insert" ON x_ffn_functional_domain FOR INSERT TO authenticated WITH CHECK (is_flex_admin());
CREATE POLICY "functional_domain_update" ON x_ffn_functional_domain FOR UPDATE TO authenticated USING (is_flex_admin()) WITH CHECK (is_flex_admin());
CREATE POLICY "functional_domain_delete" ON x_ffn_functional_domain FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_functional_domain_updated_at
  BEFORE UPDATE ON x_ffn_functional_domain FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 06. x_ffn_business_domain — Platform-level
-- ============================================================
ALTER TABLE x_ffn_business_domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_business_domain FORCE ROW LEVEL SECURITY;

CREATE POLICY "business_domain_select" ON x_ffn_business_domain FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "business_domain_insert" ON x_ffn_business_domain FOR INSERT TO authenticated WITH CHECK (is_flex_admin());
CREATE POLICY "business_domain_update" ON x_ffn_business_domain FOR UPDATE TO authenticated USING (is_flex_admin()) WITH CHECK (is_flex_admin());
CREATE POLICY "business_domain_delete" ON x_ffn_business_domain FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_business_domain_updated_at
  BEFORE UPDATE ON x_ffn_business_domain FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 07. x_ffn_vms_domain_map
-- ============================================================
ALTER TABLE x_ffn_vms_domain_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_vms_domain_map FORCE ROW LEVEL SECURITY;

CREATE POLICY "vms_domain_map_select" ON x_ffn_vms_domain_map FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "vms_domain_map_insert" ON x_ffn_vms_domain_map FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'flex_admin'));
CREATE POLICY "vms_domain_map_update" ON x_ffn_vms_domain_map FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "vms_domain_map_delete" ON x_ffn_vms_domain_map FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_vms_domain_map_updated_at
  BEFORE UPDATE ON x_ffn_vms_domain_map FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 08. x_ffn_rtr_template
-- ============================================================
ALTER TABLE x_ffn_rtr_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_rtr_template FORCE ROW LEVEL SECURITY;

CREATE POLICY "rtr_template_select" ON x_ffn_rtr_template FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "rtr_template_insert" ON x_ffn_rtr_template FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('a_super_admin', 'a_recruiting_manager', 'flex_admin'));
CREATE POLICY "rtr_template_update" ON x_ffn_rtr_template FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "rtr_template_delete" ON x_ffn_rtr_template FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_rtr_template_updated_at
  BEFORE UPDATE ON x_ffn_rtr_template FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 09. x_ffn_jd
-- ============================================================
ALTER TABLE x_ffn_jd ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_jd FORCE ROW LEVEL SECURITY;

CREATE POLICY "jd_select" ON x_ffn_jd FOR SELECT TO authenticated
  USING (
    is_flex_admin()
    OR tenant_id = get_tenant_id()
    OR EXISTS (
      SELECT 1 FROM x_ffn_jd_broadcast b
      WHERE b.jd_id = x_ffn_jd.id AND b.agency_tenant_id = get_tenant_id()
    )
  );
CREATE POLICY "jd_insert" ON x_ffn_jd FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_recruiter', 'p_super_admin'));
CREATE POLICY "jd_update" ON x_ffn_jd FOR UPDATE TO authenticated
  USING (is_flex_admin() OR (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_recruiter', 'p_super_admin')))
  WITH CHECK (is_flex_admin() OR (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_recruiter', 'p_super_admin')));
CREATE POLICY "jd_delete" ON x_ffn_jd FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_jd_updated_at
  BEFORE UPDATE ON x_ffn_jd FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 10. x_ffn_jd_factor_config
-- ============================================================
ALTER TABLE x_ffn_jd_factor_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_jd_factor_config FORCE ROW LEVEL SECURITY;

CREATE POLICY "jd_factor_config_select" ON x_ffn_jd_factor_config FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "jd_factor_config_insert" ON x_ffn_jd_factor_config FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'p_hiring_manager', 'flex_admin'));
CREATE POLICY "jd_factor_config_update" ON x_ffn_jd_factor_config FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "jd_factor_config_delete" ON x_ffn_jd_factor_config FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_jd_factor_config_updated_at
  BEFORE UPDATE ON x_ffn_jd_factor_config FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 11. x_ffn_jd_factor_scenario
-- ============================================================
ALTER TABLE x_ffn_jd_factor_scenario ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_jd_factor_scenario FORCE ROW LEVEL SECURITY;

CREATE POLICY "jd_factor_scenario_select" ON x_ffn_jd_factor_scenario FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "jd_factor_scenario_insert" ON x_ffn_jd_factor_scenario FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "jd_factor_scenario_update" ON x_ffn_jd_factor_scenario FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "jd_factor_scenario_delete" ON x_ffn_jd_factor_scenario FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_jd_factor_scenario_updated_at
  BEFORE UPDATE ON x_ffn_jd_factor_scenario FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 12. x_ffn_jd_interview_criterion
-- ============================================================
ALTER TABLE x_ffn_jd_interview_criterion ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_jd_interview_criterion FORCE ROW LEVEL SECURITY;

CREATE POLICY "jd_interview_criterion_select" ON x_ffn_jd_interview_criterion FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "jd_interview_criterion_insert" ON x_ffn_jd_interview_criterion FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "jd_interview_criterion_update" ON x_ffn_jd_interview_criterion FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "jd_interview_criterion_delete" ON x_ffn_jd_interview_criterion FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_jd_interview_criterion_updated_at
  BEFORE UPDATE ON x_ffn_jd_interview_criterion FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 13. x_ffn_jd_broadcast
-- ============================================================
ALTER TABLE x_ffn_jd_broadcast ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_jd_broadcast FORCE ROW LEVEL SECURITY;

CREATE POLICY "jd_broadcast_select" ON x_ffn_jd_broadcast FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "jd_broadcast_insert" ON x_ffn_jd_broadcast FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'p_recruiter', 'p_hiring_manager'));
CREATE POLICY "jd_broadcast_update" ON x_ffn_jd_broadcast FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "jd_broadcast_delete" ON x_ffn_jd_broadcast FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_jd_broadcast_updated_at
  BEFORE UPDATE ON x_ffn_jd_broadcast FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 14. x_ffn_candidate
-- ============================================================
ALTER TABLE x_ffn_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_candidate FORCE ROW LEVEL SECURITY;

CREATE POLICY "candidate_select" ON x_ffn_candidate FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "candidate_insert" ON x_ffn_candidate FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('a_recruiter', 'a_recruiting_manager', 'a_super_admin', 'flex_admin'));
CREATE POLICY "candidate_update" ON x_ffn_candidate FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "candidate_delete" ON x_ffn_candidate FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_candidate_updated_at
  BEFORE UPDATE ON x_ffn_candidate FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 15. x_ffn_candidate_skill
-- ============================================================
ALTER TABLE x_ffn_candidate_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_candidate_skill FORCE ROW LEVEL SECURITY;

CREATE POLICY "candidate_skill_select" ON x_ffn_candidate_skill FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "candidate_skill_insert" ON x_ffn_candidate_skill FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "candidate_skill_update" ON x_ffn_candidate_skill FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "candidate_skill_delete" ON x_ffn_candidate_skill FOR DELETE TO authenticated
  USING (tenant_id = get_tenant_id() AND get_persona_code() IN ('a_recruiter', 'a_recruiting_manager', 'a_super_admin'));

CREATE TRIGGER trg_candidate_skill_updated_at
  BEFORE UPDATE ON x_ffn_candidate_skill FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 16. x_ffn_candidate_cert
-- ============================================================
ALTER TABLE x_ffn_candidate_cert ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_candidate_cert FORCE ROW LEVEL SECURITY;

CREATE POLICY "candidate_cert_select" ON x_ffn_candidate_cert FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "candidate_cert_insert" ON x_ffn_candidate_cert FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "candidate_cert_update" ON x_ffn_candidate_cert FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "candidate_cert_delete" ON x_ffn_candidate_cert FOR DELETE TO authenticated
  USING (tenant_id = get_tenant_id() AND get_persona_code() IN ('a_recruiter', 'a_recruiting_manager', 'a_super_admin'));

CREATE TRIGGER trg_candidate_cert_updated_at
  BEFORE UPDATE ON x_ffn_candidate_cert FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 17. x_ffn_bench_index
-- ============================================================
ALTER TABLE x_ffn_bench_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_bench_index FORCE ROW LEVEL SECURITY;

CREATE POLICY "bench_index_select" ON x_ffn_bench_index FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "bench_index_insert" ON x_ffn_bench_index FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "bench_index_update" ON x_ffn_bench_index FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "bench_index_delete" ON x_ffn_bench_index FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_bench_index_updated_at
  BEFORE UPDATE ON x_ffn_bench_index FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 18. x_ffn_rtr
-- ============================================================
ALTER TABLE x_ffn_rtr ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_rtr FORCE ROW LEVEL SECURITY;

CREATE POLICY "rtr_select" ON x_ffn_rtr FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "rtr_insert" ON x_ffn_rtr FOR INSERT TO authenticated
  WITH CHECK (agency_tenant_id = get_tenant_id() AND get_persona_code() IN ('a_recruiter', 'a_recruiting_manager', 'a_super_admin'));
CREATE POLICY "rtr_update" ON x_ffn_rtr FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id())
  WITH CHECK (agency_tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "rtr_delete" ON x_ffn_rtr FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_rtr_updated_at
  BEFORE UPDATE ON x_ffn_rtr FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 19. x_ffn_submission
-- ============================================================
ALTER TABLE x_ffn_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_submission FORCE ROW LEVEL SECURITY;

CREATE POLICY "submission_select" ON x_ffn_submission FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "submission_insert" ON x_ffn_submission FOR INSERT TO authenticated
  WITH CHECK (agency_tenant_id = get_tenant_id() AND get_persona_code() IN ('a_recruiter', 'a_recruiting_manager', 'a_super_admin'));
CREATE POLICY "submission_update" ON x_ffn_submission FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id())
  WITH CHECK (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "submission_delete" ON x_ffn_submission FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_submission_updated_at
  BEFORE UPDATE ON x_ffn_submission FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 20. x_ffn_override_request — APPEND-ONLY (Layer 2 of 2)
-- ============================================================
ALTER TABLE x_ffn_override_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_override_request FORCE ROW LEVEL SECURITY;

CREATE POLICY "override_request_select" ON x_ffn_override_request FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "override_request_insert" ON x_ffn_override_request FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_super_admin'));
-- Only status field is ever updated (frozen fields enforced at app layer)
CREATE POLICY "override_request_update" ON x_ffn_override_request FOR UPDATE TO authenticated
  USING (is_flex_admin() OR agency_tenant_id = get_tenant_id())
  WITH CHECK (is_flex_admin() OR agency_tenant_id = get_tenant_id());
-- Layer 2: RLS DELETE block
CREATE POLICY "override_request_delete" ON x_ffn_override_request FOR DELETE TO authenticated USING (FALSE);

-- ============================================================
-- 21. x_ffn_score_audit — APPEND-ONLY (Layer 2 of 2)
-- ============================================================
ALTER TABLE x_ffn_score_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_score_audit FORCE ROW LEVEL SECURITY;

CREATE POLICY "score_audit_select" ON x_ffn_score_audit FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "score_audit_insert" ON x_ffn_score_audit FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "score_audit_update" ON x_ffn_score_audit FOR UPDATE TO authenticated USING (FALSE);
-- Layer 2: RLS DELETE block
CREATE POLICY "score_audit_delete" ON x_ffn_score_audit FOR DELETE TO authenticated USING (FALSE);

-- ============================================================
-- 22. x_ffn_interview
-- ============================================================
ALTER TABLE x_ffn_interview ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_interview FORCE ROW LEVEL SECURITY;

CREATE POLICY "interview_select" ON x_ffn_interview FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "interview_insert" ON x_ffn_interview FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_recruiter', 'p_super_admin'));
CREATE POLICY "interview_update" ON x_ffn_interview FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "interview_delete" ON x_ffn_interview FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_interview_updated_at
  BEFORE UPDATE ON x_ffn_interview FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 23. x_ffn_interview_score
-- ============================================================
ALTER TABLE x_ffn_interview_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_interview_score FORCE ROW LEVEL SECURITY;

CREATE POLICY "interview_score_select" ON x_ffn_interview_score FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR panelist_id = auth.uid());
CREATE POLICY "interview_score_insert" ON x_ffn_interview_score FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND panelist_id = auth.uid());
CREATE POLICY "interview_score_update" ON x_ffn_interview_score FOR UPDATE TO authenticated
  USING ((panelist_id = auth.uid() AND is_submitted = FALSE) OR is_flex_admin())
  WITH CHECK (panelist_id = auth.uid());
CREATE POLICY "interview_score_delete" ON x_ffn_interview_score FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_interview_score_updated_at
  BEFORE UPDATE ON x_ffn_interview_score FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 24. x_ffn_offer
-- ============================================================
ALTER TABLE x_ffn_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_offer FORCE ROW LEVEL SECURITY;

CREATE POLICY "offer_select" ON x_ffn_offer FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "offer_insert" ON x_ffn_offer FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_super_admin'));
CREATE POLICY "offer_update" ON x_ffn_offer FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "offer_delete" ON x_ffn_offer FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_offer_updated_at
  BEFORE UPDATE ON x_ffn_offer FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 25. x_ffn_offer_approval_config
-- ============================================================
ALTER TABLE x_ffn_offer_approval_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_offer_approval_config FORCE ROW LEVEL SECURITY;

CREATE POLICY "offer_approval_config_select" ON x_ffn_offer_approval_config FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "offer_approval_config_insert" ON x_ffn_offer_approval_config FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_super_admin', 'flex_admin'));
CREATE POLICY "offer_approval_config_update" ON x_ffn_offer_approval_config FOR UPDATE TO authenticated
  USING (is_flex_admin() OR (tenant_id = get_tenant_id() AND get_persona_code() = 'p_super_admin'))
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "offer_approval_config_delete" ON x_ffn_offer_approval_config FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_offer_approval_config_updated_at
  BEFORE UPDATE ON x_ffn_offer_approval_config FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 26. x_ffn_offer_approval
-- ============================================================
ALTER TABLE x_ffn_offer_approval ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_offer_approval FORCE ROW LEVEL SECURITY;

CREATE POLICY "offer_approval_select" ON x_ffn_offer_approval FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "offer_approval_insert" ON x_ffn_offer_approval FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "offer_approval_update" ON x_ffn_offer_approval FOR UPDATE TO authenticated
  USING (is_flex_admin() OR (approver_id = auth.uid() AND tenant_id = get_tenant_id()))
  WITH CHECK (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "offer_approval_delete" ON x_ffn_offer_approval FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_offer_approval_updated_at
  BEFORE UPDATE ON x_ffn_offer_approval FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 27. x_ffn_placement
-- ============================================================
ALTER TABLE x_ffn_placement ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_placement FORCE ROW LEVEL SECURITY;

CREATE POLICY "placement_select" ON x_ffn_placement FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "placement_insert" ON x_ffn_placement FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "placement_update" ON x_ffn_placement FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "placement_delete" ON x_ffn_placement FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_placement_updated_at
  BEFORE UPDATE ON x_ffn_placement FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 28. x_ffn_onboarding_task
-- ============================================================
ALTER TABLE x_ffn_onboarding_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_onboarding_task FORCE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_task_select" ON x_ffn_onboarding_task FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "onboarding_task_insert" ON x_ffn_onboarding_task FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "onboarding_task_update" ON x_ffn_onboarding_task FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "onboarding_task_delete" ON x_ffn_onboarding_task FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_onboarding_task_updated_at
  BEFORE UPDATE ON x_ffn_onboarding_task FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 29. x_ffn_offboarding_task
-- ============================================================
ALTER TABLE x_ffn_offboarding_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_offboarding_task FORCE ROW LEVEL SECURITY;

CREATE POLICY "offboarding_task_select" ON x_ffn_offboarding_task FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "offboarding_task_insert" ON x_ffn_offboarding_task FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "offboarding_task_update" ON x_ffn_offboarding_task FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "offboarding_task_delete" ON x_ffn_offboarding_task FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_offboarding_task_updated_at
  BEFORE UPDATE ON x_ffn_offboarding_task FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 30. x_ffn_timesheet
-- ============================================================
ALTER TABLE x_ffn_timesheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_timesheet FORCE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_select" ON x_ffn_timesheet FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "timesheet_insert" ON x_ffn_timesheet FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "timesheet_update" ON x_ffn_timesheet FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "timesheet_delete" ON x_ffn_timesheet FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_timesheet_updated_at
  BEFORE UPDATE ON x_ffn_timesheet FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 31. x_ffn_invoice
-- ============================================================
ALTER TABLE x_ffn_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_invoice FORCE ROW LEVEL SECURITY;

CREATE POLICY "invoice_select" ON x_ffn_invoice FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "invoice_insert" ON x_ffn_invoice FOR INSERT TO authenticated
  WITH CHECK (agency_tenant_id = get_tenant_id() AND get_persona_code() IN ('a_super_admin', 'a_recruiting_manager'));
CREATE POLICY "invoice_update" ON x_ffn_invoice FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id())
  WITH CHECK (is_flex_admin() OR tenant_id = get_tenant_id() OR agency_tenant_id = get_tenant_id());
CREATE POLICY "invoice_delete" ON x_ffn_invoice FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON x_ffn_invoice FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 32. x_ffn_contract_extension
-- ============================================================
ALTER TABLE x_ffn_contract_extension ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_contract_extension FORCE ROW LEVEL SECURITY;

CREATE POLICY "contract_extension_select" ON x_ffn_contract_extension FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "contract_extension_insert" ON x_ffn_contract_extension FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "contract_extension_update" ON x_ffn_contract_extension FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "contract_extension_delete" ON x_ffn_contract_extension FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_contract_extension_updated_at
  BEFORE UPDATE ON x_ffn_contract_extension FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 33. x_ffn_engagement_alert
-- ============================================================
ALTER TABLE x_ffn_engagement_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_engagement_alert FORCE ROW LEVEL SECURITY;

CREATE POLICY "engagement_alert_select" ON x_ffn_engagement_alert FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "engagement_alert_insert" ON x_ffn_engagement_alert FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "engagement_alert_update" ON x_ffn_engagement_alert FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "engagement_alert_delete" ON x_ffn_engagement_alert FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_engagement_alert_updated_at
  BEFORE UPDATE ON x_ffn_engagement_alert FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 34. x_ffn_tenure_summary
-- ============================================================
ALTER TABLE x_ffn_tenure_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_tenure_summary FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenure_summary_select" ON x_ffn_tenure_summary FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "tenure_summary_insert" ON x_ffn_tenure_summary FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "tenure_summary_update" ON x_ffn_tenure_summary FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "tenure_summary_delete" ON x_ffn_tenure_summary FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_tenure_summary_updated_at
  BEFORE UPDATE ON x_ffn_tenure_summary FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 35. x_ffn_conclusion_summary
-- ============================================================
ALTER TABLE x_ffn_conclusion_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_conclusion_summary FORCE ROW LEVEL SECURITY;

CREATE POLICY "conclusion_summary_select" ON x_ffn_conclusion_summary FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "conclusion_summary_insert" ON x_ffn_conclusion_summary FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "conclusion_summary_update" ON x_ffn_conclusion_summary FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "conclusion_summary_delete" ON x_ffn_conclusion_summary FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_conclusion_summary_updated_at
  BEFORE UPDATE ON x_ffn_conclusion_summary FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- GAP TABLE G-01: x_ffn_vms_inbox — APPEND-ONLY
-- ============================================================
ALTER TABLE x_ffn_vms_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_vms_inbox FORCE ROW LEVEL SECURITY;

CREATE POLICY "vms_inbox_select" ON x_ffn_vms_inbox FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "vms_inbox_insert" ON x_ffn_vms_inbox FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "vms_inbox_update" ON x_ffn_vms_inbox FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "vms_inbox_delete" ON x_ffn_vms_inbox FOR DELETE TO authenticated USING (FALSE);

-- ============================================================
-- GAP TABLE G-02: x_ffn_headcount_approval
-- ============================================================
ALTER TABLE x_ffn_headcount_approval ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_ffn_headcount_approval FORCE ROW LEVEL SECURITY;

CREATE POLICY "headcount_approval_select" ON x_ffn_headcount_approval FOR SELECT TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id());
CREATE POLICY "headcount_approval_insert" ON x_ffn_headcount_approval FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_id() AND get_persona_code() IN ('p_hiring_manager', 'p_super_admin', 'flex_admin'));
CREATE POLICY "headcount_approval_update" ON x_ffn_headcount_approval FOR UPDATE TO authenticated
  USING (is_flex_admin() OR tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id() OR is_flex_admin());
CREATE POLICY "headcount_approval_delete" ON x_ffn_headcount_approval FOR DELETE TO authenticated USING (FALSE);

CREATE TRIGGER trg_headcount_approval_updated_at
  BEFORE UPDATE ON x_ffn_headcount_approval FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
