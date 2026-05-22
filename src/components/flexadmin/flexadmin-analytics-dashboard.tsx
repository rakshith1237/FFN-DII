'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Building2, Briefcase, TrendingUp, FileText } from 'lucide-react'

type Kpis = {
  tenants:    { total: number; partners: number; agencies: number; newThisMonth: number }
  jds:        { total: number; active: number; newThisMonth: number }
  placements: { total: number; active: number; newThisMonth: number; momGrowthPct: number | null }
}
type Agency = { agencyId: string; agencyName: string; broadcastCount: number; placementCount: number; fillRate: number }
type Funnel = { stage: string; count: number; dropoffPct: number }
type MonthCount = { month: string; count: number }

type ApiData = {
  kpis:             Kpis
  topAgencies:      Agency[]
  platformFunnel:   Funnel[]
  placementsByMonth: MonthCount[]
}

const FUNNEL_COLORS = ['#0F2147','#1E3A6E','#2D5299','#3B6EC0','#4A8AE8','#60A5FA']

function KpiCard({
  icon: Icon, label, value, sub, highlight,
}: {
  icon:       typeof Building2
  label:      string
  value:      string | number
  sub?:       string
  highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 flex items-start gap-4">
      <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-[#4F46E5]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${highlight ? 'text-green-600' : 'text-[#0F2147]'}`}>{value}</p>
        {sub && <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function FlexAdminAnalyticsDashboard() {
  const [data,    setData]    = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics/flexadmin')
      .then(r => r.json())
      .then((d: ApiData & { error?: string }) => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-[#6B7280]">Loading platform analytics...</p>
    </div>
  )
  if (error) return (
    <div className="p-4 bg-[#FEE2E2] rounded text-sm text-[#991B1B]">{error}</div>
  )
  if (!data) return null

  const { kpis, topAgencies, platformFunnel, placementsByMonth } = data
  const momLabel = kpis.placements.momGrowthPct != null
    ? `${kpis.placements.momGrowthPct >= 0 ? '+' : ''}${kpis.placements.momGrowthPct}% vs last month`
    : undefined

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Tenants"
          value={kpis.tenants.total}
          sub={`${kpis.tenants.partners} partners · ${kpis.tenants.agencies} agencies · +${kpis.tenants.newThisMonth} this month`} />
        <KpiCard icon={FileText} label="Job Descriptions"
          value={kpis.jds.total}
          sub={`${kpis.jds.active} active · +${kpis.jds.newThisMonth} this month`} />
        <KpiCard icon={Briefcase} label="Placements"
          value={kpis.placements.total}
          sub={`${kpis.placements.active} active · +${kpis.placements.newThisMonth} this month`} />
        <KpiCard icon={TrendingUp} label="MoM Growth"
          value={kpis.placements.momGrowthPct != null ? `${kpis.placements.momGrowthPct >= 0 ? '+' : ''}${kpis.placements.momGrowthPct}%` : '—'}
          sub={momLabel}
          highlight={(kpis.placements.momGrowthPct ?? 0) > 0} />
      </div>

      {/* Placements by month */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-bold text-[#374151] mb-4">Placements — Last 6 Months</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={placementsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Placements" fill="#0F2147" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform-wide funnel */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-bold text-[#374151] mb-4">Platform-Wide Submission Funnel</h2>
        <div className="space-y-3">
          {platformFunnel.map((row, i) => (
            <div key={row.stage} className="flex items-center gap-3">
              <div className="w-40 text-xs text-[#6B7280] text-right shrink-0">{row.stage}</div>
              <div className="flex-1 h-8 bg-[#F3F4F6] rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center px-2"
                  style={{
                    width: platformFunnel[0]!.count > 0
                      ? `${Math.max(4, (row.count / platformFunnel[0]!.count) * 100)}%`
                      : '4%',
                    backgroundColor: FUNNEL_COLORS[i] ?? '#0F2147',
                  }}>
                  <span className="text-white text-xs font-bold">{row.count}</span>
                </div>
              </div>
              {i > 0 && row.dropoffPct > 0 && (
                <div className="text-xs text-red-500 w-14 shrink-0 text-right">-{row.dropoffPct}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 agencies */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#374151]">Top 5 Agencies by Fill Rate (Platform-wide)</h2>
        </div>
        {topAgencies.length === 0 ? (
          <p className="p-5 text-sm text-[#9CA3AF]">No agency data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Agency','Broadcasts','Placements','Fill Rate'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topAgencies.map((a, i) => (
                <tr key={a.agencyId} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-[#111827]">{a.agencyName}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#374151]">{a.broadcastCount}</td>
                  <td className="py-3 px-4 text-[#374151]">{a.placementCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${a.fillRate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-[#374151]">{a.fillRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
