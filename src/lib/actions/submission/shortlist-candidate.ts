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

export type ShortlistState = { error?: string; success?: boolean }

export async function shortlistCandidate(submissionId: string): Promise<ShortlistState> {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const { data: sub } = await supabaseAdmin
    .from('x_ffn_submission')
    .select('id, status, agency_tenant_id, candidate_id, jd_id')
    .eq('id', submissionId)
    .eq('partner_tenant_id', tenantId)
    .single()

  if (!sub) return { error: 'Submission not found.' }
  if (sub.status === 'shortlisted') return { error: 'Already shortlisted.' }

  const { error } = await supabaseAdmin
    .from('x_ffn_submission')
    .update({ status: 'shortlisted', updated_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (error) return { error: error.message }

  // Fetch candidate name for notification
  const { data: cand } = await supabaseAdmin
    .from('x_ffn_candidate')
    .select('first_name, last_name')
    .eq('id', String(sub.candidate_id))
    .single()

  const candidateName = cand
    ? `${String(cand.first_name)} ${String(cand.last_name)}`
    : 'Candidate'

  // Notify A-RMs in the agency
  const { data: arms } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('email, full_name')
    .eq('tenant_id', String(sub.agency_tenant_id))
    .eq('persona_code', 'a_recruiting_manager')
    .eq('is_active', true)

  if (arms) {
    for (const arm of arms) {
      if (arm.email) {
        await resend.emails.send({
          from:    'noreply@hirenowwithflex.us',
          to:      String(arm.email),
          subject: `Shortlisted — ${candidateName}`,
          html:    `<p>Hi ${String(arm.full_name ?? 'Recruiting Manager')},</p>
                    <p><strong>${candidateName}</strong> has been shortlisted by the Hiring Manager.</p>`,
        }).catch(err => console.error('[FFN][shortlist] Email failed:', (err as Error).message))
      }
    }
  }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId, actor_id: null, persona_code: 'p_hiring_manager',
    action: 'submission.shortlisted', entity_type: 'x_ffn_submission',
    entity_id: submissionId, new_values: { candidate_name: candidateName },
    ip_address: null, user_agent: null,
  })

  return { success: true }
}
