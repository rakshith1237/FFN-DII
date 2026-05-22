import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { CheckCircle, XCircle, Lock } from 'lucide-react'

const RATING_LABEL: Record<string, string> = {
  exceptional:        '⭐⭐⭐⭐⭐  Exceptional',
  good:               '⭐⭐⭐⭐  Good',
  satisfactory:       '⭐⭐⭐  Satisfactory',
  below_expectations: '⭐⭐  Below Expectations',
  unsatisfactory:     '⭐  Unsatisfactory',
}

export default async function ConclusionSummaryPage({
  params,
}: {
  params: Promise<{ placementId: string }>
}) {
  const { placementId } = await params
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')

  const db = createAdminClient()

  const { data: summary } = await db
    .from('x_ffn_conclusion_summary')
    .select(`
      *,
      x_ffn_placement!inner (
        bill_rate, currency, rate_model, payment_terms, start_date, end_date,
        x_ffn_candidate!inner ( first_name, last_name ),
        x_ffn_jd!inner ( title, number )
      )
    `)
    .eq('placement_id', placementId)
    .maybeSingle()

  if (!summary) {
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-xl font-bold text-[#0F2147] mb-2">Conclusion Summary</h1>
        <p className="text-sm text-[#6B7280]">No conclusion summary yet. Conclude the engagement to generate this record.</p>
      </div>
    )
  }

  const { data: offboardingTasks } = await db
    .from('x_ffn_offboarding_task')
    .select('task_name, status, due_date, completed_at, task_type')
    .eq('placement_id', placementId)
    .order('sort_order')

  const { data: tenureSummary } = await db
    .from('x_ffn_tenure_summary')
    .select('total_days_active, total_placements, is_near_threshold, is_at_threshold, threshold_days')
    .eq('candidate_id', summary.candidate_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const s = summary as typeof summary & {
    x_ffn_placement: {
      bill_rate: number; currency: string; rate_model: string; payment_terms: string
      start_date: string; end_date: string | null
      x_ffn_candidate: { first_name: string; last_name: string }
      x_ffn_jd: { title: string; number: string }
    }
  }

  const conclusionTypeLabel = s.conclusion_type === 'natural_end' ? 'Completed' : 'Terminated Early'
  const isCompleted = s.conclusion_type === 'natural_end'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0F2147]">
              {s.x_ffn_placement.x_ffn_jd.number}
            </h1>
            <p className="text-base text-[#374151] mt-0.5">
              {s.x_ffn_placement.x_ffn_candidate.first_name} {s.x_ffn_placement.x_ffn_candidate.last_name}
            </p>
            <p className="text-sm text-[#6B7280] mt-0.5">{s.x_ffn_placement.x_ffn_jd.title}</p>
            <span className={`mt-2 inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              isCompleted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {conclusionTypeLabel}
            </span>
          </div>
          <div className="text-right text-sm text-[#374151]">
            <p className="text-xs text-[#9CA3AF] mb-0.5">Conclusion Date</p>
            <p className="font-semibold">
              {s.conclusion_date ? new Date(s.conclusion_date).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-bold text-[#0F2147] mb-4">Financial Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase mb-2">Engagement</p>
            {[
              ['Total Days Active',  s.total_days_active ?? 0],
              ['Total Hours Worked', `${Number(s.total_hours_worked ?? 0).toFixed(1)}h`],
              ['Effective Rate',     s.total_hours_worked > 0
                ? `${s.x_ffn_placement.currency} ${(Number(s.total_invoiced) / Number(s.total_hours_worked)).toFixed(2)}/h`
                : '—'],
            ].map(([label, value]) => (
              <div key={label as string} className="mb-2">
                <p className="text-xs text-[#6B7280]">{label}</p>
                <p className="text-sm font-semibold text-[#374151]">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase mb-2">Invoicing</p>
            {[
              ['Total Invoiced', `${s.x_ffn_placement.currency} ${Number(s.total_invoiced ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
              ['Total Paid',     `${s.x_ffn_placement.currency} ${Number(s.total_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
              ['Pending',        `${s.x_ffn_placement.currency} ${Number(s.pending_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
            ].map(([label, value]) => (
              <div key={label as string} className="mb-2">
                <p className="text-xs text-[#6B7280]">{label}</p>
                <p className={`text-sm font-semibold ${label === 'Pending' && Number(s.pending_amount) > 0 ? 'text-amber-600' : 'text-[#374151]'}`}>{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase mb-2">Contract Terms</p>
            {[
              ['Bill Rate',      `${s.x_ffn_placement.currency} ${Number(s.x_ffn_placement.bill_rate).toLocaleString()}/${s.x_ffn_placement.rate_model.charAt(0)}`],
              ['Rate Model',     s.x_ffn_placement.rate_model],
              ['Payment Terms',  s.x_ffn_placement.payment_terms.replace('_', ' ')],
            ].map(([label, value]) => (
              <div key={label as string} className="mb-2">
                <p className="text-xs text-[#6B7280]">{label}</p>
                <p className="text-sm font-semibold text-[#374151] capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Offboarding Status */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-bold text-[#0F2147] mb-4">
          Offboarding Status
          <span className="ml-2 text-xs font-normal text-[#6B7280]">
            {(offboardingTasks ?? []).filter(t => t.status === 'completed').length} / {(offboardingTasks ?? []).length} complete
          </span>
        </h2>
        <div className="space-y-2">
          {(offboardingTasks ?? []).map(task => {
            const done = task.status === 'completed'
            const mandatory = ['system_access_revocation','asset_return','compliance'].includes(task.task_type)
            return (
              <div key={task.task_name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                  done ? 'bg-green-50 border-green-200' :
                  mandatory ? 'bg-red-50 border-red-200' : 'bg-[#F9FAFB] border-[#E5E7EB]'
                }`}>
                {done
                  ? <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
                  : mandatory
                    ? <Lock size={15} className="text-red-500 flex-shrink-0" />
                    : <XCircle size={15} className="text-[#9CA3AF] flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#374151]">{task.task_name}</p>
                  {task.due_date && (
                    <p className="text-xs text-[#9CA3AF]">Due: {new Date(task.due_date).toLocaleDateString('en-GB')}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {task.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tenure + Compliance */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-bold text-[#0F2147] mb-4">Tenure & Compliance</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            ['This Engagement', `${s.total_days_active ?? 0} days`],
            ['Total Tenure',    `${tenureSummary?.total_days_active ?? s.tenure_total_days ?? 0} days`],
            ['Placements',      String(tenureSummary?.total_placements ?? 1)],
          ].map(([label, value]) => (
            <div key={label as string} className="p-3 bg-[#F9FAFB] rounded-lg text-center">
              <p className="text-xs text-[#9CA3AF]">{label}</p>
              <p className="text-lg font-bold text-[#374151] mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        {tenureSummary?.is_at_threshold ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>Break recommended.</strong> Total tenure of {tenureSummary.total_days_active} days has reached the {tenureSummary.threshold_days}-day threshold. Review co-employment obligations.
          </div>
        ) : tenureSummary?.is_near_threshold ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            Approaching threshold: {tenureSummary.total_days_active} of {tenureSummary.threshold_days} days. Monitor engagement status.
          </div>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            ✓ Below co-employment threshold
          </div>
        )}
      </div>

      {/* Performance Rating */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-bold text-[#0F2147] mb-3">Performance Rating</h2>
        {s.performance_rating ? (
          <div>
            <p className="text-sm font-semibold text-[#374151]">
              {RATING_LABEL[s.performance_rating] ?? s.performance_rating}
            </p>
            {s.rehire_eligible !== null && (
              <p className="text-xs text-[#6B7280] mt-2">
                Re-engagement eligible: <strong>{s.rehire_eligible ? 'Yes' : 'No'}</strong>
                {s.rehire_notes && ` — ${s.rehire_notes}`}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No performance rating recorded for this engagement.</p>
        )}
      </div>
    </div>
  )
}
