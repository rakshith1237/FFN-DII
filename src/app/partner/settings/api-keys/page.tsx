import { createAdminClient }           from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }                    from 'next/navigation'
import { ApiKeysManager }              from '@/components/partner/api-keys-manager'

export default async function ApiKeysPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (persona !== 'p_super_admin') redirect('/partner/settings')

  const db = createAdminClient()
  const { data: keys } = await db
    .from('x_ffn_api_keys')
    .select('id, name, scopes, is_active, last_used_at, created_at, rate_limit_rpm')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">API Keys</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Generate API keys to integrate FlexForceNow with your ATS or other systems. Keys are shown once on creation — store them securely.
        </p>
      </div>
      <ApiKeysManager existingKeys={keys ?? []} />
    </div>
  )
}
