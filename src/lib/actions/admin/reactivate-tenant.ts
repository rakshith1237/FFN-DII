'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona } from '@/lib/auth/session'

export type ReactivateTenantState = {
  error?: string
  success?: boolean
}

export async function reactivateTenant(
  tenantId: string,
  reason: string,
): Promise<ReactivateTenantState> {
  await requirePersona(['flex_admin'])

  if (reason.length < 10) {
    return { error: 'Reactivation reason must be at least 10 characters.' }
  }

  const supabaseAdmin = createAdminClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { data: tenant, error: fetchError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id, name, status')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) {
    return { error: 'Tenant not found.' }
  }
  if ((tenant as { status: string }).status !== 'suspended') {
    return { error: 'Only suspended tenants can be reactivated.' }
  }

  const { error: updateError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .update({
      status: 'active',
      suspended_at: null,
      suspension_reason: null,
    })
    .eq('id', tenantId)

  if (updateError) {
    return { error: 'Failed to reactivate tenant. Please try again.' }
  }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId,
    actor_id: null,
    persona_code: 'flex_admin',
    action: 'tenant.reactivated',
    entity_type: 'x_ffn_tenant',
    entity_id: tenantId,
    new_values: { status: 'active', reason },
    ip_address: null,
    user_agent: null,
  })

  return { success: true }
}
