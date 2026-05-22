import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { Ir35SdsForm }         from '@/components/partner/ir35-sds-form'

export default async function Ir35SdsPage({
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
    .select('id, status, candidate_id, jd_id, x_ffn_candidate!inner(first_name, last_name), x_ffn_jd!inner(title, number)')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!placement) redirect('/partner/dashboard')

  const { data: existing } = await db
    .from('x_ffn_ir35_sds')
    .select('answers, determination, determination_score')
    .eq('placement_id', placementId)
    .maybeSingle()

  const p = placement as unknown as {
    id: string; status: string; candidate_id: string; jd_id: string
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd:        { title: string; number: string }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">IR35 Status Determination</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name} · {p.x_ffn_jd.title}
        </p>
      </div>
      <Ir35SdsForm
        placementId={placementId}
        candidateId={p.candidate_id}
        jdId={p.jd_id}
        existing={existing}
      />
    </div>
  )
}
