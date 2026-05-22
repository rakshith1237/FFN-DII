import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }             from 'next/navigation'
import { ExtensionForm }        from '@/components/partner/extension-form'

export default async function ExtensionPage({
  params,
}: {
  params: Promise<{ placementId: string }>
}) {
  const { placementId } = await params
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: placement } = await db
    .from('x_ffn_placement')
    .select('id, status, start_date, end_date, bill_rate, currency, x_ffn_candidate!inner(first_name,last_name), x_ffn_jd!inner(title)')
    .eq('id', placementId).eq('tenant_id', tenantId).maybeSingle()

  if (!placement) redirect('/partner/dashboard')

  const { data: extensions } = await db
    .from('x_ffn_contract_extension')
    .select('id, new_end_date, new_bill_rate, reason, status, requested_at, approved_at')
    .eq('placement_id', placementId)
    .order('requested_at', { ascending: false })

  const p = placement as unknown as {
    id: string; status: string; start_date: string; end_date: string | null
    bill_rate: number; currency: string
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-1">Contract Extension</h1>
      <p className="text-sm text-[#6B7280] mb-6">
        {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name} · {p.x_ffn_jd.title}
      </p>
      <ExtensionForm
        placementId={placementId}
        currentEndDate={p.end_date}
        currentBillRate={p.bill_rate}
        currency={p.currency}
        extensions={extensions ?? []}
        isSuperAdmin={persona === 'p_super_admin'}
      />
    </div>
  )
}
