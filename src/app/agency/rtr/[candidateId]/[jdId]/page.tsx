import { redirect }                          from 'next/navigation'
import Link                                  from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import { checkRtrDedup }                     from '@/lib/actions/rtr/check-rtr-dedup'
import RtrGenerateClient                     from '@/components/agency/rtr-generate-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function RtrGeneratePage({
  params,
}: {
  params: Promise<{ candidateId: string; jdId: string }>
}) {
  const { candidateId, jdId } = await params
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  // Fetch candidate
  const { data: candidate } = await supabaseAdmin
    .from('x_ffn_candidate')
    .select('id, first_name, last_name, email, current_title, bench_status')
    .eq('id', candidateId)
    .eq('tenant_id', tenantId)
    .single()

  // Fetch JD
  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('id, title, status, tenant_id, required_skills, location_city')
    .eq('id', jdId)
    .single()

  if (!candidate || !jd) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-semibold text-[#374151] mb-2">
          Candidate or Job Description not found.
        </p>
        <Link href="/agency/requirements"
          className="text-sm text-[#3B82F6] hover:underline">
          ← Back to Requirements
        </Link>
      </div>
    )
  }

  // Fetch partner org
  const { data: partnerTenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name')
    .eq('id', jd.tenant_id as string)
    .single()

  // Fetch agency org
  const { data: agencyTenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name')
    .eq('id', tenantId)
    .single()

  // Run dedup check server-side
  const dedup = await checkRtrDedup(candidateId, jdId, tenantId)

  return (
    <RtrGenerateClient
      candidate={{
        id:            String(candidate.id),
        full_name:     `${String(candidate.first_name)} ${String(candidate.last_name)}`,
        email:         String(candidate.email),
        current_title: candidate.current_title ? String(candidate.current_title) : null,
        bench_status:  String(candidate.bench_status),
      }}
      jd={{
        id:              String(jd.id),
        title:           String(jd.title),
        status:          String(jd.status),
        location_city:   jd.location_city ? String(jd.location_city) : null,
        required_skills: jd.required_skills ? String(jd.required_skills) : null,
      }}
      partnerName={partnerTenant?.name ? String(partnerTenant.name) : 'Partner Organisation'}
      agencyName={agencyTenant?.name ? String(agencyTenant.name) : 'Agency'}
      dedup={dedup}
    />
  )
}
