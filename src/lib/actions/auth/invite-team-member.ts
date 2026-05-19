'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

export type InviteTeamMemberState = {
  error?:   string
  success?: boolean
  email?:   string
}

const VALID_PERSONAS = [
  'p_super_admin', 'p_hiring_manager', 'p_recruiter',
  'a_super_admin', 'a_recruiting_manager', 'a_recruiter',
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function inviteTeamMember(
  prevState: InviteTeamMemberState,
  formData: FormData,
): Promise<InviteTeamMemberState> {
  await requirePersona(['p_super_admin', 'a_super_admin'])

  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  const email       = (formData.get('email') as string).trim().toLowerCase()
  const personaCode = (formData.get('personaCode') as string).trim()

  if (!email) return { error: 'Email address is required.' }
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' }
  if (!(VALID_PERSONAS as readonly string[]).includes(personaCode)) {
    return { error: 'Invalid persona selected.' }
  }

  const supabaseAdmin = createAdminClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: tenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('primary_domain, type')
    .eq('id', tenantId)
    .single()

  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (tenant?.primary_domain && emailDomain !== tenant.primary_domain.toLowerCase()) {
    return { error: `Invitee email must be on the @${tenant.primary_domain} domain.` }
  }

  if (tenant?.type === 'partner' && !personaCode.startsWith('p_')) {
    return { error: 'Partner organisations can only invite Partner personas.' }
  }
  if (tenant?.type === 'agency' && !personaCode.startsWith('a_')) {
    return { error: 'Agency organisations can only invite Agency personas.' }
  }

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      persona_code: personaCode,
      tenant_id:    tenantId,
      org_type:     tenant?.type ?? 'partner',
    },
    redirectTo: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/accept-invite`,
  })

  if (inviteError) {
    if (inviteError.message.includes('already')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: 'Failed to send invitation. Please try again.' }
  }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:   tenantId,
    actor_id:    null,
    persona_code:'p_super_admin',
    action:      'team.member_invited',
    entity_type: 'auth.users',
    entity_id:   null,
    new_values:  { email, persona_code: personaCode },
    ip_address:  null,
    user_agent:  null,
  })

  return { success: true, email }
}
