'use client'
import { useState, useTransition } from 'react'
import { actionAlert }             from '@/lib/actions/engagement/action-alert'

export default function AlertActionButton({ alertId }: { alertId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done,  setDone]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handle(actionType: 'extension' | 'replacement_jd' | 'none') {
    setError(null)
    startTransition(async () => {
      const result = await actionAlert(alertId, actionType)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  if (done) {
    return <span className="text-xs text-green-600 font-medium">Actioned</span>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handle('extension')}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-semibold border border-[#0F2147] text-[#0F2147] rounded-lg hover:bg-[#0F2147] hover:text-white disabled:opacity-50 transition-colors"
        >
          Initiate Extension
        </button>
        <button
          onClick={() => handle('replacement_jd')}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-semibold border border-[#3B82F6] text-[#3B82F6] rounded-lg hover:bg-[#3B82F6] hover:text-white disabled:opacity-50 transition-colors"
        >
          Create Replacement JD
        </button>
        <button
          onClick={() => handle('none')}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-semibold border border-[#D1D5DB] text-[#6B7280] rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}