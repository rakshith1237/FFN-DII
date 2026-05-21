'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification } from '@/lib/notifications/fire-notification'

export type SubmitCandidateInput = {
  jdId:        string
  candidateId: string
  rtrId:       string
  coverNote:   string | null
}

export async function submitCandidate(
  input: SubmitCandidateInput
): Promise<{ error: string | null; submissionId: string | null }> {
  const [persona, agencyTenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser()
  ])
  if (!persona || !agencyTenantId || !user) return { error: 'Unauthorized', submissionId: null }
  if (!['a_recruiter','a_recruiting_manager','a_super_admin'].includes(persona)) {
    return { error: 'Forbidden', submissionId: null }
  }

  const db = createAdminClient()

  // Get JD + candidate for geo check
  const [{ data: jd }, { data: candidate }] = await Promise.all([
    db.from('x_ffn_jd').select('tenant_id, intellimatch_threshold').eq('id', input.jdId).single(),
    db.from('x_ffn_candidate').select('location_country, tenant_id').eq('id', input.candidateId).single(),
  ])

  if (!jd)        return { error: 'JD not found', submissionId: null }
  if (!candidate) return { error: 'Candidate not found', submissionId: null }

  // ── Geo-Routing Check (FRD S49.4) ─────────────────────
  const { data: geoRules } = await db
    .from('x_ffn_jd_geo_rule')
    .select('rule_type, geo_scope, geo_value')
    .eq('jd_id', input.jdId)
    .eq('is_active', true)

  let geoRoutingResult: 'passed' | 'soft_warning' | 'hard_block' = 'passed'
  const candidateCountry = candidate.location_country ?? ''

  for (const rule of geoRules ?? []) {
    const matches = rule.geo_scope === 'country' && rule.geo_value === candidateCountry
    if (!matches) continue

    if (rule.rule_type === 'hard_block') {
      return {
        error: "This candidate's location is not eligible for this role.",
        submissionId: null,
      }
    }
    if (rule.rule_type === 'soft_warning') {
      geoRoutingResult = 'soft_warning'
    }
  }
  // ── End Geo Check ──────────────────────────────────────

  const { data: submission, error: insertError } = await db
    .from('x_ffn_submission')
    .insert({
      tenant_id:          jd.tenant_id,
      partner_tenant_id:  jd.tenant_id,
      agency_tenant_id:   agencyTenantId,
      jd_id:              input.jdId,
      candidate_id:       input.candidateId,
      rtr_id:             input.rtrId,
      recruiter_id:       user.id,
      cover_note:         input.coverNote,
      geo_routing_result: geoRoutingResult,
      status:             'received',
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message, submissionId: null }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    jd.tenant_id,
    actor_id:     user.id,
    persona_code: persona,
    action:       'submission.created',
    entity_type:  'x_ffn_submission',
    entity_id:    submission.id,
    new_values: {
      candidate_id: input.candidateId,
      geo_routing_result: geoRoutingResult,
    },
  })

  await fireNotification(
    'SUBMISSION_CREATED',
    String(jd.tenant_id),
    { candidateName: input.candidateId, jdTitle: input.jdId, agencyName: agencyTenantId },
    { extraTenantIds: [agencyTenantId] }
  )

  return { error: null, submissionId: submission.id }
}
