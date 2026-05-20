import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/auth/session'
import TierConfigClient from '@/components/partner/tier-config-client'
import { type AgencyTenant, type TierConfig } from '@/lib/types/broadcast'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function TierConfigPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const [agenciesResult, tierResult] = await Promise.all([
    supabaseAdmin
      .from('x_ffn_tenant')
      .select('id, name, type')
      .eq('type', 'agency')
      .eq('status', 'active')
      .order('name'),
    supabaseAdmin
      .from('x_ffn_tier_config')
      .select('id, tenant_id, tier_number, agency_tenant_id, hold_window_hours')
      .eq('tenant_id', tenantId)
      .order('tier_number'),
  ])

  return (
    <TierConfigClient
      agencies={(agenciesResult.data ?? []) as AgencyTenant[]}
      currentConfig={(tierResult.data ?? []) as TierConfig[]}
      tenantId={tenantId}
    />
  )
}
