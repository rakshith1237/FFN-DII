import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function NewJdPage({
  searchParams,
}: {
  searchParams: Promise<{ headcount_id?: string }>
}) {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-[#6B7280]">
        Unable to create JD — tenant context missing.
      </div>
    )
  }

  const sp = await searchParams
  const headcountId = sp.headcount_id as string | undefined

  let title = 'Untitled Job'
  let targetStartDate: string | null = null

  if (headcountId) {
    const { data: headcount } = await supabaseAdmin
      .from('x_ffn_approved_headcount')
      .select('role, target_start_date')
      .eq('id', headcountId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (headcount) {
      title = headcount.role ?? title
      targetStartDate = headcount.target_start_date ?? null
    }
  }

  const insertPayload: Record<string, unknown> = {
    tenant_id: tenantId,
    status:    'draft',
    title,
  }
  if (targetStartDate) insertPayload.target_start_date = targetStartDate
  if (headcountId)     insertPayload.headcount_id      = headcountId

  const { data: jd, error } = await supabaseAdmin
    .from('x_ffn_job_description')
    .insert(insertPayload)
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
