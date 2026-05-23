import { createAdminClient }          from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }                   from 'next/navigation'
import TimesheetApproveButton         from '@/components/partner/timesheet-approve-button'

type TimesheetRow = {
  id: string
  period_start: string
  period_end: string
  hours_regular: number
  hours_overtime: number
  status: string
  submitted_at: string | null
  x_ffn_placement: {
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string }
  }
}

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-500',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
}

export default async function PartnerTimesheetsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_super_admin', 'p_hiring_manager'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()

  const { data: placements } = await db
    .from('x_ffn_placement')
    .select('id')
    .eq('tenant_id', tenantId)

  const placementIds = (placements ?? []).map(p => p.id)

  const { data: timesheets } = await db
    .from('x_ffn_timesheet')
    .select(`
      id, period_start, period_end, hours_regular,
      hours_overtime, status, submitted_at,
      x_ffn_placement!inner(
        x_ffn_candidate!inner(first_name, last_name),
        x_ffn_jd!inner(title)
      )
    `)
    .in('placement_id', placementIds.length > 0 ? placementIds : ['00000000-0000-0000-0000-000000000000'])
    .order('submitted_at', { ascending: false })
    .limit(100)

  const rows       = (timesheets ?? []) as unknown as TimesheetRow[]
  const pending    = rows.filter(r => r.status === 'submitted')
  const historical = rows.filter(r => r.status !== 'submitted')

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-bold text-[#0F2147]">Timesheets</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            Awaiting Approval ({pending.length})
          </h2>
          <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Contractor','Role','Period','Regular','Overtime','Total','Action'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map(ts => {
                  const total = (ts.hours_regular ?? 0) + (ts.hours_overtime ?? 0)
                  return (
                    <tr key={ts.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="py-3 px-4 font-medium text-[#111827]">
                        {ts.x_ffn_placement.x_ffn_candidate.first_name}{' '}
                        {ts.x_ffn_placement.x_ffn_candidate.last_name}
                      </td>
                      <td className="py-3 px-4 text-[#374151]">{ts.x_ffn_placement.x_ffn_jd.title}</td>
                      <td className="py-3 px-4 text-xs text-[#6B7280]">
                        {new Date(ts.period_start).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                        {' – '}
                        {new Date(ts.period_end).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                      </td>
                      <td className="py-3 px-4 text-[#374151]">{(ts.hours_regular ?? 0).toFixed(1)}h</td>
                      <td className="py-3 px-4 text-[#374151]">{(ts.hours_overtime ?? 0).toFixed(1)}h</td>
                      <td className="py-3 px-4 font-semibold text-[#0F2147]">{total.toFixed(1)}h</td>
                      <td className="py-3 px-4">
                        <TimesheetApproveButton timesheetId={ts.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {historical.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            History
          </h2>
          <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Contractor','Role','Period','Total','Status','Submitted'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historical.map(ts => (
                  <tr key={ts.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4 font-medium text-[#111827]">
                      {ts.x_ffn_placement.x_ffn_candidate.first_name}{' '}
                      {ts.x_ffn_placement.x_ffn_candidate.last_name}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">{ts.x_ffn_placement.x_ffn_jd.title}</td>
                    <td className="py-3 px-4 text-xs text-[#6B7280]">
                      {new Date(ts.period_start).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                      {' – '}
                      {new Date(ts.period_end).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F2147]">
                      {((ts.hours_regular ?? 0) + (ts.hours_overtime ?? 0)).toFixed(1)}h
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[ts.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ts.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6B7280]">
                      {ts.submitted_at ? new Date(ts.submitted_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No timesheets yet.</p>
        </div>
      )}
    </div>
  )
}