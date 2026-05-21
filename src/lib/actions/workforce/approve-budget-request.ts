'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

export async function approveBudgetRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  notes?: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([getPersonaCode(), getTenantId(), getUser()])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_super_admin','flex_admin'].includes(persona)) return { error: 'Forbidden' }

  const db = createAdminClient()
  const { data: req, error: fetchError } = await db
    .from('x_ffn_budget_request')
    .select('*')
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !req) return { error: 'Budget request not found' }
  if (req.status !== 'submitted' && req.status !== 'under_review') {
    return { error: 'Request is not in a reviewable state' }
  }

  const newStatus = decision === 'approved' ? 'approved' : 'rejected'

  const { error: updateError } = await db
    .from('x_ffn_budget_request')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updateError) return { error: updateError.message }

  if (decision === 'approved') {
    const { error: hcError } = await db
      .from('x_ffn_approved_headcount')
      .insert({
        tenant_id:         tenantId,
        budget_request_id: requestId,
        role:              req.role,
        headcount_count:   req.headcount_count,
        filled_count:      0,
        department:        req.department,
        business_unit:     req.business_unit,
        required_skills:   req.required_skills,
        budget_approved:   req.budget_amount,
        currency:          req.currency,
        target_start_date: req.target_start_date,
        approved_by:       user.id,
        approved_at:       new Date().toISOString(),
      })
    if (hcError) return { error: hcError.message }

    // Notify submitter via Resend
    if (req.submitted_by) {
      const { data: submitter } = await db
        .from('x_ffn_user_profile')
        .select('email, full_name')
        .eq('user_id', req.submitted_by)
        .maybeSingle()
      if (submitter?.email) {
        const resend = getResend()
        await resend.emails.send({
          from: 'FFN Platform <noreply@hirenowwithflex.us>',
          to: submitter.email,
          subject: `Budget Request Approved — ${req.role}`,
          html: `<p>Hi ${submitter.full_name ?? 'there'},</p>
                 <p>Your budget request for <strong>${req.headcount_count} × ${req.role}</strong> has been approved.</p>
                 <p>An approved headcount record has been created. You can now create a Job Description from the Headcount Tracker.</p>`,
        }).catch(() => null) // non-fatal
      }
    }
  }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       `budget_request.${decision}`,
    entity_type:  'x_ffn_budget_request',
    entity_id:    requestId,
    new_values:   { status: newStatus, notes },
  })

  revalidatePath('/partner/workforce/budget-request')
  revalidatePath('/partner/workforce/headcount')
  return { error: null }
}
