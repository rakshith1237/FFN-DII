import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

type WorkerHealth = {
  status:  string
  queues?: Record<string, { waiting: number; active: number; completed: number; failed: number }>
}

async function fetchWorkerHealth(): Promise<WorkerHealth | null> {
  const url = process.env.WORKER_HEALTH_URL
  if (!url) return null
  try {
    const res = await fetch(`${url}/health`, { next: { revalidate: 30 } })
    if (!res.ok) return null
    return res.json() as Promise<WorkerHealth>
  } catch {
    return null
  }
}

async function getResponseTimeProxy() {
  const db = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
  const { data } = await db
    .from('x_ffn_audit_log')
    .select('created_at')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(100)

  const count = data?.length ?? 0
  return { actionsLastHour: count, avgPerMinute: (count / 60).toFixed(1) }
}

export default async function HealthPage() {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  const [workerHealth, auditProxy] = await Promise.all([
    fetchWorkerHealth(),
    getResponseTimeProxy(),
  ])

  const workerOk = workerHealth?.status === 'ok' || workerHealth?.status === 'healthy'

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#0F2147]">System Health</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#6B7280] font-medium mb-1">Worker Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${workerHealth ? (workerOk ? 'bg-green-500' : 'bg-amber-400') : 'bg-red-500'}`} />
            <span className="text-sm font-semibold text-[#374151]">
              {workerHealth ? (workerOk ? 'Healthy' : 'Degraded') : 'Unreachable'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#6B7280] font-medium mb-1">Actions Last Hour</p>
          <p className="text-3xl font-bold text-[#0F2147]">{auditProxy.actionsLastHour}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#6B7280] font-medium mb-1">Avg Actions / Min</p>
          <p className="text-3xl font-bold text-[#374151]">{auditProxy.avgPerMinute}</p>
        </div>
      </div>

      {workerHealth?.queues && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <h2 className="text-sm font-semibold text-[#374151]">Queue Depths</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Queue','Waiting','Active','Completed','Failed'].map(h => (
                  <th key={h} className="text-left py-2 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(workerHealth.queues).map(([name, stats]) => (
                <tr key={name} className="border-b border-[#F3F4F6]">
                  <td className="py-2 px-4 font-mono text-xs text-[#374151]">{name}</td>
                  <td className="py-2 px-4 text-[#374151]">{stats.waiting}</td>
                  <td className="py-2 px-4 text-[#374151]">{stats.active}</td>
                  <td className="py-2 px-4 text-green-600">{stats.completed}</td>
                  <td className="py-2 px-4">
                    <span className={stats.failed > 0 ? 'text-red-600 font-semibold' : 'text-[#374151]'}>{stats.failed}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!workerHealth && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Worker health endpoint unreachable. Set <code className="font-mono text-xs bg-amber-100 px-1 rounded">WORKER_HEALTH_URL</code> in Vercel environment variables.
        </div>
      )}
    </div>
  )
}
