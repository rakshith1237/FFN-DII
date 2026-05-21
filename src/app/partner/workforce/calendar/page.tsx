import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

type CalendarEvent = {
  date: string
  type: 'contract_end' | 'extension' | 'headcount_start'
  label: string
}

const TYPE_STYLE = {
  contract_end:    { dot: 'bg-red-500',   legend: 'Contract Ending' },
  extension:       { dot: 'bg-amber-500', legend: 'Extension' },
  headcount_start: { dot: 'bg-green-500', legend: 'Planned Start' },
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1 // Mon start
  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default async function WorkforceCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const sp    = await searchParams
  const today = new Date()
  const year  = parseInt(sp.year  ?? String(today.getFullYear()))
  const month = parseInt(sp.month ?? String(today.getMonth()))

  const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
  const monthEnd   = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const db = createAdminClient()
  const events: CalendarEvent[] = []

  const [placements, extensions, headcounts] = await Promise.all([
    db.from('x_ffn_placement')
      .select('id, end_date')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gte('end_date', monthStart)
      .lte('end_date', monthEnd),
    db.from('x_ffn_contract_extension')
      .select('id, new_end_date, placement_id')
      .eq('tenant_id', tenantId)
      .gte('new_end_date', monthStart)
      .lte('new_end_date', monthEnd),
    db.from('x_ffn_approved_headcount')
      .select('id, target_start_date, role')
      .eq('tenant_id', tenantId)
      .gte('target_start_date', monthStart)
      .lte('target_start_date', monthEnd),
  ])

  for (const p of placements.data ?? []) {
    if (p.end_date) events.push({ date: p.end_date, type: 'contract_end', label: 'Contract End' })
  }
  for (const e of extensions.data ?? []) {
    if (e.new_end_date) events.push({ date: e.new_end_date, type: 'extension', label: 'Extension' })
  }
  for (const h of headcounts.data ?? []) {
    if (h.target_start_date) events.push({ date: h.target_start_date, type: 'headcount_start', label: h.role ?? 'Start' })
  }

  const eventMap: Record<number, CalendarEvent[]> = {}
  for (const ev of events) {
    const day = new Date(ev.date).getDate()
    if (!eventMap[day]) eventMap[day] = []
    eventMap[day].push(ev)
  }

  const cells = buildCalendarGrid(year, month)
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear  = month === 0 ? year - 1 : year
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear  = month === 11 ? year + 1 : year

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Workforce Calendar</h1>
        <div className="flex items-center gap-3">
          <a href={`/partner/workforce/calendar?year=${prevYear}&month=${prevMonth}`}
            className="px-3 py-1.5 text-sm border border-[#D1D5DB] rounded hover:bg-[#F9FAFB]">
            ← Prev
          </a>
          <span className="text-sm font-semibold text-[#374151] w-24 text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <a href={`/partner/workforce/calendar?year=${nextYear}&month=${nextMonth}`}
            className="px-3 py-1.5 text-sm border border-[#D1D5DB] rounded hover:bg-[#F9FAFB]">
            Next →
          </a>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {Object.entries(TYPE_STYLE).map(([type, s]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <span className="text-xs text-[#6B7280]">{s.legend}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#E5E7EB]">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-[#6B7280] uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
            const dayEvents = day !== null ? (eventMap[day] ?? []) : []
            return (
              <div key={i} className={`min-h-[80px] p-2 border-r border-b border-[#F3F4F6] last:border-r-0 ${!day ? 'bg-[#F9FAFB]' : ''}`}>
                {day && (
                  <>
                    <span className={`text-xs font-medium ${isToday ? 'bg-[#0F2147] text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-[#374151]'}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TYPE_STYLE[ev.type].dot}`} />
                          <span className="text-[10px] text-[#6B7280] truncate">{ev.label}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-[#9CA3AF]">+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
