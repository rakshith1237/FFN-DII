import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import Link                    from 'next/link'
import { AlertTriangle }       from 'lucide-react'
import { PlacementsActions }   from '@/components/partner/placements-actions'

export default async function EngagementPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()

  const { data: placements } = await db
    .from('x_ffn_placement')
    .select(`
      id, status, start_date, end_date, bill_rate, currency,
      x_ffn_candidate!inner ( first_name, last_name ),
      x_ffn_jd!inner ( title, number ),
      x_ffn_tenant!x_ffn_placement_agency_tenant_id_fkey ( name )
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['active','pre_start'])
    .order('start_date', { ascending: true })

  const placementIds = (placements ?? []).map(p => p.id)

  const [{ data: timesheets }, { data: invoices }, { data: alerts }] = await Promise.all([
    placementIds.length > 0
      ? db.from('x_ffn_timesheet').select('placement_id, status, period_start').in('placement_id', placementIds).order('period_start', { ascending: false })
      : Promise.resolve({ data: [] }),
    placementIds.length > 0
      ? db.from('x_ffn_invoice').select('placement_id, total_amount, currency, status').in('placement_id', placementIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    placementIds.length > 0
      ? db.from('x_ffn_engagement_alert').select('placement_id').eq('is_actioned', false).in('placement_id', placementIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build lookup maps
  const latestTs:      Record<string, { status: string; period_start: string }> = {}
  const latestInv:     Record<string, { total_amount: number; currency: string; status: string }> = {}
  const alertCount:    Record<string, number> = {}

  for (const t of timesheets ?? []) {
    if (!latestTs[t.placement_id]) latestTs[t.placement_id] = { status: t.status, period_start: t.period_start }
  }
  for (const i of invoices ?? []) {
    if (!latestInv[i.placement_id]) latestInv[i.placement_id] = { total_amount: i.total_amount, currency: i.currency, status: i.status }
  }
  for (const a of alerts ?? []) {
    alertCount[a.placement_id] = (alertCount[a.placement_id] ?? 0) + 1
  }

  type PlacementRow = {
    id: string; status: string; start_date: string; end_date: string | null
    bill_rate: number; currency: string
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string; number: string }
    x_ffn_tenant: { name: string } | null
  }

  const rows = (placements ?? []) as unknown as PlacementRow[]

  const TS_STYLE: Record<string, string> = {
    submitted: 'text-amber-600', approved: 'text-green-600',
    rejected:  'text-red-600',   draft:    'text-gray-400',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F2147]">Active Engagements</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {rows.length} active Ãƒâ€šÃ‚Â· {Object.values(alertCount).reduce((s, n) => s + n, 0)} unactioned alerts
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No active engagements.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Contractor','Agency','Role','Start','End','Days Left','Rate','Last Timesheet','Last Invoice','Alerts','Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-[#9CA3AF] uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const ts  = latestTs[p.id]
                const inv = latestInv[p.id]
                const ac  = alertCount[p.id] ?? 0
                return (
                  <tr key={p.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-3 font-medium text-[#111827] whitespace-nowrap">
                      {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name}
                    </td>
                    <td className="py-3 px-3 text-[#6B7280] whitespace-nowrap">{p.x_ffn_tenant?.name ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                    <td className="py-3 px-3 text-[#374151]">{p.x_ffn_jd.title}</td>
                    <td className="py-3 px-3 text-[#374151] whitespace-nowrap">{new Date(p.start_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-3 px-3 text-[#374151] whitespace-nowrap">{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#374151]">{p.currency} {Number(p.bill_rate).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      {ts ? (
                        <span className={`text-xs font-medium ${TS_STYLE[ts.status] ?? 'text-gray-500'}`}>
                          {ts.status} Ãƒâ€šÃ‚Â· {new Date(ts.period_start).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                        </span>
                      ) : <span className="text-xs text-[#9CA3AF]">None</span>}
                    </td>
                    <td className="py-3 px-3">
                      {inv ? (
                        <span className="text-xs text-[#374151]">
                          {inv.currency} {Number(inv.total_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      ) : <span className="text-xs text-[#9CA3AF]">None</span>}
                    </td>
                    <td className="py-3 px-3">
                      {ac > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                          <AlertTriangle size={12} /> {ac}
                        </span>
                      ) : <span className="text-xs text-[#9CA3AF]">ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/partner/placements/${p.id}/onboarding`}
                          className="text-xs text-[#0F2147] underline hover:no-underline">Tasks</Link>
                        <Link href={`/partner/placements/${p.id}/extension`}
                          className="text-xs text-[#0F2147] underline hover:no-underline">Extend</Link>
                        <PlacementsActions
                          placementId={p.id}
                          candidateName={`${p.x_ffn_candidate.first_name} ${p.x_ffn_candidate.last_name}`}
                          jdTitle={p.x_ffn_jd.title}
                          endDate={p.end_date}
                          startDate={p.start_date}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
