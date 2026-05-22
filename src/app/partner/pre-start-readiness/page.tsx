import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import Link                    from 'next/link'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

type ReadinessLevel = 'green' | 'amber' | 'red'

function computeReadiness(
  tasks: { blocks_start: boolean; status: string }[]
): ReadinessLevel {
  const p1 = tasks.filter(t => t.blocks_start)
  if (p1.length === 0) return 'amber'
  const done = p1.filter(t => ['completed','waived','not_applicable'].includes(t.status))
  if (done.length === p1.length) return 'green'
  if (done.length === 0) return 'red'
  return 'amber'
}

const READINESS_CONFIG = {
  green: { label: 'Ready',          icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  amber: { label: 'In Progress',    icon: AlertCircle,   color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  red:   { label: 'Not Started',    icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50 border-red-200'     },
}

export default async function PreStartReadinessPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    redirect('/partner/dashboard')
  }

  const db = createAdminClient()
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

  const { data: placements } = await db
    .from('x_ffn_placement')
    .select(`
      id, status, start_date, end_date, bill_rate, currency,
      x_ffn_candidate!inner ( first_name, last_name ),
      x_ffn_jd!inner ( title, number )
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['pre_start','active'])
    .gte('start_date', new Date().toISOString().split('T')[0])
    .lte('start_date', thirtyDaysOut.toISOString().split('T')[0])
    .order('start_date', { ascending: true })

  // Fetch all tasks for these placements
  const placementIds = (placements ?? []).map(p => p.id)
  const { data: allTasks } = placementIds.length > 0
    ? await db.from('x_ffn_onboarding_task')
        .select('placement_id, blocks_start, status')
        .in('placement_id', placementIds)
    : { data: [] }

  type PlacementRow = {
    id: string; status: string; start_date: string
    bill_rate: number; currency: string
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string; number: string }
  }

  const rows = (placements ?? []) as unknown as PlacementRow[]
  const tasksByPlacement: Record<string, { blocks_start: boolean; status: string }[]> = {}
  for (const t of allTasks ?? []) {
    const arr = tasksByPlacement[t.placement_id] ?? []
    tasksByPlacement[t.placement_id] = arr
    arr.push({ blocks_start: t.blocks_start, status: t.status })
  }

  const readinessCounts = { green: 0, amber: 0, red: 0 }
  for (const p of rows) {
    const r = computeReadiness(tasksByPlacement[p.id] ?? [])
    readinessCounts[r]++
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F2147]">Pre-Start Readiness</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Placements starting within the next 30 days</p>
        </div>
        <div className="flex gap-3">
          {(['green','amber','red'] as const).map(level => {
            const cfg = READINESS_CONFIG[level]
            const Icon = cfg.icon
            return (
              <div key={level} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                <Icon size={13} />
                {readinessCounts[level]} {cfg.label}
              </div>
            )
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No placements starting in the next 30 days.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map(p => {
            const tasks   = tasksByPlacement[p.id] ?? []
            const level   = computeReadiness(tasks)
            const cfg     = READINESS_CONFIG[level]
            const Icon    = cfg.icon
            const p1      = tasks.filter(t => t.blocks_start)
            const p1Done  = p1.filter(t => ['completed','waived','not_applicable'].includes(t.status))
            const daysOut = Math.ceil((new Date(p.start_date).getTime() - Date.now()) / 86400000)

            return (
              <div key={p.id}
                className={`bg-white rounded-lg border-2 ${level === 'green' ? 'border-green-200' : level === 'amber' ? 'border-amber-200' : 'border-red-200'} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[#111827]">
                        {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name}
                      </p>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#6B7280]">{p.x_ffn_jd.title} · {p.x_ffn_jd.number}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#9CA3AF]">
                      <span>
                        Start: {new Date(p.start_date).toLocaleDateString('en-GB')}
                        {' '}({daysOut === 0 ? 'Today' : `${daysOut}d`})
                      </span>
                      <span>·</span>
                      <span>{p.currency} {Number(p.bill_rate).toLocaleString()}/day</span>
                      {tasks.length > 0 && (
                        <>
                          <span>·</span>
                          <span className={p1Done.length === p1.length ? 'text-green-600' : 'text-amber-600'}>
                            {p1Done.length}/{p1.length} P1 done
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/partner/placements/${p.id}/onboarding`}
                    className="flex-shrink-0 px-4 py-2 bg-[#0F2147] text-white text-xs font-semibold rounded-lg hover:bg-[#1a3460] transition-colors"
                  >
                    Manage →
                  </Link>
                </div>

                {/* P1 task mini-progress */}
                {p1.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
                    <div className="flex gap-2 flex-wrap">
                      {p1.map((t, i) => (
                        <div key={i}
                          className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                            ['completed','waived'].includes(t.status)
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                          {t.status === 'completed' ? '✓' : '○'} {t.blocks_start ? 'P1' : 'P2'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
