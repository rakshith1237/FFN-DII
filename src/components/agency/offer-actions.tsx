'use client'
import { useState, useTransition } from 'react'
import { acceptOffer, counterOffer } from '@/lib/actions/offer/accept-or-counter-offer'
import { useRouter }               from 'next/navigation'
import { CheckCircle, ArrowLeftRight } from 'lucide-react'

export function AgencyOfferActions({
  offerId, billRate, currency, startDate,
}: {
  offerId:   string
  billRate:  number
  currency:  string
  startDate: string
}) {
  const router = useRouter()
  const [mode,         setMode]         = useState<'idle'|'accept'|'counter'>('idle')
  const [counterRate,  setCounterRate]  = useState(String(billRate))
  const [counterStart, setCounterStart] = useState(startDate)
  const [counterEnd,   setCounterEnd]   = useState('')
  const [counterNotes, setCounterNotes] = useState('')
  const [error,        setError]        = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      const result = await acceptOffer(offerId)
      if (result.error) { setError(result.error); return }
      router.push('/agency/offers')
    })
  }

  function handleCounter() {
    setError(null)
    if (!counterRate || parseFloat(counterRate) <= 0) { setError('Enter a valid rate'); return }
    startTransition(async () => {
      const result = await counterOffer({
        offerId,
        proposedBillRate:  parseFloat(counterRate),
        proposedStartDate: counterStart || null,
        proposedEndDate:   counterEnd   || null,
        currency,
        counterNotes:      counterNotes.trim() || null,
      })
      if (result.error) { setError(result.error); return }
      router.push('/agency/offers')
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>
      )}

      {mode === 'idle' && (
        <div className="flex gap-3">
          <button onClick={() => setMode('accept')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
            <CheckCircle size={16} /> Accept Offer
          </button>
          <button onClick={() => setMode('counter')}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-[#0F2147] text-[#0F2147] text-sm font-semibold rounded-lg hover:bg-[#F0F4FF] transition-colors">
            <ArrowLeftRight size={16} /> Counter Offer
          </button>
        </div>
      )}

      {mode === 'accept' && (
        <div className="space-y-3">
          <p className="text-sm text-[#374151]">Accept the offer at <strong>{currency} {Number(billRate).toLocaleString()}/{currency === 'GBP' ? 'day' : 'day'}</strong>?
            This will create a placement record.</p>
          <div className="flex gap-3">
            <button onClick={handleAccept} disabled={isPending}
              className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
              {isPending ? 'Accepting...' : 'Confirm Accept'}
            </button>
            <button onClick={() => setMode('idle')}
              className="px-4 py-2.5 border border-[#D1D5DB] text-sm rounded-lg hover:bg-[#F9FAFB]">
              Back
            </button>
          </div>
        </div>
      )}

      {mode === 'counter' && (
        <div className="space-y-4 p-4 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB]">
          <h3 className="text-sm font-bold text-[#374151]">Counter Offer</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Proposed Rate ({currency}) *</label>
              <input type="number" min="0" step="0.01" value={counterRate}
                onChange={e => setCounterRate(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Proposed Start</label>
              <input type="date" value={counterStart} onChange={e => setCounterStart(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Counter Notes</label>
            <textarea rows={2} value={counterNotes} onChange={e => setCounterNotes(e.target.value)}
              placeholder="Explain the counter terms..."
              className="w-full px-2 py-1.5 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCounter} disabled={isPending}
              className="flex-1 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
              {isPending ? 'Submitting...' : 'Submit Counter'}
            </button>
            <button onClick={() => setMode('idle')}
              className="px-4 py-2.5 border border-[#D1D5DB] text-sm rounded-lg hover:bg-white">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
