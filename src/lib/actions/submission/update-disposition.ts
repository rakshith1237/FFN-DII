'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Valid status values from x_ffn_submission_status_check constraint
const VALID_STATUSES = [
  'received', 'under_review', 'shortlisted',
  'interview_scheduled', 'rejected', 'offer_made', 'filled',
] as const
type SubmissionStatus = typeof VALID_STATUSES[number]

export type UpdateDispositionState = { error?: string; success?: boolean }

export async function updateDisposition(
  submissionId: string,
  newStatus:    SubmissionStatus
): Promise<UpdateDispositionState> {
  await requirePersona(['p_hiring_manager', 'p_super_admin', 'p_recruiter'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (!VALID_STATUSES.includes(newStatus)) {
    return { error: `Invalid status: ${newStatus}` }
  }

  const { data: sub } = await supabaseAdmin
    .from('x_ffn_submission')
    .select('id, status')
    .eq('id', submissionId)
    .eq('partner_tenant_id', tenantId)
    .single()

  if (!sub) return { error: 'Submission not found.' }

  const updates: Record<string, unknown> = {
    status:     newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === 'rejected') {
    updates['disposition_outcome'] = 'rejected_by_partner'
    updates['dispositioned_at']    = new Date().toISOString()
  }
  if (newStatus === 'filled') {
    updates['dispositioned_at'] = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('x_ffn_submission')
    .update(updates)
    .eq('id', submissionId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId, actor_id: null, persona_code: 'p_hiring_manager',
    action: 'submission.status_changed', entity_type: 'x_ffn_submission',
    entity_id: submissionId,
    new_values: { from: String(sub.status), to: newStatus },
    ip_address: null, user_agent: null,
  })

  return { success: true }
}
