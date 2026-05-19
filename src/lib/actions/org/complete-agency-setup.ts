'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

export type AgencySetupState = {
  error?:   string
  success?: boolean
  step?:    number
}

export async function completeAgencySetup(
  prevState: AgencySetupState,
  formData: FormData,
): Promise<AgencySetupState> {
  await requirePersona(['a_super_admin'])

  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const step            = parseInt(formData.get('step') as string, 10)
  const orgDisplayName  = (formData.get('orgDisplayName') as string | null)?.trim() ?? ''
  const specialisations = (formData.get('specialisations') as string | null)?.trim() ?? ''
  const timezone        = (formData.get('timezone') as string | null)?.trim() ?? ''

  const supabaseAdmin = createAdminClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  if (step === 1) {
    if (orgDisplayName.length < 3 || orgDisplayName.length > 100) {
      return { error: 'Organisation name must be between 3 and 100 characters.' }
    }
    if (!specialisations) return { error: 'At least one specialisation is required.' }

    const { error: updateError } = await supabaseAdmin
      .from('x_ffn_tenant')
      .update({ name: orgDisplayName })
      .eq('id', tenantId)

    if (updateError) return { error: 'Failed to save organisation details. Please try again.' }
    return { success: true, step: 1 }
  }

  if (step === 2) {
    if (!timezone) return { error: 'Timezone is required.' }

    const { error: updateError } = await supabaseAdmin
      .from('x_ffn_tenant')
      .update({ timezone, setup_complete: true })
      .eq('id', tenantId)

    if (updateError) return { error: 'Failed to complete setup. Please try again.' }

    await supabaseAdmin.from('x_ffn_audit_log').insert({
      tenant_id:   tenantId,
      actor_id:    null,
      persona_code:'a_super_admin',
      action:      'tenant.setup_completed',
      entity_type: 'x_ffn_tenant',
      entity_id:   tenantId,
      new_values:  { step: 2 },
      ip_address:  null,
      user_agent:  null,
    })

    return { success: true, step: 2 }
  }

  return { error: 'Invalid setup step.' }
}
