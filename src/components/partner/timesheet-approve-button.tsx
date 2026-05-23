'use client'
import { useState, useTransition } from 'react'
import { approveTimesheet, rejectTimesheet } from '@/lib/actions/timesheet/approve-reject-timesheet'

export default function TimesheetApproveButton({ timesheetId }: { timesheetId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done,      setDone]      = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason,    setReason]    = useState('')
  const [error,     setError]     = useState<string | null>(null)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveTimesheet(timesheetId)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  function handleReject() {
    if (!rejecting) { setRejecting(true); return }
    if (reason.trim().length < 5) { setError('Reason required (min 5 chars)'); return }
    setError(null)
    startTransition(async () => {
      const result = await rejectTimesheet(timesheetId, reason.trim())
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  if (done) return <span className="text-xs text-green-600 font-medium">Done</span>

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rejecting && (
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Rejection reason..."
          className="text-xs border border-[#D1D5DB] rounded px-2 py-1 focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
        />
      )}
      <div className="flex gap-2">
        {!rejecting && (
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="px-3 py-1 text-xs font-semibold bg-[#16A34A] text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '...' : 'Approve'}
          </button>
        )}
        <button
          onClick={handleReject}
          disabled={isPending}
          className="px-3 py-1 text-xs font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '...' : rejecting ? 'Confirm' : 'Reject'}
        </button>
        {rejecting && (
          <button
            onClick={() => { setRejecting(false); setReason(''); setError(null) }}
            className="px-3 py-1 text-xs font-semibold border border-[#D1D5DB] text-[#374151] rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}