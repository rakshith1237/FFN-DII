'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type AcceptJdState = { error?: string; success?: boolean }

export async function acceptJD(broadcastId: string): Promise<AcceptJdState> {
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
    return { error: `This JD is already ${broadcast.status} and cannot be accepted again.` }
  }

  const { error } = await supabaseAdmin
    .from('x_ffn_jd_broadcast')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', broadcastId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiting_manager',
    action:       'jd_broadcast.accepted',
    entity_type:  'x_ffn_jd_broadcast',
    entity_id:    broadcastId,
    new_values:   { jd_id: broadcast.jd_id },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true }
}
