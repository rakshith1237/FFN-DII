import { redirect }                          from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import RtrInboxClient                        from '@/components/agency/rtr-inbox-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function RtrInboxPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: rtrs } = await supabaseAdmin
    .from('x_ffn_rtr')
    .select(`
      id, number, status, signed_at, created_at,
      candidate:candidate_id ( first_name, last_name, email, current_title ),
      jd:jd_id ( title, location_city ),
      partner:tenant_id ( name )
    `)
    .eq('agency_tenant_id', tenantId)
    .in('status', ['sent', 'signed'])
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <RtrInboxClient
      rtrs={(rtrs ?? []) as Record<string, unknown>[]}
    />
  )
}
