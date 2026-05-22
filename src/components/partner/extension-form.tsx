'use client'
import { useState, useTransition }             from 'react'
import { requestExtension }                    from '@/lib/actions/engagement/request-extension'
import { approveExtension, rejectExtension }   from '@/lib/actions/engagement/approve-extension'

type Extension = {
  id: string; new_end_date: string; new_bill_rate: number | null
  reason: string; status: string; requested_at: string
}

const STATUS_STYLE: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
  executed:  'bg-blue-100 text-blue-700',
}

export function ExtensionForm({
  placementId, currentEndDate, currentBillRate, currency, extensions, isSuperAdmin,
}: {
  placementId:     string
  currentEndDate:  string | null
  currentBillRate: number
  currency:        string
  extensions:      Extension[]
  isSuperAdmin:    boolean
}) {
  const [newEndDate,  setNewEndDate]  = useState('')
  const [newRate,     setNewRate]     = useState('')
  const [reason,      setReason]      = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function handleRequest() {
    setError(null)
    if (!newEndDate) { setError('New end date is required'); return }
    if (!reason.trim()) { setError('Please provide a reason for the extension'); return }
    startTransition(async () => {
      const result = await requestExtension({
        placementId,
        newEndDate,
        newBillRate: newRate ? parseFloat(newRate) : null,
        reason: reason.trim(),
      })
      if (result.error) { setError(result.error); return }
      setSuccess('Extension request submitted for approval.')
    })
  }

  function handleApprove(extId: string) {
    startTransition(async () => {
      const result = await approveExtension(extId)
      if (result.error) { setError(result.error); return }
      setSuccess('Extension approved. Placement end date updated.')
    })
  }

  function handleReject(extId: string) {
    startTransition(async () => {
      const result = await rejectExtension(extId)
      if (result.error) { setError(result.error); return }
      setSuccess('Extension rejected.')
    })
  }

  return (
    <div className="space-y-6">
      {/* Current details */}
      <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase">Current End Date</p>
          <p className="text-[#374151] mt-0.5">{currentEndDate ? new Date(currentEndDate).toLocaleDateString('en-GB') : 'Open-ended'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase">Current Bill Rate</p>
          <p className="text-[#374151] mt-0.5">{currency} {Number(currentBillRate).toLocaleString()}/day</p>
        </div>
      </div>

      {/* Request form */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#374151]">Request Extension</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">New End Date *</label>
            <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
              min={currentEndDate ?? undefined}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">New Bill Rate ({currency}) — optional</label>
            <input type="number" min="0" step="0.01" value={newRate} onChange={e => setNewRate(e.target.value)}
              placeholder={String(currentBillRate)}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Reason *</label>
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Business justification for the extension..."
            className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
        </div>
        {error   && <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>}
        {success && <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded text-sm text-green-700">{success}</div>}
        <button onClick={handleRequest} disabled={isPending}
          className="w-full py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
          {isPending ? 'Submitting...' : 'Request Extension'}
        </button>
      </div>

      {/* Extension history */}
      {extensions.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#374151]">Extension History</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {extensions.map(ext => (
              <div key={ext.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#374151]">
                    New end: {new Date(ext.new_end_date).toLocaleDateString('en-GB')}
                    {ext.new_bill_rate && <span className="text-[#6B7280] ml-2">· {currency} {ext.new_bill_rate}/day</span>}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[ext.status] ?? ''}`}>
                    {ext.status}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">{ext.reason}</p>
                {isSuperAdmin && ext.status === 'requested' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApprove(ext.id)} disabled={isPending}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:opacity-60">
                      Approve
                    </button>
                    <button onClick={() => handleReject(ext.id)} disabled={isPending}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-60">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
