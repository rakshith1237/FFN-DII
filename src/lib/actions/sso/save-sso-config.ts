'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

export async function saveSsoConfig(input: {
  idpMetadataXml:     string
  attributePersonaKey: string
  attributeEmailKey:  string
  attributeNameKey:   string
}): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([getPersonaCode(), getTenantId(), getUser()])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (persona !== 'p_super_admin') return { error: 'Only Partner Super Admins can configure SSO' }

  if (!input.idpMetadataXml.trim()) return { error: 'IdP metadata XML is required' }
  if (!input.idpMetadataXml.includes('<md:EntityDescriptor') && !input.idpMetadataXml.includes('<EntityDescriptor')) {
    return { error: 'Metadata XML does not appear to be a valid SAML EntityDescriptor' }
  }

  const db = createAdminClient()
  const { error } = await db
    .from('x_ffn_sso_config')
    .upsert({
      tenant_id:              tenantId,
      idp_metadata_xml:       input.idpMetadataXml.trim(),
      attribute_persona_key:  input.attributePersonaKey || 'groups',
      attribute_email_key:    input.attributeEmailKey   || 'email',
      attribute_name_key:     input.attributeNameKey    || 'displayName',
      is_active:              false,  // FlexAdmin activates after verifying in Supabase dashboard
      configured_at:          new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

  if (error) return { error: error.message }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'sso_config.saved',
    entity_type:  'x_ffn_sso_config',
    entity_id:    null,
    new_values:   { attribute_email_key: input.attributeEmailKey },
  })

  revalidatePath('/partner/settings/sso')
  return { error: null }
}
