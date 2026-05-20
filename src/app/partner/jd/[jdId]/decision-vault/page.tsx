import { redirect }                          from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import DecisionVaultClient                   from '@/components/partner/decision-vault-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function DecisionVaultPage({
  params,
}: { params: Promise<{ jdId: string }> }) {
  const { jdId } = await params
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('id, title, intellimatch_threshold, location_type, requirements')
    .eq('id', jdId)
    .eq('tenant_id', tenantId)
    .single()

  if (!jd) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-semibold text-[#374151]">Job Description not found.</p>
      </div>
    )
  }

  const { data: submissions } = await supabaseAdmin
    .from('x_ffn_submission')
    .select(`
      id, status, submitted_at,
      intellimatch_score, technical_fit_score, auxiliary_fit_score,
      score_factor_snapshot, score_explanation, scored_at,
      override_approved, override_request_id,
      disposition_notes,
      candidate:candidate_id (
        id, first_name, last_name, email, current_title,
        location_city, bench_available_from, availability_date,
        rate_expectation_min, rate_expectation_max, rate_model,
        work_authorization
      ),
      agency:agency_tenant_id ( id, name ),
      certs:candidate_id (
        x_ffn_candidate_cert ( cert_name, verification_status )
      )
    `)
    .eq('jd_id', jdId)
    .eq('partner_tenant_id', tenantId)
    .not('status', 'eq', 'rejected')
    .order('intellimatch_score', { ascending: false, nullsFirst: false })
    .limit(200)

  const submissionIds = (submissions ?? []).map(s => String(s.id))
  const { data: overrides } = submissionIds.length > 0
    ? await supabaseAdmin
        .from('x_ffn_override_request')
        .select('id, submission_id, status, reason_code, justification, score_gap')
        .in('submission_id', submissionIds)
    : { data: [] }

  return (
    <DecisionVaultClient
      jd={{
        id:                     String(jd.id),
        title:                  String(jd.title),
        intellimatch_threshold: Number(jd.intellimatch_threshold ?? 75),
        location_type:          String(jd.location_type),
      }}
      submissions={(submissions ?? []) as Record<string, unknown>[]}
      overrides={(overrides ?? []) as Record<string, unknown>[]}
    />
  )
}
