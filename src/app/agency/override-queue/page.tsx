import { redirect }                          from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import OverrideQueueClient                   from '@/components/agency/override-queue-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function OverrideQueuePage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: overrides } = await supabaseAdmin
    .from('x_ffn_override_request')
    .select(`
      id, number, status, reason_code, justification,
      score_at_request, threshold_at_request, score_gap,
      created_at,
      candidate:candidate_id ( first_name, last_name, current_title ),
      jd:jd_id ( title ),
      partner:tenant_id ( name )
    `)
    .eq('agency_tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const requested = (overrides ?? []).filter(o => o.status === 'requested')
  const resolved  = (overrides ?? []).filter(o => o.status !== 'requested')

  return (
    <OverrideQueueClient
      requested={requested as Record<string, unknown>[]}
      resolved={resolved   as Record<string, unknown>[]}
    />
  )
}
