'use client'
import { useState, useTransition } from 'react'
import { approveRejectExtension }  from '@/lib/actions/timesheet/approve-reject-extension'

export default function ExtensionActions({ extensionId }: { extensionId: string }) {
  const [isPending, startTransition] = useTransition()
  const [rejecting, setRejecting]    = useState(false)
  const [reason, setReason]          = useState('')
  const [error, setError]            = useState<string | null>(null)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveRejectExtension(extensionId, 'approved')
      if (result.error) setError(result.error)
    })
  }

  function handleReject() {
    setError(null)
    if (!rejecting) { setRejecting(true); return }
    if (reason.trim().length < 10) { setError('Min 10 characters required'); return }
    startTransition(async () => {
      const result = await approveRejectExtension(extensionId, 'rejected', reason)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2 min-w-[200px]">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rejecting && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rejection reason (min 10 chars)..."
          rows={2}
          className="w-full text-xs border border-[#D1D5DB] rounded p-2 resize-none focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
        />
      )}
      <div className="flex gap-2">
        {!rejecting && (
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="px-3 py-1.5 bg-[#16A34A] text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '...' : 'Approve'}
          </button>
        )}
        <button
          onClick={handleReject}
          disabled={isPending}
          className="px-3 py-1.5 bg-[#DC2626] text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '...' : rejecting ? 'Confirm Reject' : 'Reject'}
        </button>
        {rejecting && (
          <button
            onClick={() => { setRejecting(false); setReason(''); setError(null) }}
            className="px-3 py-1.5 border border-[#D1D5DB] text-[#374151] text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}