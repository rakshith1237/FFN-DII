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

export type AssignmentInput = {
  recruiterId:          string
  submissionQuota:      number
  targetSubmissionDate: string
  notes:                string
}

export type AssignJdState = { error?: string; success?: boolean; assignedCount?: number }

export async function assignJD(
  broadcastId:  string,
  jdId:         string,
  jdTitle:      string,
  assignments:  AssignmentInput[]
): Promise<AssignJdState> {
  await requirePersona(['a_super_admin', 'a_recruiting_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (assignments.length === 0)
    return { error: 'Select at least one recruiter to assign this Job Description to.' }

  const MAX_QUOTA = 10
  const todayParts = new Date().toISOString().split('T')
  const today = todayParts[0] ?? ''
  for (const a of assignments) {
    if (a.submissionQuota < 1)
      return { error: 'Submission quota must be at least 1.' }
    if (a.submissionQuota > MAX_QUOTA)
      return { error: `Submission quota cannot exceed ${MAX_QUOTA}.` }
    if (a.targetSubmissionDate < today)
      return { error: 'Target submission date must be today or a future date.' }
  }

  // Fetch ARM user_profile for assigned_by_id
  const { data: armProfile } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .in('persona_code', ['a_recruiting_manager', 'a_super_admin'])
    .limit(1)
    .single()

  const assignedById = armProfile?.id ?? null

  const rows = assignments.map(a => ({
    tenant_id:              tenantId,
    jd_id:                  jdId,
    agency_tenant_id:       tenantId,
    recruiter_id:           a.recruiterId,
    assigned_by_id:         assignedById,
    submission_quota:       a.submissionQuota,
    submissions_used:       0,
    target_submission_date: a.targetSubmissionDate,
    notes:                  a.notes || null,
    status:                 'active',
  }))

  const { error: insertError } = await supabaseAdmin
    .from('x_ffn_jd_assignment')
    .insert(rows)

  if (insertError) return { error: insertError.message }

  // Fire Resend notification to each assigned recruiter
  for (const a of assignments) {
    const { data: recruiter } = await supabaseAdmin
      .from('x_ffn_user_profile')
      .select('email, full_name')
      .eq('id', a.recruiterId)
      .single()

    if (recruiter?.email) {
      const notesPreview = a.notes
        ? a.notes.slice(0, 100) + (a.notes.length > 100 ? '…' : '')
        : 'No specific instructions.'
      await resend.emails.send({
        from:    'noreply@hirenowwithflex.us',
        to:      recruiter.email,
        subject: `New Requirement Assigned — ${jdTitle}`,
        html: `
          <p>Hi ${recruiter.full_name ?? 'Recruiter'},</p>
          <p>You have been assigned a new requirement: <strong>${jdTitle}</strong></p>
          <p><strong>Submission Quota:</strong> ${a.submissionQuota} candidates<br/>
          <strong>Target Date:</strong> ${a.targetSubmissionDate}<br/>
          <strong>Instructions:</strong> ${notesPreview}</p>
          <p><a href="${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/agency/requirements">Open My Requirements &rarr;</a></p>
        `,
      }).catch(err => console.error('[FFN][assign] Email failed:', (err as Error).message))
    }
  }

  // broadcastId is retained for audit traceability
  void broadcastId

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiting_manager',
    action:       'jd.assigned',
    entity_type:  'x_ffn_jd_assignment',
    entity_id:    null,
    new_values:   { jd_id: jdId, recruiter_count: assignments.length },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true, assignedCount: assignments.length }
}
