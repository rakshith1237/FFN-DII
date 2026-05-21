import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { SsoConfigForm } from '@/components/partner/sso-config-form'

export default async function SsoConfigPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (persona !== 'p_super_admin') redirect('/partner/settings')

  const db = createAdminClient()
  const { data: existing } = await db
    .from('x_ffn_sso_config')
    .select('idp_metadata_xml, attribute_persona_key, attribute_email_key, attribute_name_key, is_active, configured_at')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold text-[#0F2147]">SAML SSO Configuration</h1>
        {existing && (
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            existing.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {existing.is_active ? 'Active' : 'Pending Activation'}
          </span>
        )}
      </div>
      <p className="text-sm text-[#6B7280] mb-6">
        Configure SAML 2.0 SSO for your organisation. After submitting, the FlexAdmin team will
        activate SSO in Supabase within 24 hours.
      </p>

      <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-[#C2410C] mb-1">Supabase Pro plan required</p>
        <p className="text-xs text-[#92400E]">
          SAML SSO requires your workspace to be on the Supabase Pro plan. Contact
          support@hirenowwithflex.us to upgrade. Setup guides:{' '}
          <a href="https://developer.okta.com/docs/guides/saml-application-setup/" target="_blank"
            rel="noopener noreferrer" className="underline">Okta</a>{' · '}
          <a href="https://learn.microsoft.com/en-us/azure/active-directory/saml-claims-customization" target="_blank"
            rel="noopener noreferrer" className="underline">Azure AD</a>
        </p>
      </div>

      <SsoConfigForm existing={existing} />
    </div>
  )
}
