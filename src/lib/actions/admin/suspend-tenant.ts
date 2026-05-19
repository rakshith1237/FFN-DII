'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona } from '@/lib/auth/session'

export async function suspendTenant(formData: FormData): Promise<void> {
  await requirePersona(['flex_admin'])

  const tenantId         = (formData.get('tenantId') as string | null)?.trim() ?? ''
  const suspensionReason = (formData.get('suspensionReason') as string | null)?.trim()
    ?? 'Administrative suspension via FlexAdmin console.'

  if (!tenantId || suspensionReason.length < 20) return

  const supabaseAdmin = createAdminClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: tenant, error: fetchError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id, name, status')
    .eq('id', tenantId)
    .single()

  if (fetchError || !tenant) return
  if ((tenant as { status: string }).status === 'suspended') return

  const { error: updateError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: suspensionReason,
    })
    .eq('id', tenantId)

  if (updateError) return

  const { data: profiles } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('id')
    .eq('tenant_id', tenantId)

  const users = (profiles ?? []) as Array<{ id: string }>

  await Promise.allSettled(
    users.map(user => supabaseAdmin.auth.admin.signOut(user.id, 'global')),
  )

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:   tenantId,
    actor_id:    null,
    persona_code:'flex_admin',
    action:      'tenant.suspended',
    entity_type: 'x_ffn_tenant',
    entity_id:   tenantId,
    new_values:  { status: 'suspended', reason: suspensionReason, users_signed_out: users.length },
    ip_address:  null,
    user_agent:  null,
  })

  revalidatePath(`/flexadmin/tenants/${tenantId}`)
  redirect(`/flexadmin/tenants/${tenantId}`)
}
