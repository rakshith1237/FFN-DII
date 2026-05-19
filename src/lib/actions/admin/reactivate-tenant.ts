'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona } from '@/lib/auth/session'

export async function reactivateTenant(formData: FormData): Promise<void> {
  await requirePersona(['flex_admin'])

  const tenantId = (formData.get('tenantId') as string | null)?.trim() ?? ''
  const reason   = (formData.get('reason') as string | null)?.trim()
    ?? 'Reactivated via FlexAdmin console.'

  if (!tenantId || reason.length < 10) return

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
  if ((tenant as { status: string }).status !== 'suspended') return

  const { error: updateError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .update({
      status:            'active',
      suspended_at:      null,
      suspension_reason: null,
    })
    .eq('id', tenantId)

  if (updateError) return

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:   tenantId,
    actor_id:    null,
    persona_code:'flex_admin',
    action:      'tenant.reactivated',
    entity_type: 'x_ffn_tenant',
    entity_id:   tenantId,
    new_values:  { status: 'active', reason },
    ip_address:  null,
    user_agent:  null,
  })

  revalidatePath(`/flexadmin/tenants/${tenantId}`)
  redirect(`/flexadmin/tenants/${tenantId}`)
}
