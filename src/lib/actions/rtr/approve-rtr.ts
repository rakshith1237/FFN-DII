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

function generateSubNumber(): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const hex   = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  return `SUB-${year}${month}-${hex}`
}

export type ApproveRtrState = {
  error?:        string
  success?:      boolean
  submissionId?: string
  subNumber?:    string
}

export async function approveRTR(rtrId: string): Promise<ApproveRtrState> {
  await requirePersona(['a_recruiting_manager', 'a_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const { data: rtr } = await supabaseAdmin
    .from('x_ffn_rtr')
    .select('id, status, jd_id, candidate_id, agency_tenant_id, recruiter_id, number')
    .eq('id', rtrId)
    .eq('agency_tenant_id', tenantId)
    .single()

  if (!rtr) return { error: 'RTR not found.' }
  if (rtr.status !== 'signed') {
    return { error: `RTR status is '${String(rtr.status)}' — only signed RTRs can be approved.` }
  }

  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('tenant_id, title')
    .eq('id', String(rtr.jd_id))
    .single()

  if (!jd) return { error: 'JD not found.' }

  const subNumber = generateSubNumber()

  // Create submission — BR-RTR-004
  const { data: submission, error: subError } = await supabaseAdmin
    .from('x_ffn_submission')
    .insert({
      tenant_id:         String(rtr.agency_tenant_id),
      jd_id:             String(rtr.jd_id),
      candidate_id:      String(rtr.candidate_id),
      rtr_id:            rtrId,
      agency_tenant_id:  String(rtr.agency_tenant_id),
      partner_tenant_id: String(jd.tenant_id),
      recruiter_id:      String(rtr.recruiter_id),
      submitted_at:      new Date().toISOString(),
      status:            'submitted',
    })
    .select('id')
    .single()

  if (subError || !submission) return { error: subError?.message ?? 'Failed to create submission.' }

  // Mark ARM on RTR
  await supabaseAdmin
    .from('x_ffn_rtr')
    .update({ arm_id: null })
    .eq('id', rtrId)

  const { data: candidate } = await supabaseAdmin
    .from('x_ffn_candidate')
    .select('first_name, last_name')
    .eq('id', String(rtr.candidate_id))
    .single()

  const candidateName = candidate
    ? `${String(candidate.first_name)} ${String(candidate.last_name)}`
    : 'Candidate'

  const { data: partnerUsers } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('email, full_name, persona_code')
    .eq('tenant_id', String(jd.tenant_id))
    .in('persona_code', ['p_hiring_manager', 'p_recruiter'])
    .eq('is_active', true)

  if (partnerUsers) {
    for (const user of partnerUsers) {
      if (user.email) {
        await resend.emails.send({
          from:    'noreply@hirenowwithflex.us',
          to:      String(user.email),
          subject: `New Submission — ${candidateName} for ${String(jd.title)}`,
          html:    `<p>Hi ${String(user.full_name ?? 'Team')},</p>
                    <p>A new candidate has been submitted for <strong>${String(jd.title)}</strong>.</p>
                    <p><strong>Candidate:</strong> ${candidateName}<br/>
                    <strong>Submission Reference:</strong> ${subNumber}</p>
                    <p><a href="${process.env['NEXT_PUBLIC_APP_URL']}/partner/submissions">View Submissions →</a></p>`,
        }).catch(err => console.error('[FFN][approve-rtr] Email failed:', (err as Error).message))
      }
    }
  }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiting_manager',
    action:       'submission.created',
    entity_type:  'x_ffn_submission',
    entity_id:    submission.id,
    new_values:   { rtr_id: rtrId, candidate_id: String(rtr.candidate_id), jd_id: String(rtr.jd_id), sub_number: subNumber },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true, submissionId: submission.id, subNumber }
}
