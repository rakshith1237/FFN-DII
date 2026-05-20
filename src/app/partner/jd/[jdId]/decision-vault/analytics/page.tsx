import { redirect }                          from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import OverrideAnalyticsClient               from '@/components/partner/override-analytics-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function OverrideAnalyticsPage({
  params,
}: { params: Promise<{ jdId: string }> }) {
  const { jdId } = await params
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('id, title')
    .eq('id', jdId)
    .eq('tenant_id', tenantId)
    .single()

  if (!jd) redirect('/partner/submissions')

  const { data: overrides } = await supabaseAdmin
    .from('x_ffn_override_request')
    .select('id, reason_code, status, score_gap, created_at, requesting_hm_role')
    .eq('jd_id', jdId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  return (
    <OverrideAnalyticsClient
      jdTitle={String(jd.title)}
      jdId={jdId}
      overrides={(overrides ?? []) as Record<string, unknown>[]}
    />
  )
}
