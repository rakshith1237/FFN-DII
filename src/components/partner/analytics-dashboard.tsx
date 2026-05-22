'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, FunnelChart, Funnel, LabelList,
  ResponsiveContainer,
} from 'recharts'

type AgencyRow = {
  agencyId: string; agencyName: string
  broadcastCount: number; placementCount: number
  submissionCount: number; fillRate: number
  rtrApprovalRate: number; qualityRate: number
}
type FillMonth  = { month: string; placements: number; published: number }
type TTFRow     = { employmentType: string; p50Days: number; p90Days: number; count: number }
type FunnelRow  = { stage: string; count: number; dropoffPct: number }

const FUNNEL_COLORS = ['#0F2147','#1E3A6E','#2D5299','#3B6EC0','#4A8AE8','#60A5FA']

export function AnalyticsDashboard() {
  const [agencies, setAgencies] = useState<AgencyRow[]>([])
  const [fillRate, setFillRate] = useState<FillMonth[]>([])
  const [ttf,      setTtf]      = useState<TTFRow[]>([])
  const [funnel,   setFunnel]   = useState<FunnelRow[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/agency-scorecard').then(r => r.json()),
      fetch('/api/analytics/fill-rate').then(r => r.json()),
      fetch('/api/analytics/time-to-fill').then(r => r.json()),
      fetch('/api/analytics/submission-funnel').then(r => r.json()),
    ]).then(([a, f, t, fn]) => {
      setAgencies(a.data ?? [])
      setFillRate(f.data ?? [])
      setTtf(t.data ?? [])
      setFunnel(fn.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-[#6B7280]">Loading analytics...</p>
    </div>
  )

  return (
    <div className="space-y-8">

      {/* Submission Funnel */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
        <h2 className="text-sm font-bold text-[#374151] mb-4">Submission Funnel</h2>
        {funnel.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {funnel.map((row, i) => (
              <div key={row.stage} className="flex items-center gap-3">
                <div className="w-36 text-xs text-[#6B7280] text-right">{row.stage}</div>
                <div className="flex-1 h-8 bg-[#F3F4F6] rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center px-2 transition-all"
                    style={{
                      width: (funnel[0]?.count ?? 0) > 0 ? `${Math.max(4, (row.count / (funnel[0]?.count ?? 1)) * 100)}%` : '4%',
                      backgroundColor: FUNNEL_COLORS[i] ?? '#0F2147',
                    }}
                  >
                    <span className="text-white text-xs font-bold">{row.count}</span>
                  </div>
                </div>
                {i > 0 && row.dropoffPct > 0 && (
                  <div className="text-xs text-red-500 w-16">-{row.dropoffPct}%</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fill Rate Line Chart */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
        <h2 className="text-sm font-bold text-[#374151] mb-4">Fill Rate — Last 12 Months</h2>
        {fillRate.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={fillRate} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="placements" name="Placements" stroke="#0F2147" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="published"  name="JDs Published" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Time-to-Fill */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
        <h2 className="text-sm font-bold text-[#374151] mb-4">Time-to-Fill by Employment Type (days)</h2>
        {ttf.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No placement data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ttf} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="employmentType" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="p50Days" name="P50 (days)" fill="#0F2147" radius={[3,3,0,0]} />
              <Bar dataKey="p90Days" name="P90 (days)" fill="#93C5FD" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Agency Scorecard */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <h2 className="text-sm font-bold text-[#374151]">Agency Scorecard</h2>
        </div>
        {agencies.length === 0 ? (
          <p className="p-6 text-sm text-[#9CA3AF]">No agency data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Agency','Broadcasts','Submissions','Placements','Fill Rate','RTR Approval','Quality Rate'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agencies.map(a => (
                <tr key={a.agencyId} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-medium text-[#111827]">{a.agencyName}</td>
                  <td className="py-3 px-4 text-[#374151]">{a.broadcastCount}</td>
                  <td className="py-3 px-4 text-[#374151]">{a.submissionCount}</td>
                  <td className="py-3 px-4 text-[#374151]">{a.placementCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full">
                        <div className="h-full bg-green-500 rounded-full"
                          style={{ width: `${a.fillRate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-[#374151]">{a.fillRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#374151]">{a.rtrApprovalRate}%</td>
                  <td className="py-3 px-4 text-[#374151]">{a.qualityRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pt-4 border-t border-[#E5E7EB] text-center">
        <a href="/partner/analytics/market-rate"
          className="text-sm text-[#0F2147] font-semibold underline hover:no-underline">
          View Market Rate Intelligence →
        </a>
      </div>
    </div>
  )
}
