import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/auth/session'
import JdAssignClient from '@/components/agency/jd-assign-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function JdAssignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jdId } = await params
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('id, title, location_city, work_arrangement, start_date, required_skills, tenant_id')
    .eq('id', jdId)
    .single()

  if (!jd) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-semibold text-[#374151] mb-2">JD not found</p>
        <Link href="/agency/jd-inbox" className="text-sm text-[#3B82F6] hover:underline">
          ← Back to JD Inbox
        </Link>
      </div>
    )
  }

  const { data: broadcast } = await supabaseAdmin
    .from('x_ffn_jd_broadcast')
    .select('id, status, tier')
    .eq('jd_id', jdId)
    .eq('agency_tenant_id', tenantId)
    .single()

  if (!broadcast || broadcast.status !== 'accepted') {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-semibold text-[#374151] mb-2">
          This JD has not been accepted by your agency yet.
        </p>
        <Link href="/agency/jd-inbox" className="text-sm text-[#3B82F6] hover:underline">
          ← Back to JD Inbox
        </Link>
      </div>
    )
  }

  const { data: partnerTenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name')
    .eq('id', jd.tenant_id)
    .single()

  const { data: recruiters } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .eq('persona_code', 'a_recruiter')
    .eq('is_active', true)
    .order('full_name')

  const { data: existingAssignments } = await supabaseAdmin
    .from('x_ffn_jd_assignment')
    .select('recruiter_id, submission_quota, submissions_used, target_submission_date, notes, status')
    .eq('jd_id', jdId)
    .eq('agency_tenant_id', tenantId)

  return (
    <JdAssignClient
      jd={{
        id:               jd.id,
        title:            jd.title,
        location_city:    jd.location_city ?? null,
        work_arrangement: jd.work_arrangement ?? null,
        start_date:       jd.start_date ?? null,
        required_skills:  jd.required_skills ?? null,
      }}
      broadcastId={broadcast.id}
      partnerName={partnerTenant?.name ?? 'Partner Organisation'}
      recruiters={(recruiters ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>}
      existingAssignments={(existingAssignments ?? []) as Array<{
        recruiter_id:           string
        submission_quota:       number
        submissions_used:       number
        target_submission_date: string
        notes:                  string | null
        status:                 string
      }>}
    />
  )
}
