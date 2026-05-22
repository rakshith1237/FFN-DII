'use client'
import { useState, useTransition, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle }       from 'lucide-react'
import { concludePlacement, type ConcludePlacementInput } from '@/lib/actions/offboarding/conclude-placement'
import { useRouter } from 'next/navigation'

type Props = {
  open:         boolean
  onClose:      () => void
  placementId:  string
  candidateName: string
  jdTitle:      string
  endDate:      string | null
  startDate:    string
}

const RATING_OPTIONS = [
  { value: 'exceptional',        label: '⭐⭐⭐⭐⭐  Exceptional' },
  { value: 'good',               label: '⭐⭐⭐⭐  Good' },
  { value: 'satisfactory',       label: '⭐⭐⭐  Satisfactory' },
  { value: 'below_expectations', label: '⭐⭐  Below Expectations' },
  { value: 'unsatisfactory',     label: '⭐  Unsatisfactory' },
] as const

export function ConcludePlacementModal({
  open, onClose, placementId, candidateName, jdTitle, endDate, startDate,
}: Props) {
  const router = useRouter()
  const [conclusionType,   setConclusionType]   = useState<'natural_end'|'early_termination'>('natural_end')
  const [effectiveDate,    setEffectiveDate]     = useState(endDate ?? '')
  const [reason,           setReason]           = useState('')
  const [rating,           setRating]           = useState<string>('')
  const [rehire,           setRehire]           = useState<boolean | null>(null)
  const [rehireNotes,      setRehireNotes]       = useState('')
  const [error,            setError]            = useState<string | null>(null)
  const [success,          setSuccess]          = useState(false)
  const [isPending, startTransition]            = useTransition()

  useEffect(() => {
    if (conclusionType === 'natural_end') {
      setEffectiveDate(endDate ?? new Date().toISOString().split('T')[0] ?? '')
    }
  }, [conclusionType, endDate])

  function handleConfirm() {
    setError(null)
    if (conclusionType === 'early_termination') {
      if (!effectiveDate) { setError('Effective date is required'); return }
      if (reason.trim().length < 20) { setError('Termination reason must be at least 20 characters'); return }
    }

    const input: ConcludePlacementInput = {
      placementId,
      conclusionType,
      conclusionReason:  conclusionType === 'early_termination' ? reason.trim() : null,
      effectiveDate:     conclusionType === 'early_termination' ? effectiveDate : null,
      performanceRating: (rating as ConcludePlacementInput['performanceRating']) || null,
      rehireEligible:    rehire,
      rehireNotes:       rehireNotes.trim() || null,
    }

    startTransition(async () => {
      const result = await concludePlacement(input)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      setTimeout(() => { router.refresh(); onClose() }, 1500)
    })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Conclude Engagement"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-w-[92vw] bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#0F2147]">
          <div>
            <h2 className="text-base font-bold text-white">Conclude Engagement</h2>
            <p className="text-xs text-blue-200 mt-0.5">{candidateName} · {jdTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-blue-200 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Conclusion type */}
          <div>
            <p className="text-sm font-semibold text-[#374151] mb-2">Conclusion Type <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { val: 'natural_end',      label: 'Completed', desc: 'The engagement ran its full contracted term.' },
                { val: 'early_termination', label: 'Terminated Early', desc: 'The engagement ended before the contracted end date.' },
              ] as const).map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => setConclusionType(opt.val)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    conclusionType === opt.val
                      ? 'border-[#0F2147] bg-[#F0F9FF]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#9CA3AF]'
                  }`}>
                  <p className="text-sm font-semibold text-[#374151]">{opt.label}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5 italic">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Early termination fields */}
          {conclusionType === 'early_termination' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
                <p className="text-xs text-[#9CA3AF] mt-1">All timesheets after this date will be cancelled automatically.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Termination Reason <span className="text-red-500">*</span>
                  <span className="text-[#9CA3AF] font-normal ml-1">(minimum 20 characters)</span>
                </label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Describe the reason for early termination..."
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
                <p className={`text-xs mt-0.5 ${reason.length < 20 ? 'text-red-400' : 'text-[#9CA3AF]'}`}>
                  {reason.length} / 20 minimum
                </p>
              </div>

              {effectiveDate && (
                <div className="p-3 bg-[#FEF3C7] border-l-4 border-[#D97706] rounded text-xs text-[#92400E] flex items-start gap-2">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>Timesheets and invoices after {new Date(effectiveDate).toLocaleDateString('en-GB')} will be cancelled.</span>
                </div>
              )}
            </>
          )}

          {/* Performance rating */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Performance Rating <span className="text-[#9CA3AF] font-normal">(optional)</span>
            </label>
            <select value={rating} onChange={e => setRating(e.target.value)}
              className="w-full h-10 px-2 text-sm border border-[#D1D5DB] rounded-lg bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
              <option value="">— Select rating —</option>
              {RATING_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Rehire eligibility */}
          <div>
            <p className="text-xs font-semibold text-[#374151] mb-2">Eligible for Re-Engagement?</p>
            <div className="flex gap-3">
              {([{ val: true, label: 'Yes' }, { val: false, label: 'No' }, { val: null, label: 'Undecided' }] as const).map(opt => (
                <button key={String(opt.val)} type="button"
                  onClick={() => setRehire(opt.val)}
                  className={`px-4 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                    rehire === opt.val
                      ? 'bg-[#0F2147] text-white border-[#0F2147]'
                      : 'bg-white text-[#374151] border-[#D1D5DB]'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {rehire === false && (
              <textarea rows={2} value={rehireNotes} onChange={e => setRehireNotes(e.target.value)}
                placeholder="Reason for ineligibility..."
                className="mt-2 w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          {error && (
            <div className="mb-3 p-2.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-xs text-[#991B1B]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 p-2.5 bg-green-50 border-l-4 border-green-500 rounded text-xs text-green-700 flex items-center gap-2">
              <CheckCircle size={13} /> Engagement concluded. Offboarding tasks created.
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleConfirm} disabled={isPending || success}
              className="flex-1 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
              {isPending ? 'Concluding...' : 'Confirm Conclusion'}
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 border border-[#D1D5DB] text-sm rounded-lg hover:bg-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
