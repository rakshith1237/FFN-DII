'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const resend = new Resend(process.env['RESEND_API_KEY']!)

// reason_code values from DB constraint
export const OVERRIDE_REASON_CODES = [
  'talent_scarcity',
  'exceptional_experience',
  'client_relationship',
  'urgent_business_need',
  'cert_expected',
  'other',
] as const
export type OverrideReasonCode = typeof OVERRIDE_REASON_CODES[number]

export const OVERRIDE_REASON_LABELS: Record<OverrideReasonCode, string> = {
  talent_scarcity:        'Talent Scarcity',
  exceptional_experience: 'Exceptional Experience',
  client_relationship:    'Client Relationship',
  urgent_business_need:   'Urgent Business Need',
  cert_expected:          'Certification Expected',
  other:                  'Other',
}

export type CreateOverrideState = {
  error?:     string
  success?:   boolean
  requestId?: string
  number?:    string
}

function generateOverrideNumber(): string {
  const now = new Date()
  const yr  = now.getFullYear()
  const mo  = String(now.getMonth() + 1).padStart(2, '0')
  const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  return `OVR-${yr}${mo}-${hex}`
}

export async function createOverrideRequest(
  submissionId:  string,
  reasonCode:    OverrideReasonCode,
  justification: string
): Promise<CreateOverrideState> {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (justification.trim().length < 50) {
    return { error: 'Justification must be at least 50 characters.' }
  }

  if (!OVERRIDE_REASON_CODES.includes(reasonCode)) {
    return { error: 'Invalid reason code.' }
  }

  // Fetch submission + JD
  const { data: sub } = await supabaseAdmin
    .from('x_ffn_submission')
    .select('id, jd_id, candidate_id, agency_tenant_id, intellimatch_score, partner_tenant_id')
    .eq('id', submissionId)
    .eq('partner_tenant_id', tenantId)
    .single()

  if (!sub) return { error: 'Submission not found.' }

  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('intellimatch_threshold, title')
    .eq('id', String(sub.jd_id))
    .single()

  if (!jd) return { error: 'Job description not found.' }

  const scoreAtRequest     = Number(sub.intellimatch_score ?? 0)
  const thresholdAtRequest = Number(jd.intellimatch_threshold ?? 75)
  const scoreGap           = thresholdAtRequest - scoreAtRequest

  // FRD §54: override only valid when score < threshold
  if (scoreGap <= 0) {
    return { error: `Score ${scoreAtRequest} meets threshold ${thresholdAtRequest}. Override not required.` }
  }

  const overrideNumber = generateOverrideNumber()

  const { data: overrideReq, error: insertError } = await supabaseAdmin
    .from('x_ffn_override_request')
    .insert({
      number:               overrideNumber,
      tenant_id:            tenantId,
      jd_id:                String(sub.jd_id),
      submission_id:        submissionId,
      candidate_id:         String(sub.candidate_id),
      agency_tenant_id:     String(sub.agency_tenant_id),
      requesting_hm_role:   'p_hiring_manager',
      reason_code:          reasonCode,
      justification:        justification.trim(),
      score_at_request:     scoreAtRequest,
      threshold_at_request: thresholdAtRequest,
      score_gap:            scoreGap,
      status:               'requested',
    })
    .select('id')
    .single()

  if (insertError || !overrideReq) return { error: insertError?.message ?? 'Failed to create override.' }

  // Notify A-RMs of the submitting agency
  const { data: arms } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('email, full_name')
    .eq('tenant_id', String(sub.agency_tenant_id))
    .eq('persona_code', 'a_recruiting_manager')
    .eq('is_active', true)

  const { data: cand } = await supabaseAdmin
    .from('x_ffn_candidate')
    .select('first_name, last_name')
    .eq('id', String(sub.candidate_id))
    .single()

  const candidateName = cand
    ? `${String(cand.first_name)} ${String(cand.last_name)}`
    : 'Candidate'

  if (arms) {
    for (const arm of arms) {
      if (arm.email) {
        await resend.emails.send({
          from:    'noreply@hirenowwithflex.us',
          to:      String(arm.email),
          subject: `Override Requested — ${candidateName} (${overrideNumber})`,
          html:    `<p>Hi ${String(arm.full_name ?? 'Recruiting Manager')},</p>
                    <p>A Hiring Manager has requested a score override for <strong>${candidateName}</strong>.</p>
                    <p><strong>Reason:</strong> ${OVERRIDE_REASON_LABELS[reasonCode]}<br/>
                    <strong>Score Gap:</strong> ${scoreGap} points below threshold<br/>
                    <strong>Reference:</strong> ${overrideNumber}</p>
                    <p><a href="${process.env['NEXT_PUBLIC_APP_URL']}/agency/override-queue">Review in Override Queue →</a></p>`,
        }).catch(err => console.error('[FFN][override] Email failed:', (err as Error).message))
      }
    }
  }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId, actor_id: null, persona_code: 'p_hiring_manager',
    action: 'override_request.created', entity_type: 'x_ffn_override_request',
    entity_id: overrideReq.id,
    new_values: { number: overrideNumber, reason_code: reasonCode, score_gap: scoreGap },
    ip_address: null, user_agent: null,
  })

  return { success: true, requestId: overrideReq.id, number: overrideNumber }
}
