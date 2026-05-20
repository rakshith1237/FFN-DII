'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { type DeclineReason } from '@/lib/types/broadcast'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type DeclineJdState = { error?: string; success?: boolean }

export async function declineJD(
  broadcastId: string,
  reason:      DeclineReason
): Promise<DeclineJdState> {
  await requirePersona(['a_super_admin', 'a_recruiting_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const { data: broadcast, error: fetchError } = await supabaseAdmin
    .from('x_ffn_jd_broadcast')
    .select('id, status, jd_id')
    .eq('id', broadcastId)
    .eq('agency_tenant_id', tenantId)
    .single()

  if (fetchError || !broadcast) return { error: 'Broadcast record not found.' }
  if (broadcast.status !== 'pending') {
    return { error: `This JD has status '${broadcast.status}' and cannot be declined.` }
  }

  const { error } = await supabaseAdmin
    .from('x_ffn_jd_broadcast')
    .update({
      status:         'declined',
      decline_reason: reason,
      responded_at:   new Date().toISOString(),
    })
    .eq('id', broadcastId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiting_manager',
    action:       'jd_broadcast.declined',
    entity_type:  'x_ffn_jd_broadcast',
    entity_id:    broadcastId,
    new_values:   { reason, jd_id: broadcast.jd_id },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true }
}
