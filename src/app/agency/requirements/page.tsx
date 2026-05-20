import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/auth/session'
import RequirementsClient from '@/components/agency/requirements-client'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function RequirementsPage() {
  const tenantId = await getTenantId()
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

  const isArm = ['a_recruiting_manager', 'a_super_admin'].includes(profile.persona_code)

  const query = supabaseAdmin
    .from('x_ffn_jd_assignment')
    .select(`
      id, jd_id, submission_quota, submissions_used,
      target_submission_date, notes, status, assigned_at,
      x_ffn_jd ( id, title, location_city, work_arrangement, start_date, tenant_id,
        partner_tenant:tenant_id ( name )
      )
    `)
    .eq('agency_tenant_id', tenantId)
    .order('target_submission_date', { ascending: true })
    .limit(100)

  if (!isArm) {
    query.eq('recruiter_id', profile.id)
  }

  const { data: assignments } = await query

  return (
    <RequirementsClient
      assignments={(assignments ?? []) as Record<string, unknown>[]}
      isArm={isArm}
    />
  )
}
