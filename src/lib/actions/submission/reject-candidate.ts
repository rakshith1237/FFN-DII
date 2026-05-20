'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type RejectCandidateState = { error?: string; success?: boolean }

// disposition_outcome values from DB constraint:
// offer_accepted | rejected_by_partner | withdrawn_by_agency | filled_by_other
export async function rejectCandidate(
  submissionId: string,
  notes: string
): Promise<RejectCandidateState> {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (!notes.trim()) return { error: 'Rejection reason is required.' }

  const { data: sub } = await supabaseAdmin
    .from('x_ffn_submission')
    .select('id, status')
    .eq('id', submissionId)
    .eq('partner_tenant_id', tenantId)
    .single()

  if (!sub) return { error: 'Submission not found.' }
  if (sub.status === 'rejected') return { error: 'Already rejected.' }

  const { error } = await supabaseAdmin
    .from('x_ffn_submission')
    .update({
      status:               'rejected',
      disposition_outcome:  'rejected_by_partner',
      disposition_notes:    notes.trim(),
      dispositioned_at:     new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId, actor_id: null, persona_code: 'p_hiring_manager',
    action: 'submission.rejected', entity_type: 'x_ffn_submission',
    entity_id: submissionId, new_values: { notes },
    ip_address: null, user_agent: null,
  })

  return { success: true }
}
