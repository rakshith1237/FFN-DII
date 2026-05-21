import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import JdEditForm from '@/components/partner/jd-edit-form'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type JdRecord = {
  id:                     string
  status:                 string
  source:                 string | null
  title:                  string
  dept_code:              string | null
  engagement_type:        string | null
  start_date:             string | null
  end_date:               string | null
  currency:               string | null
  rate_model:             string | null
  bill_rate:              number | null
  skills:                 string | null
  work_type:              string | null
  location_city:          string | null
  location_state:         string | null
  location_country:       string | null
  intellimatch_threshold: number | null
  screening_required:     boolean | null
  geo_rules:              unknown
  assigned_recruiter_id:  string | null
  description_html:       string | null
  scoring_criteria:       unknown
}

export type RecruiterUser = {
  id:        string
  full_name: string | null
  email:     string
}

interface EditPageProps {
  params: Promise<{ jdId: string }>
}

export default async function JdEditPage({ params }: EditPageProps) {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const { jdId } = await params
  const tenantId = await getTenantId()

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-[#6B7280]">
        Unable to load JD — tenant context missing.
      </div>
    )
  }

  const [jdResult, recruiterResult] = await Promise.all([
    supabaseAdmin
      .from('x_ffn_job_description')
      .select('id, status, source, title, dept_code, engagement_type, start_date, end_date, currency, rate_model, bill_rate, skills, work_type, location_city, location_state, location_country, intellimatch_threshold, screening_required, geo_rules, assigned_recruiter_id, description_html, scoring_criteria')
      .eq('id', jdId)
      .eq('tenant_id', tenantId)
      .single(),
    supabaseAdmin
      .from('x_ffn_users')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .eq('persona_code', 'p_recruiter')
      .order('full_name', { ascending: true }),
  ])

  if (!jdResult.data) {
    return (
      <div className="p-6 text-center text-[#6B7280]">
        Job description not found.
      </div>
    )
  }

  return (
    <JdEditForm
      jd={jdResult.data as JdRecord}
      recruiters={(recruiterResult.data ?? []) as RecruiterUser[]}
    />
  )
}
