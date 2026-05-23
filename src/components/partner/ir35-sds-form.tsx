'use client'
import { useState, useTransition } from 'react'
import { submitIr35Sds } from '@/lib/actions/compliance/submit-ir35-sds'
import { IR35_QUESTIONS } from '@/lib/constants/ir35-questions'

type Answers = Record<string, 'yes' | 'no' | 'depends'>
type Existing = { answers: Answers; determination: string; determination_score: number } | null

const BAND = {
  inside:        { label: 'INSIDE IR35', bg: 'bg-red-600',    text: 'text-white' },
  outside:       { label: 'OUTSIDE IR35', bg: 'bg-green-600', text: 'text-white' },
  undetermined:  { label: 'UNDETERMINED', bg: 'bg-amber-500', text: 'text-white' },
}

export function Ir35SdsForm({
  placementId, candidateId, jdId, existing,
}: {
  placementId: string
  candidateId: string
  jdId:        string
  existing:    Existing
}) {
  const [answers,       setAnswers]       = useState<Answers>(existing?.answers ?? {} as Answers)
  const [determination, setDetermination] = useState<string | null>(existing?.determination ?? null)
  const [error,         setError]         = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  function setAnswer(qId: string, val: 'yes' | 'no' | 'depends') {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await submitIr35Sds({ placementId, candidateId, jdId, answers })
      if (result.error) { setError(result.error); return }
      setDetermination(result.determination)
    })
  }

  const band = determination ? BAND[determination as keyof typeof BAND] : null
  const allAnswered = IR35_QUESTIONS.every(q => answers[q.id])

  return (
    <div className="space-y-6">
      {band && (
        <div className={`p-5 rounded-xl ${band.bg} flex items-center justify-between`}>
          <div>
            <p className={`text-lg font-bold ${band.text}`}>{band.label}</p>
            <p className={`text-xs mt-0.5 ${band.text} opacity-80`}>
              Score: {existing?.determination_score ?? '—'} / 12
            </p>
          </div>
          <a
            href={`/partner/placements/${placementId}/ir35/print`}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-white bg-opacity-20 text-white text-sm font-semibold rounded-lg hover:bg-opacity-30 transition-colors"
          >
            Download PDF
          </a>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#374151]">HMRC IR35 Questionnaire</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Answer all 12 questions based on the actual working arrangements</p>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {IR35_QUESTIONS.map((q, i) => (
            <div key={q.id} className="px-5 py-4">
              <p className="text-sm text-[#374151] mb-3">
                <span className="font-bold text-[#0F2147] mr-2">{i + 1}.</span>{q.text}
              </p>
              <div className="flex gap-3">
                {(['yes','no','depends'] as const).map(opt => (
                  <button key={opt} type="button"
                    onClick={() => setAnswer(q.id, opt)}
                    className={`px-4 py-1.5 text-sm rounded-lg border font-medium capitalize transition-colors ${
                      answers[q.id] === opt
                        ? 'bg-[#0F2147] text-white border-[#0F2147]'
                        : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-[#9CA3AF]'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>
      )}

      <button onClick={handleSubmit} disabled={isPending || !allAnswered}
        className="w-full py-3 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
        {isPending ? 'Computing determination...' : 'Submit IR35 SDS'}
      </button>

      <p className="text-xs text-[#9CA3AF] text-center">
        This form follows HMRC IR35 guidance. The determination is indicative and does not constitute legal advice.
        Consult your tax adviser for complex cases.
      </p>
    </div>
  )
}
