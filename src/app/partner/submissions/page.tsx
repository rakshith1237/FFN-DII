import { redirect }                          from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import SubmissionsClient                     from '@/components/partner/submissions-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function SubmissionsPage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: submissions } = await supabaseAdmin
    .from('x_ffn_submission')
    .select(`
      id, status, submitted_at, intellimatch_score,
      technical_fit_score, auxiliary_fit_score,
      score_factor_snapshot, score_explanation, scored_at,
      candidate:candidate_id (
        first_name, last_name, email,
        current_title, location_city
      ),
      jd:jd_id ( title, location_city, location_type, requirements ),
      agency:agency_tenant_id ( name )
    `)
    .eq('partner_tenant_id', tenantId)
    .order('submitted_at', { ascending: false })
    .limit(100)

  return (
    <SubmissionsClient
      submissions={(submissions ?? []) as Record<string, unknown>[]}
    />
  )
}
