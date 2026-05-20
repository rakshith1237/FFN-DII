import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/auth/session'
import JdInboxClient from '@/components/agency/jd-inbox-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type BroadcastWithJd = {
  id:               string
  jd_id:            string
  agency_tenant_id: string
  tier:             number
  status:           string
  sent_at:          string | null
  responded_at:     string | null
  decline_reason:   string | null
  created_at:       string
  x_ffn_jd: {
    title:            string
    required_skills:  string | null
    location_city:    string | null
    work_arrangement: string | null
    start_date:       string | null
  } | null
  partner_tenant: {
    name: string
  } | null
}

export default async function JdInboxPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: broadcasts } = await supabaseAdmin
    .from('x_ffn_jd_broadcast')
    .select(`
      id, jd_id, agency_tenant_id, tier, status, sent_at, responded_at, decline_reason, created_at,
      x_ffn_jd ( title, required_skills, location_city, work_arrangement, start_date ),
      partner_tenant:tenant_id ( name )
    `)
    .eq('agency_tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <JdInboxClient
      broadcasts={(broadcasts ?? []) as unknown as BroadcastWithJd[]}
    />
  )
}
