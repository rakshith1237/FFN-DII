import { redirect }                          from 'next/navigation'
import Link                                  from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantId }                       from '@/lib/auth/session'
import { benchQuery }                        from '@/lib/ai/bench-query'
import { buildScoredCandidates }             from '@/lib/ai/xy-score'
import XyScoringClient                       from '@/components/agency/xy-scoring-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jdId } = await params
  const tenantId     = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('id, persona_code')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single()

  if (!profile) redirect('/auth/login')

  const { data: assignment } = await supabaseAdmin
    .from('x_ffn_jd_assignment')
    .select('id, submission_quota, submissions_used, target_submission_date, notes, status')
    .eq('jd_id', jdId)
    .eq('recruiter_id', profile.id)
    .eq('status', 'active')
    .single()

  if (!assignment) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-semibold text-[#374151] mb-2">
          You are not assigned to this requirement.
        </p>
        <Link href="/agency/requirements"
          className="text-sm text-[#3B82F6] hover:underline">
          ← Back to My Requirements
        </Link>
      </div>
    )
  }

  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('id, title, required_skills, location_city, work_arrangement, start_date, tenant_id')
    .eq('id', jdId)
    .single()

  if (!jd) redirect('/agency/requirements')

  const { data: partnerTenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name')
    .eq('id', jd.tenant_id)
    .single()

  // ADR-004: benchQuery MUST be called on every Submit screen load
  const benchResults     = await benchQuery(jdId, tenantId, 20)
  const scoredCandidates = buildScoredCandidates(benchResults)

  const quotaRemaining = assignment.submission_quota - assignment.submissions_used

  return (
    <XyScoringClient
      jd={{
        id:               jd.id,
        title:            jd.title,
        required_skills:  jd.required_skills ?? '',
        location_city:    jd.location_city ?? null,
        work_arrangement: jd.work_arrangement ?? null,
        start_date:       jd.start_date ?? null,
        partner_name:     partnerTenant?.name ?? 'Partner Organisation',
      }}
      assignment={{
        id:                     assignment.id,
        submission_quota:       assignment.submission_quota,
        submissions_used:       assignment.submissions_used,
        quota_remaining:        quotaRemaining,
        target_submission_date: assignment.target_submission_date,
        notes:                  assignment.notes ?? null,
      }}
      scoredCandidates={scoredCandidates}
      benchRaw={benchResults}
    />
  )
}
