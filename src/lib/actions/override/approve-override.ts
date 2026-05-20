'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type ApproveOverrideState = { error?: string; success?: boolean }

export async function approveOverride(overrideId: string): Promise<ApproveOverrideState> {
  await requirePersona(['a_recruiting_manager', 'a_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const { data: ovr } = await supabaseAdmin
    .from('x_ffn_override_request')
    .select('id, status, submission_id, agency_tenant_id')
    .eq('id', overrideId)
    .eq('agency_tenant_id', tenantId)
    .single()

  if (!ovr) return { error: 'Override request not found.' }
  if (ovr.status !== 'requested') {
    return { error: `Cannot approve — current status is '${String(ovr.status)}'.` }
  }

  const { error: ovrError } = await supabaseAdmin
    .from('x_ffn_override_request')
    .update({
      status:                   'approved',
      approval_date:            new Date().toISOString(),
      approver_arm_role:        'a_recruiting_manager',
      approver_agency_tenant_id: tenantId,
    })
    .eq('id', overrideId)

  if (ovrError) return { error: ovrError.message }

  // Update submission — set override_approved + link override_request_id
  const { error: subError } = await supabaseAdmin
    .from('x_ffn_submission')
    .update({
      override_approved:   true,
      override_request_id: overrideId,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', String(ovr.submission_id))

  if (subError) return { error: subError.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId, actor_id: null, persona_code: 'a_recruiting_manager',
    action: 'override_request.approved', entity_type: 'x_ffn_override_request',
    entity_id: overrideId, new_values: { submission_id: String(ovr.submission_id) },
    ip_address: null, user_agent: null,
  })

  return { success: true }
}
