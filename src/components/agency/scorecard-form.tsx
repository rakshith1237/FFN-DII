'use client'
import { useState, useTransition } from 'react'
import { submitScorecard }         from '@/lib/actions/interview/submit-scorecard'
import { CheckCircle }             from 'lucide-react'

type Criterion = { id: string; criterion_text: string; weight: number; sort_order: number }
type PanelistScore = { panelistName: string; scores: Record<string, number>; recommendation: string }

const BAND_STYLE: Record<string, string> = {
  strong_recommend: 'text-green-700 bg-green-50',
  recommend:        'text-blue-700 bg-blue-50',
  borderline:       'text-amber-700 bg-amber-50',
  do_not_recommend: 'text-red-700 bg-red-50',
}

export function ScorecardForm({
  interviewId,
  criteria,
  existingScores,
  existingNotes,
  alreadySubmitted,
  allScores,
  showAllScores,
  interviewStatus,
}: {
  interviewId:    string
  criteria:       Criterion[]
  existingScores: Record<string, number>
  existingNotes:  string
  alreadySubmitted: boolean
  allScores:      PanelistScore[]
  showAllScores:  boolean
  interviewStatus: string
}) {
  const [scores,  setScores]  = useState<Record<string, number>>(existingScores)
  const [notes,   setNotes]   = useState(existingNotes)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(alreadySubmitted)
  const [isPending, startTransition] = useTransition()

  function setScore(criterionId: string, value: number) {
    setScores(prev => ({ ...prev, [criterionId]: Math.min(10, Math.max(0, value)) }))
  }

  function handleSubmit() {
    setError(null)
    if (criteria.length > 0 && Object.keys(scores).length < criteria.length) {
      setError('Please score all criteria before submitting')
      return
    }
    startTransition(async () => {
      const result = await submitScorecard({ interviewId, scores, notes: notes.trim() || null })
      if (result.error) { setError(result.error); return }
      setSuccess(true)
    })
  }

  return (
    <div className="space-y-6">
      {/* My scorecard */}
      {!success && interviewStatus !== 'scored' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#374151]">My Scores</h2>
          </div>
          <div className="p-5 space-y-5">
            {criteria.length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">No criteria configured for this JD. Submit a general recommendation.</p>
            ) : (
              criteria.map(c => (
                <div key={c.id}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-[#374151] flex-1 pr-4">{c.criterion_text}</p>
                    <span className="text-xs text-[#9CA3AF]">weight: {c.weight}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={10} step={1}
                      value={scores[c.id] ?? 5}
                      onChange={e => setScore(c.id, parseInt(e.target.value))}
                      className="flex-1 accent-[#0F2147]" />
                    <span className="w-8 text-center text-sm font-bold text-[#0F2147]">
                      {scores[c.id] ?? '—'}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">/ 10</span>
                  </div>
                </div>
              ))
            )}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Notes (optional)</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Observations, strengths, concerns..."
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
            </div>
            {error && (
              <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>
            )}
            <button onClick={handleSubmit} disabled={isPending}
              className="w-full py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
              {isPending ? 'Submitting...' : 'Submit Scorecard'}
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={18} className="text-green-600" />
          <p className="text-sm text-green-700 font-medium">Scorecard submitted successfully.</p>
        </div>
      )}

      {/* Panel results (revealed when all submitted or non-anonymous) */}
      {showAllScores && allScores.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#374151]">Panel Scores</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {allScores.map((ps, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#374151]">{ps.panelistName}</p>
                  {ps.recommendation && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${BAND_STYLE[ps.recommendation] ?? ''}`}>
                      {ps.recommendation.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {criteria.map(c => (
                    <div key={c.id} className="text-xs">
                      <span className="text-[#9CA3AF]">{c.criterion_text.substring(0, 30)}…</span>
                      <span className="ml-1 font-bold text-[#374151]">{ps.scores[c.id] ?? '—'}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
