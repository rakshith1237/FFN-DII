import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function NewJdPage() {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-[#6B7280]">
        Unable to create JD — tenant context missing.
      </div>
    )
  }

  const { data: jd, error } = await supabaseAdmin
    .from('x_ffn_job_description')
    .insert({ tenant_id: tenantId, status: 'draft', title: 'Untitled Job' })
    .select('id')
    .single()

  if (error || !jd) {
    return (
      <div className="p-6 text-center text-[#6B7280]">
        Failed to create draft — please try again.
      </div>
    )
  }

  redirect(`/partner/jd/${jd.id}/edit`)
}
