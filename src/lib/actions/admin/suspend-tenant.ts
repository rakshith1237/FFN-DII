'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona } from '@/lib/auth/session'

export type SuspendTenantState = {
  error?: string
  success?: boolean
}

export async function suspendTenant(
  tenantId: string,
  suspensionReason: string,
): Promise<SuspendTenantState> {
  await requirePersona(['flex_admin'])

  if (suspensionReason.length < 20) {
    return { error: 'Suspension reason must be at least 20 characters.' }
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
  if ((tenant as { status: string }).status === 'suspended') {
    return { error: 'Tenant is already suspended.' }
  }

  const { error: updateError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: suspensionReason,
    })
    .eq('id', tenantId)

  if (updateError) {
    return { error: 'Failed to suspend tenant. Please try again.' }
  }

  const { data: profiles } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('id')
    .eq('tenant_id', tenantId)

  const users = (profiles ?? []) as Array<{ id: string }>

  await Promise.allSettled(
    users.map(user => supabaseAdmin.auth.admin.signOut(user.id, 'global')),
  )

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenantId,
    actor_id: null,
    persona_code: 'flex_admin',
    action: 'tenant.suspended',
    entity_type: 'x_ffn_tenant',
    entity_id: tenantId,
    new_values: { status: 'suspended', reason: suspensionReason, users_signed_out: users.length },
    ip_address: null,
    user_agent: null,
  })

  return { success: true }
}
