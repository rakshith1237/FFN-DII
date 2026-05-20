'use client'

import { useState, useMemo }   from 'react'
import Link                    from 'next/link'
import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ArrowLeft, User, Zap, AlertCircle } from 'lucide-react'
import {
  TF_FACTORS, AF_FACTORS,
  type FactorKey, type FactorValues,
  type ScoredCandidate,
  computeXYScore, defaultFactors,
} from '@/lib/ai/xy-score'
import { type BenchCandidate } from '@/lib/ai/bench-query'

void defaultFactors

interface JdContext {
  id:               string
  title:            string
  required_skills:  string
  location_city:    string | null
  work_arrangement: string | null
  start_date:       string | null
  partner_name:     string
}

interface AssignmentContext {
  id:                     string
  submission_quota:       number
  submissions_used:       number
  quota_remaining:        number
  target_submission_date: string
  notes:                  string | null
}

interface XyScoringClientProps {
  jd:               JdContext
  assignment:       AssignmentContext
  scoredCandidates: ScoredCandidate[]
  benchRaw:         BenchCandidate[]
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  skills_match:   'Skills Match',
  cert_match:     'Certification Match',
  seniority:      'Seniority Level',
  platform_depth: 'Platform Depth',
  xp_relevance:   'Experience Relevance',
  location:       'Location Fit',
  availability:   'Availability',
  rate_fit:       'Rate Fit',
  work_type:      'Work Type Match',
  references:     'References / Track Record',
}

type ChartEntry = {
  x:            number
  y:            number
  composite:    number
  candidate_id: string
  full_name:    string
  similarity:   number
}

function scoreColor(score: number): string {
  if (score >= 75) return '#16A34A'
  if (score >= 50) return '#D97706'
  return '#DC2626'
}

export default function XyScoringClient({
  jd,
  assignment,
  scoredCandidates,
  benchRaw,
}: XyScoringClientProps) {
  const [factorMap, setFactorMap] = useState<Map<string, FactorValues>>(() => {
    const m = new Map<string, FactorValues>()
    for (const sc of scoredCandidates) {
      m.set(sc.candidate_id, { ...sc.factors })
    }
    return m
  })

  const [selectedId, setSelectedId] = useState<string | null>(
    scoredCandidates[0]?.candidate_id ?? null
  )

  const chartData = useMemo((): ChartEntry[] => {
    return scoredCandidates.map(sc => {
      const factors = factorMap.get(sc.candidate_id) ?? sc.factors
      const score   = computeXYScore(factors)
      return {
        x:            score.af_score,
        y:            score.tf_score,
        composite:    score.composite,
        candidate_id: sc.candidate_id,
        full_name:    sc.full_name,
        similarity:   sc.similarity,
      }
    })
  }, [factorMap, scoredCandidates])

  const selectedBench = benchRaw.find(c => c.candidate_id === selectedId)
  const selectedScore = useMemo(() => {
    if (!selectedId) return null
    const factors = factorMap.get(selectedId)
    if (!factors) return null
    return computeXYScore(factors)
  }, [factorMap, selectedId])

  function handleFactorChange(factorKey: FactorKey, value: number) {
    if (!selectedId) return
    setFactorMap(prev => {
      const next    = new Map(prev)
      const current = next.get(selectedId) ?? ({} as FactorValues)
      next.set(selectedId, { ...current, [factorKey]: value })
      return next
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* Breadcrumb + header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E5E7EB] shrink-0 bg-white">
        <Link href="/agency/requirements"
          className="flex items-center gap-1 text-[13px] text-[#6B7280] hover:text-[#374151]">
          <ArrowLeft size={14} /> My Requirements
        </Link>
        <span className="text-[#D1D5DB]">/</span>
        <span className="text-[13px] font-semibold text-[#0F2147]">{jd.title}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-[#6B7280]">
            {assignment.submissions_used}/{assignment.submission_quota} submitted
          </span>
          {assignment.quota_remaining <= 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-[#FEE2E2] text-[#991B1B] rounded-[4px] text-[11px] font-semibold">
              <AlertCircle size={11} /> Quota reached
            </span>
          )}
        </span>
      </div>

      {/* ARM notes banner */}
      {assignment.notes && (
        <div className="px-6 py-2 bg-[#FFFBEB] border-b border-[#FEF3C7] shrink-0">
          <p className="text-[12px] text-[#92400E]">
            <span className="font-semibold">ARM Instructions:</span> {assignment.notes}
          </p>
        </div>
      )}

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — bench list (40%) */}
        <div className="w-[40%] border-r border-[#E5E7EB] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[#D97706]" />
              <span className="text-[13px] font-semibold text-[#374151]">
                Bench Match — {scoredCandidates.length} candidates
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Ranked by skill vector similarity (ADR-004)
            </p>
          </div>

          {scoredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
              <User size={32} className="text-[#D1D5DB] mb-3" />
              <p className="text-[14px] font-medium text-[#374151]">No bench candidates</p>
              <p className="text-[12px] text-[#6B7280] mt-1">
                No available candidates match this JD&apos;s skill requirements yet.
              </p>
            </div>
          ) : (
            <ul className="overflow-y-auto flex-1">
              {scoredCandidates.map((sc, idx) => {
                const factors    = factorMap.get(sc.candidate_id) ?? sc.factors
                const score      = computeXYScore(factors)
                const isSelected = sc.candidate_id === selectedId
                return (
                  <li key={sc.candidate_id}>
                    <button
                      onClick={() => setSelectedId(sc.candidate_id)}
                      className={`w-full text-left px-4 py-3.5 border-b border-[#F3F4F6] transition-colors ${
                        isSelected ? 'bg-[#EFF6FF] border-l-4 border-l-[#0F2147]' : 'hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-[#0F2147]">
                          #{idx + 1} {sc.full_name}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8]">
                          {Math.round(sc.similarity * 100)}% match
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#6B7280]">
                          {benchRaw.find(b => b.candidate_id === sc.candidate_id)?.current_title ?? '—'}
                        </span>
                        <span className="ml-auto flex items-center gap-1.5">
                          <span className="text-[11px] font-medium" style={{ color: scoreColor(score.tf_score) }}>
                            TF {score.tf_score}
                          </span>
                          <span className="text-[#D1D5DB]">·</span>
                          <span className="text-[11px] font-medium" style={{ color: scoreColor(score.af_score) }}>
                            AF {score.af_score}
                          </span>
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* RIGHT PANEL — factor sliders + chart (60%) */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {!selectedId || !selectedBench ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <User size={40} className="text-[#D1D5DB] mb-3" />
              <p className="text-[15px] font-semibold text-[#374151]">Select a candidate</p>
              <p className="text-[13px] text-[#6B7280] mt-1">
                Click any candidate on the left to score them
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto">

              {/* Candidate header */}
              <div className="px-5 py-4 border-b border-[#E5E7EB] shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[16px] font-bold text-[#0F2147]">
                      {selectedBench.full_name}
                    </h2>
                    <p className="text-[13px] text-[#6B7280] mt-0.5">
                      {selectedBench.current_title ?? '—'}
                      {selectedBench.location_city ? ` · ${selectedBench.location_city}` : ''}
                      {selectedBench.years_experience ? ` · ${selectedBench.years_experience} yrs` : ''}
                    </p>
                  </div>
                  {selectedScore && (
                    <div className="flex items-center gap-3 shrink-0">
                      {([
                        { label: 'TF',    val: selectedScore.tf_score,  bold: false },
                        { label: 'AF',    val: selectedScore.af_score,  bold: false },
                        { label: 'Score', val: selectedScore.composite, bold: true  },
                      ] as Array<{ label: string; val: number; bold: boolean }>).map(item => (
                        <div key={item.label} className="text-center">
                          <div
                            className={item.bold ? 'text-[20px] font-black' : 'text-[16px] font-black'}
                            style={{ color: scoreColor(item.val) }}
                          >
                            {item.val}
                          </div>
                          <div className="text-[10px] text-[#9CA3AF] font-medium">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Factor sliders */}
              <div className="px-5 py-4 shrink-0">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">

                  {/* TF factors */}
                  <div>
                    <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">
                      Technical Fit (TF · 60%)
                    </p>
                    {TF_FACTORS.map(factor => {
                      const val = factorMap.get(selectedId)?.[factor] ?? 50
                      return (
                        <div key={factor} className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor={`factor-${factor}`}
                              className="text-[12px] font-medium text-[#374151]"
                            >
                              {FACTOR_LABELS[factor]}
                            </label>
                            <span
                              className="text-[12px] font-bold w-8 text-right"
                              style={{ color: scoreColor(val) }}
                            >
                              {val}
                            </span>
                          </div>
                          <input
                            id={`factor-${factor}`}
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={val}
                            onChange={e => handleFactorChange(factor, parseInt(e.target.value, 10))}
                            className="w-full accent-[#0F2147] h-1.5"
                            aria-label={FACTOR_LABELS[factor]}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* AF factors */}
                  <div>
                    <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">
                      Auxiliary Fit (AF · 40%)
                    </p>
                    {AF_FACTORS.map(factor => {
                      const val = factorMap.get(selectedId)?.[factor] ?? 50
                      return (
                        <div key={factor} className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor={`factor-${factor}`}
                              className="text-[12px] font-medium text-[#374151]"
                            >
                              {FACTOR_LABELS[factor]}
                            </label>
                            <span
                              className="text-[12px] font-bold w-8 text-right"
                              style={{ color: scoreColor(val) }}
                            >
                              {val}
                            </span>
                          </div>
                          <input
                            id={`factor-${factor}`}
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={val}
                            onChange={e => handleFactorChange(factor, parseInt(e.target.value, 10))}
                            className="w-full accent-[#E8531E] h-1.5"
                            aria-label={FACTOR_LABELS[factor]}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* XY Scatter Chart */}
              <div className="px-5 pb-4 shrink-0">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">
                  XY Score Map — All Candidates
                </p>
                <div className="bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] p-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        domain={[0, 100]}
                        name="Auxiliary Fit"
                        label={{ value: 'Auxiliary Fit (AF)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#6B7280' }}
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        domain={[0, 100]}
                        name="Technical Fit"
                        label={{ value: 'Technical Fit (TF)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#6B7280' }}
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (!payload?.length) return null
                          const raw = payload[0]?.payload
                          if (!raw) return null
                          const d = raw as ChartEntry
                          return (
                            <div className="bg-white border border-[#E5E7EB] rounded-[6px] px-3 py-2 shadow text-[12px]">
                              <p className="font-semibold text-[#0F2147]">{d.full_name}</p>
                              <p className="text-[#6B7280]">TF {d.y} · AF {d.x} · Score {d.composite}</p>
                              <p className="text-[#9CA3AF]">Similarity {Math.round(d.similarity * 100)}%</p>
                            </div>
                          )
                        }}
                      />
                      <Scatter data={chartData} isAnimationActive={false}>
                        {chartData.map(entry => (
                          <Cell
                            key={entry.candidate_id}
                            fill={entry.candidate_id === selectedId ? '#0F2147' : '#93C5FD'}
                            stroke={entry.candidate_id === selectedId ? '#0F2147' : '#3B82F6'}
                            strokeWidth={entry.candidate_id === selectedId ? 2 : 1}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-[#9CA3AF] text-center mt-1">
                    Navy dot = selected candidate · Blue dots = other bench candidates
                  </p>
                </div>
              </div>

              {/* Submit footer */}
              <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-5 py-4 flex items-center justify-between shrink-0">
                <div className="text-[13px] text-[#6B7280]">
                  Quota remaining: <span className="font-bold text-[#0F2147]">
                    {assignment.quota_remaining}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={assignment.quota_remaining <= 0}
                  onClick={() => {
                    // Submission flow — WBS #26
                    alert('Submission flow coming in WBS #26')
                  }}
                  className={`px-6 py-2.5 text-[13px] font-semibold text-white rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8531E] ${
                    assignment.quota_remaining > 0
                      ? 'bg-[#E8531E] hover:bg-[#d44718] cursor-pointer'
                      : 'bg-[#D1D5DB] cursor-not-allowed'
                  }`}
                >
                  {assignment.quota_remaining > 0
                    ? `Submit ${selectedBench.full_name} →`
                    : 'Quota Reached'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
