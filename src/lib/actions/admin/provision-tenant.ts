'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona } from '@/lib/auth/session'

export type ProvisionTenantState = {
  error?: string
  success?: boolean
  tenantId?: string
  tenantName?: string
}

export async function provisionTenant(
  prevState: ProvisionTenantState,
  formData: FormData,
): Promise<ProvisionTenantState> {
  await requirePersona(['flex_admin'])

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

  // Extract and validate fields
  const orgName = (formData.get('orgName') as string).trim()
  if (orgName.length < 3 || orgName.length > 100) {
    return { error: 'Organisation name must be between 3 and 100 characters.' }
  }

  const orgType = formData.get('orgType') as string
  if (orgType !== 'partner' && orgType !== 'agency') {
    return { error: 'Organisation type must be either partner or agency.' }
  }

  const primaryDomain = (formData.get('primaryDomain') as string).trim().toLowerCase()
  if (!primaryDomain) {
    return { error: 'Primary domain is required.' }
  }

  const country = formData.get('country') as string
  if (!country) {
    return { error: 'Country is required.' }
  }

  const timezone = formData.get('timezone') as string
  if (!timezone) {
    return { error: 'Timezone is required.' }
  }

  const currency = formData.get('currency') as string
  if (currency.length !== 3) {
    return { error: 'Currency must be a 3-character code.' }
  }

  const superAdminEmail = (formData.get('superAdminEmail') as string).trim().toLowerCase()
  if (!superAdminEmail) {
    return { error: 'Super Admin email is required.' }
  }

  const secondaryDomains = formData.get('secondaryDomains') as string | null
  const logoUrl = formData.get('logoUrl') as string | null
  const phone = formData.get('phone') as string | null

  // Domain match validation
  const emailDomain = superAdminEmail.split('@')[1] ?? ''
  if (emailDomain !== primaryDomain.toLowerCase()) {
    return { error: 'Super Admin email domain must match the primary domain.' }
  }

  // Org name uniqueness
  const { data: existing } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id')
    .eq('name', orgName)
    .maybeSingle()
  if (existing) {
    return { error: 'An organisation with this name already exists.' }
  }

  // Domain uniqueness
  const { data: domainTaken } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id')
    .eq('primary_domain', primaryDomain)
    .maybeSingle()
  if (domainTaken) {
    return { error: 'This primary domain is already registered to another tenant.' }
  }

  // Check email not already in auth
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const emailExists = users.some(user => user.email === superAdminEmail)
  if (emailExists) {
    return { error: 'An account with this email address already exists.' }
  }

  // Insert tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('x_ffn_tenant')
    .insert({
      name: orgName,
      type: orgType,
      status: 'active',
      primary_domain: primaryDomain,
      country,
      timezone,
      currency: currency.toUpperCase(),
      primary_contact_email: superAdminEmail,
      secondary_domains: secondaryDomains ?? null,
      logo_storage_path: logoUrl ?? null,
      phone: phone ?? null,
    })
    .select('id, name')
    .single()

  if (tenantError) {
    return { error: 'Failed to create tenant. Please try again.' }
  }

  const { error: settingsError } = await supabaseAdmin.rpc('seed_tenant_settings', {
    p_tenant_id: tenant.id,
  })
  if (settingsError) {
    console.error('[FFN][provision-tenant] Settings RPC failed:', settingsError.message)
    return { error: `Tenant created but settings seed failed: ${settingsError.message}` }
  }

  // Invite super admin
  const personaCode = orgType === 'partner' ? 'p_super_admin' : 'a_super_admin'
  const orgTypeLabel = orgType === 'partner' ? 'partner' : 'agency'
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    superAdminEmail,
    {
      data: {
        persona_code: personaCode,
        tenant_id: tenant.id,
        org_type: orgTypeLabel,
      },
      redirectTo:
        (process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000') + '/auth/setup-password',
    },
  )
  if (inviteError) {
    console.error('[provisionTenant] Failed to send invite:', inviteError)
  }

  // Write audit log
  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id: tenant.id,
    actor_id: null, // will be set when we have session context — acceptable for now
    persona_code: 'flex_admin',
    action: 'tenant.provisioned',
    entity_type: 'x_ffn_tenant',
    entity_id: tenant.id,
    new_values: { org_name: orgName, type: orgType, super_admin_email: superAdminEmail },
    ip_address: null,
    user_agent: null,
  })

  return { success: true, tenantId: tenant.id, tenantName: tenant.name }
}

