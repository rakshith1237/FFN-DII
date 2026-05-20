'use client'

import { useEffect, useRef } from 'react'
import { X, TrendingUp, Cpu, MapPin, AlertCircle } from 'lucide-react'
import { type FactorScore } from '@/lib/ai/intellimatch'
import { formatDistanceToNow } from 'date-fns'

interface FactorSnapshotData {
  tf_score:  number
  af_score:  number
  composite: number
  factors:   FactorScore[]
}

interface ScoreExplainSheetProps {
  open:          boolean
  onClose:       () => void
  candidateName: string
  jdTitle:       string
  composite:     number | null
  tfScore:       number | null
  afScore:       number | null
  snapshot:      FactorSnapshotData | null
  explanation:   string | null
  scoredAt:      string | null
}

function scoreColor(score: number): string {
  if (score >= 75) return '#16A34A'
  if (score >= 50) return '#D97706'
  return '#DC2626'
}

function CompositeGauge({ score }: { score: number }) {
  const radius        = 54
  const stroke        = 10
  const cx            = 70
  const cy            = 70
  const circumference = 2 * Math.PI * radius
  const arcLength     = circumference * (240 / 360)
  const filled        = arcLength * (Math.min(score, 100) / 100)
  const color         = scoreColor(score)

  return (
    <div className="flex flex-col items-center mb-6">
      <svg width={140} height={100} viewBox="0 0 140 100" aria-label={`IntelliMatch score: ${score}`}>
        {/* Background arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(150 ${cx} ${cy})`}
        />
        {/* Filled arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(150 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Score label */}
        <text x={cx} y={cy - 4} textAnchor="middle"
          fontSize={26} fontWeight="800" fill={color}>
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          fontSize={11} fill="#9CA3AF">
          /100
        </text>
      </svg>
      <p className="text-[12px] font-semibold text-[#6B7280] mt-1 uppercase tracking-widest">
        IntelliMatch Composite
      </p>
    </div>
  )
}

function FactorBar({
  factor,
}: { factor: FactorScore; maxWeight: number }) {
  const scoreVal = Math.round(factor.score * 100)
  const color    = scoreColor(scoreVal)
  const widthPct = Math.min(scoreVal, 100)

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-[#374151]">{factor.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded font-mono">
            w:{factor.weight}%
          </span>
          <span className="text-[12px] font-bold w-8 text-right" style={{ color }}>
            {scoreVal}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${widthPct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function ScoreExplainSheet({
  open, onClose,
  candidateName, jdTitle,
  composite, tfScore, afScore,
  snapshot, explanation, scoredAt,
}: ScoreExplainSheetProps) {

  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const tfFactors = snapshot?.factors.filter(f => f.group === 'tf') ?? []
  const afFactors = snapshot?.factors.filter(f => f.group === 'af') ?? []
  const maxWeight = Math.max(...(snapshot?.factors.map(f => f.weight) ?? [20]))

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`IntelliMatch score for ${candidateName}`}
        className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50
          flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#0F2147]">{candidateName}</h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{jdTitle}</p>
            {scoredAt && (
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                Scored {formatDistanceToNow(new Date(scoredAt), { addSuffix: true })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close score panel"
            className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#374151] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* No score yet */}
          {composite === null && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle size={32} className="text-[#D1D5DB] mb-3" />
              <p className="text-[14px] font-medium text-[#374151]">Score pending</p>
              <p className="text-[13px] text-[#9CA3AF] mt-1">
                IntelliMatch scoring is in progress. Check back in a moment.
              </p>
            </div>
          )}

          {composite !== null && (
            <>
              {/* Gauge */}
              <CompositeGauge score={composite} />

              {/* TF / AF badges */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: 'Technical Fit', icon: Cpu,    score: tfScore, color: '#0F2147', bg: '#EFF6FF' },
                  { label: 'Auxiliary Fit', icon: MapPin, score: afScore, color: '#D97706', bg: '#FEF3C7' },
                ].map(({ label, icon: Icon, score: s, color, bg }) => (
                  <div key={label} className="rounded-[8px] border border-[#E5E7EB] px-4 py-3 text-center"
                    style={{ background: bg }}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Icon size={13} style={{ color }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color }}>{label}</span>
                    </div>
                    <p className="text-[24px] font-black" style={{ color }}>
                      {s ?? '—'}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">out of 100</p>
                  </div>
                ))}
              </div>

              {/* Factor bars */}
              {tfFactors.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Cpu size={11} /> Technical Fit Factors
                  </p>
                  {tfFactors.map(f => (
                    <FactorBar key={f.code} factor={f} maxWeight={maxWeight} />
                  ))}
                </div>
              )}

              {afFactors.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <MapPin size={11} /> Auxiliary Fit Factors
                  </p>
                  {afFactors.map(f => (
                    <FactorBar key={f.code} factor={f} maxWeight={maxWeight} />
                  ))}
                </div>
              )}

              {/* AI Explanation */}
              {explanation && (
                <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[8px] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={13} className="text-[#D97706]" />
                    <span className="text-[11px] font-bold text-[#92400E] uppercase tracking-wide">
                      AI Score Explanation
                    </span>
                  </div>
                  <p className="text-[13px] text-[#92400E] leading-relaxed">
                    {explanation}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] mt-2">
                    Generated by Claude claude-sonnet-4-20250514 · IntelliMatch v0.1
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
