'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { submitTimesheet } from '@/lib/actions/timesheet/submit-timesheet'

const DAYS = [
  { key: 'hoursMon' as const, label: 'Mon' },
  { key: 'hoursTue' as const, label: 'Tue' },
  { key: 'hoursWed' as const, label: 'Wed' },
  { key: 'hoursThu' as const, label: 'Thu' },
  { key: 'hoursFri' as const, label: 'Fri' },
]

export default function NewTimesheetPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const placementId  = searchParams.get('placementId') ?? ''

  const [weekStart, setWeekStart]   = useState('')
  const [hours, setHours]           = useState<Record<string, string>>({
    hoursMon: '0', hoursTue: '0', hoursWed: '0', hoursThu: '0', hoursFri: '0',
  })
  const [overtime,    setOvertime]  = useState('0')
  const [description, setDesc]      = useState('')
  const [error,       setError]     = useState<string | null>(null)
  const [isPending, startTransition]= useTransition()

  const regularTotal = DAYS.reduce((s, d) => s + (parseFloat(hours[d.key] ?? '0') || 0), 0)
  const grandTotal   = regularTotal + (parseFloat(overtime) || 0)

  function handleSubmit() {
    setError(null)
    if (!weekStart)     { setError('Please select the week start date (Monday)'); return }
    if (!placementId)   { setError('No placement selected'); return }
    if (grandTotal <= 0){ setError('Total hours must be greater than 0'); return }

    startTransition(async () => {
      const result = await submitTimesheet({
        placementId,
        weekStart,
        hoursMon:      parseFloat(hours.hoursMon ?? '0') || 0,
        hoursTue:      parseFloat(hours.hoursTue ?? '0') || 0,
        hoursWed:      parseFloat(hours.hoursWed ?? '0') || 0,
        hoursThu:      parseFloat(hours.hoursThu ?? '0') || 0,
        hoursFri:      parseFloat(hours.hoursFri ?? '0') || 0,
        hoursOvertime: parseFloat(overtime) || 0,
        description:   description.trim() || null,
      })
      if (result.error) { setError(result.error); return }
      router.push('/agency/timesheets')
    })
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Submit Timesheet</h1>
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 space-y-5">

        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Week Starting (Monday) *</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-2">Daily Hours</label>
          <div className="grid grid-cols-5 gap-2">
            {DAYS.map(d => (
              <div key={d.key} className="text-center">
                <p className="text-xs text-[#6B7280] mb-1">{d.label}</p>
                <input
                  type="number" min="0" max="24" step="0.5"
                  value={hours[d.key]}
                  onChange={e => setHours(prev => ({ ...prev, [d.key]: e.target.value }))}
                  className="w-full h-10 text-center text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[#6B7280]">
            <span>Regular: {regularTotal.toFixed(1)}h</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Overtime Hours</label>
          <input type="number" min="0" step="0.5" value={overtime}
            onChange={e => setOvertime(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
        </div>

        <div className="p-3 bg-[#F0F4FF] rounded-lg flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0F2147]">Total Hours</span>
          <span className="text-lg font-bold text-[#0F2147]">{grandTotal.toFixed(1)}h</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Description / Notes</label>
          <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)}
            placeholder="Work completed this week..."
            className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
        </div>

        {error && <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>}

        <button onClick={handleSubmit} disabled={isPending || !placementId}
          className="w-full py-3 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
          {isPending ? 'Submitting...' : 'Submit Timesheet'}
        </button>
      </div>
    </div>
  )
}
