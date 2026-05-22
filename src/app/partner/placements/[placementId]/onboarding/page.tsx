import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { OnboardingTaskList }  from '@/components/partner/onboarding-task-list'
import { activatePlacement }   from '@/lib/actions/compliance/activate-placement'

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ placementId: string }>
}) {
  const { placementId } = await params
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    redirect('/partner/dashboard')
  }

  const db = createAdminClient()

  const { data: placement } = await db
    .from('x_ffn_placement')
    .select(`
      id, status, start_date, end_date, bill_rate, currency,
      x_ffn_candidate!inner ( first_name, last_name, email ),
      x_ffn_jd!inner ( title, number )
    `)
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!placement) redirect('/partner/dashboard')

  const { data: tasks } = await db
    .from('x_ffn_onboarding_task')
    .select('id, task_name, task_description, task_type, status, blocks_start, due_date, completed_at')
    .eq('placement_id', placementId)
    .order('blocks_start', { ascending: false })
    .order('due_date', { ascending: true })

  const { data: documents } = await db
    .from('x_ffn_onboarding_document')
    .select('id, task_id, document_type, original_name, expiry_date, verified_at')
    .eq('placement_id', placementId)

  const p = placement as unknown as {
    id: string; status: string; start_date: string; end_date: string | null
    bill_rate: number; currency: string
    x_ffn_candidate: { first_name: string; last_name: string; email: string }
    x_ffn_jd: { title: string; number: string }
  }

  const p1Tasks = (tasks ?? []).filter(t => t.blocks_start)
  const p2Tasks = (tasks ?? []).filter(t => !t.blocks_start)
  const allP1Done = p1Tasks.length > 0 && p1Tasks.every(t => ['completed','waived','not_applicable'].includes(t.status))
  const canActivate = allP1Done && p.status === 'pre_start'

  void activatePlacement

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Pre-Start Onboarding</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name} · {p.x_ffn_jd.title}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280]">
          <span>Start: {p.start_date ? new Date(p.start_date).toLocaleDateString('en-GB') : '—'}</span>
          <span>·</span>
          <span>Rate: {p.currency} {Number(p.bill_rate).toLocaleString()}</span>
          <span>·</span>
          <span className={`font-semibold ${p.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
            {p.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* P1 progress bar */}
      {p1Tasks.length > 0 && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[#374151]">Mandatory Tasks (P1)</p>
            <p className="text-xs text-[#6B7280]">
              {p1Tasks.filter(t => ['completed','waived'].includes(t.status)).length} / {p1Tasks.length} complete
            </p>
          </div>
          <div className="w-full h-2 bg-[#E5E7EB] rounded-full">
            <div
              className={`h-full rounded-full transition-all ${allP1Done ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${p1Tasks.length > 0 ? (p1Tasks.filter(t => ['completed','waived'].includes(t.status)).length / p1Tasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <OnboardingTaskList
        placementId={placementId}
        p1Tasks={p1Tasks}
        p2Tasks={p2Tasks}
        documents={documents ?? []}
        canActivate={canActivate}
        isAlreadyActive={p.status === 'active'}
        persona={persona}
      />
    </div>
  )
}
