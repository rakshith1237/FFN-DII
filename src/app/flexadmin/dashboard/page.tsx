import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { DashboardCharts } from '@/components/flexadmin/dashboard-charts'

async function getKpis() {
  const db = createAdminClient()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalTenants },
    { count: activePlacements },
    { count: openJds },
    { count: submissionsThisMonth },
    { count: onBenchCandidates },
    { count: pendingOverrides },
  ] = await Promise.all([
    db.from('x_ffn_tenant').select('*', { count: 'exact', head: true }),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('x_ffn_jd').select('*', { count: 'exact', head: true }).in('status', ['active','broadcast']),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
    db.from('x_ffn_candidate').select('*', { count: 'exact', head: true }).eq('bench_status', 'on_bench'),
    db.from('x_ffn_override_request').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
  ])

  return { totalTenants, activePlacements, openJds, submissionsThisMonth, onBenchCandidates, pendingOverrides }
}

async function getPlacementTrend() {
  const db = createAdminClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await db
    .from('x_ffn_placement')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  const monthMap: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap[key] = (monthMap[key] ?? 0) + 1
  }

  const months: { month: string; placements: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ month: key, placements: monthMap[key] ?? 0 })
  }
  return months
}

const KPI_DEFS = [
  { label: 'Total Tenants',          key: 'totalTenants',         color: 'text-[#0F2147]' },
  { label: 'Active Placements',      key: 'activePlacements',     color: 'text-green-600'  },
  { label: 'Open JDs',               key: 'openJds',              color: 'text-blue-600'   },
  { label: 'Submissions This Month', key: 'submissionsThisMonth', color: 'text-purple-600' },
  { label: 'On Bench',               key: 'onBenchCandidates',    color: 'text-amber-600'  },
  { label: 'Pending Overrides',      key: 'pendingOverrides',     color: 'text-red-600'    },
] as const

export default async function FlexAdminDashboardPage() {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  const [kpis, trend] = await Promise.all([getKpis(), getPlacementTrend()])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#0F2147]">FlexAdmin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPI_DEFS.map(kpi => (
          <div key={kpi.key} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#6B7280] font-medium mb-1">{kpi.label}</p>
            <p className={`text-3xl font-bold ${kpi.color}`}>
              {kpis[kpi.key as keyof typeof kpis] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <h2 className="text-sm font-semibold text-[#374151] mb-4">Placements — Last 6 Months</h2>
        <DashboardCharts data={trend} />
      </div>
    </div>
  )
}
