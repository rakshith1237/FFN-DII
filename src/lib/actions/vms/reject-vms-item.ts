'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { type RejectReason } from '@/lib/types/vms'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type RejectVmsState = { error?: string; success?: boolean }

export async function rejectVmsItem(
  inboxId: string,
  reason:  RejectReason
): Promise<RejectVmsState> {
  await requirePersona(['p_recruiter', 'p_hiring_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const { error } = await supabaseAdmin
    .from('x_ffn_vms_inbox')
    .update({ parse_status: 'rejected', parse_error: reason })
    .eq('id', inboxId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'p_recruiter',
    action:       'vms.item_rejected',
    entity_type:  'x_ffn_vms_inbox',
    entity_id:    inboxId,
    new_values:   { reason },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true }
}
