'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// rejection_reason_code values from DB constraint
export const REJECTION_CODES = [
  'insufficient_justification',
  'score_gap_too_large',
  'candidate_not_suitable',
  'other',
] as const
export type RejectionCode = typeof REJECTION_CODES[number]

export const REJECTION_LABELS: Record<RejectionCode, string> = {
  insufficient_justification: 'Insufficient Justification',
  score_gap_too_large:        'Score Gap Too Large',
  candidate_not_suitable:     'Candidate Not Suitable',
  other:                      'Other',
}

export type RejectOverrideState = { error?: string; success?: boolean }

export async function rejectOverride(
  overrideId:    string,
  rejectionCode: RejectionCode
): Promise<RejectOverrideState> {
  await requirePersona(['a_recruiting_manager', 'a_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (!REJECTION_CODES.includes(rejectionCode)) {
    return { error: 'Invalid rejection reason code.' }
  }

  const { data: ovr } = await supabaseAdmin
    .from('x_ffn_override_request')
    .select('id, status, agency_tenant_id')
    .eq('id', overrideId)
    .eq('agency_tenant_id', tenantId)
    .single()

  if (!ovr) return { error: 'Override request not found.' }
  if (ovr.status !== 'requested') {
    return { error: `Cannot reject — current status is '${String(ovr.status)}'.` }
  }

  const { error } = await supabaseAdmin
    .from('x_ffn_override_request')
    .update({
      status:                'rejected',
      rejection_date:        new Date().toISOString(),
      rejection_reason_code: rejectionCode,
    })
    .eq('id', overrideId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId, actor_id: null, persona_code: 'a_recruiting_manager',
    action: 'override_request.rejected', entity_type: 'x_ffn_override_request',
    entity_id: overrideId, new_values: { rejection_reason_code: rejectionCode },
    ip_address: null, user_agent: null,
  })

  return { success: true }
}
