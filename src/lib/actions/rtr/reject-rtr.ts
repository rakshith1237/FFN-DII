'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type RejectRtrState = { error?: string; success?: boolean }

export async function rejectRTR(rtrId: string, reason: string): Promise<RejectRtrState> {
  await requirePersona(['a_recruiting_manager', 'a_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const { data: rtr } = await supabaseAdmin
    .from('x_ffn_rtr')
    .select('id, status, agency_tenant_id')
    .eq('id', rtrId)
    .eq('agency_tenant_id', tenantId)
    .single()

  if (!rtr) return { error: 'RTR not found.' }
  if (rtr.status !== 'signed') {
    return { error: `RTR cannot be rejected — current status is '${String(rtr.status)}'.` }
  }

  if (!reason.trim()) return { error: 'Rejection reason is required.' }

  const { error } = await supabaseAdmin
    .from('x_ffn_rtr')
    .update({
      status:      'voided',
      voided_at:   new Date().toISOString(),
      void_reason: reason.trim(),
    })
    .eq('id', rtrId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiting_manager',
    action:       'rtr.rejected_by_arm',
    entity_type:  'x_ffn_rtr',
    entity_id:    rtrId,
    new_values:   { reason },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true }
}
