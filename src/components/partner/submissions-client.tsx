'use client'

import { useState } from 'react'
import {
  Clock, CheckCircle2, XCircle, AlertCircle,
  Inbox, TrendingUp, Users
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ScoreExplainSheet      from './score-explain-sheet'
import { type FactorScore }   from '@/lib/ai/intellimatch'

void CheckCircle2
void XCircle
void AlertCircle

interface SubmissionsClientProps {
  submissions: Record<string, unknown>[]
}

type FactorSnapshotData = {
  tf_score:  number
  af_score:  number
  composite: number
  factors:   FactorScore[]
}

function parseSnapshot(raw: unknown): FactorSnapshotData | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (typeof s['composite'] !== 'number') return null
  return {
    composite: s['composite'] as number,
    tf_score:  (s['tf_score'] as number) ?? 0,
    af_score:  (s['af_score'] as number) ?? 0,
    factors:   (s['factors'] as FactorScore[]) ?? [],
  }
}

function scoreColor(score: number | null): string {
  if (!score) return '#9CA3AF'
  if (score >= 75) return '#16A34A'
  if (score >= 50) return '#D97706'
  return '#DC2626'
}

function scoreBg(score: number | null): string {
  if (!score) return '#F3F4F6'
  if (score >= 75) return '#DCFCE7'
  if (score >= 50) return '#FEF3C7'
  return '#FEE2E2'
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    received:             { bg: '#DBEAFE', text: '#1D4ED8', label: 'Received' },
    under_review:         { bg: '#FEF3C7', text: '#92400E', label: 'Under Review' },
    shortlisted:          { bg: '#CCFBF1', text: '#0F766E', label: 'Shortlisted' },
    interview_scheduled:  { bg: '#EDE9FE', text: '#5B21B6', label: 'Interview' },
    offer_made:           { bg: '#DCFCE7', text: '#166534', label: 'Offer Made' },
    rejected:             { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
    filled:               { bg: '#DCFCE7', text: '#166534', label: 'Filled' },
  }
  const s = map[status] ?? { bg: '#F3F4F6', text: '#374151', label: status }
  return (
    <span style={{ background: s.bg, color: s.text }}
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold">
      {s.label}
    </span>
  )
}

export default function SubmissionsClient({ submissions }: SubmissionsClientProps) {
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [selectedSub, setSelectedSub]   = useState<Record<string, unknown> | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  function openScoreSheet(sub: Record<string, unknown>) {
    setSelectedSub(sub)
    setSheetOpen(true)
  }

  const filtered = statusFilter === 'all'
    ? submissions
    : submissions.filter(s => String(s['status']) === statusFilter)

  const counts = {
    total:       submissions.length,
    scored:      submissions.filter(s => s['intellimatch_score'] != null).length,
    shortlisted: submissions.filter(s => s['status'] === 'shortlisted').length,
  }

  return (
    <div className="max-w-[1060px] mx-auto">
      {/* Score Explain Sheet */}
      {selectedSub && (
        <ScoreExplainSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          candidateName={(() => {
            const c = selectedSub['candidate'] as Record<string, string> | null
            return c ? `${c['first_name']} ${c['last_name']}` : 'Candidate'
          })()}
          jdTitle={String((selectedSub['jd'] as Record<string, unknown> | null)?.['title'] ?? '')}
          composite={typeof selectedSub['intellimatch_score'] === 'number'
            ? selectedSub['intellimatch_score'] : null}
          tfScore={typeof selectedSub['technical_fit_score'] === 'number'
            ? selectedSub['technical_fit_score'] : null}
          afScore={typeof selectedSub['auxiliary_fit_score'] === 'number'
            ? selectedSub['auxiliary_fit_score'] : null}
          snapshot={parseSnapshot(selectedSub['score_factor_snapshot'])}
          explanation={selectedSub['score_explanation']
            ? String(selectedSub['score_explanation']) : null}
          scoredAt={selectedSub['scored_at'] ? String(selectedSub['scored_at']) : null}
        />
      )}

      {/* Header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 mb-6">
        <h1 className="text-[24px] font-bold text-[#0F2147]">Submissions</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Candidates submitted by your agency partners
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Users,        label: 'Total Submissions', value: counts.total       },
          { icon: TrendingUp,   label: 'AI Scored',         value: counts.scored      },
          { icon: CheckCircle2, label: 'Shortlisted',       value: counts.shortlisted },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-[6px] bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <Icon size={18} className="text-[#0F2147]" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-[#0F2147]">{value}</p>
              <p className="text-[12px] text-[#6B7280]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB] mb-5">
        {['all', 'received', 'under_review', 'shortlisted', 'interview_scheduled', 'offer_made', 'rejected'].map(tab => (
          <button key={tab} onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2.5 text-[12px] font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'border-b-2 border-[#0F2147] text-[#0F2147]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}>
            {tab === 'all' ? 'All' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Submissions table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox size={40} className="text-[#D1D5DB] mb-3" />
          <p className="text-[14px] font-medium text-[#374151]">No submissions yet</p>
          <p className="text-[13px] text-[#6B7280] mt-1">
            Submissions from agency partners will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {['Candidate', 'Position', 'Agency', 'Status', 'IntelliMatch', 'Submitted'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, idx) => {
                const cand   = sub['candidate'] as Record<string, string> | null
                const jd     = sub['jd']        as Record<string, string> | null
                const agency = sub['agency']    as Record<string, string> | null
                const score  = typeof sub['intellimatch_score'] === 'number'
                  ? sub['intellimatch_score'] as number : null
                const scored = sub['scored_at'] != null

                return (
                  <tr key={String(sub['id'])}
                    className={`border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors ${
                      idx === filtered.length - 1 ? 'border-b-0' : ''
                    }`}>
                    {/* Candidate */}
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-semibold text-[#0F2147]">
                        {cand ? `${cand['first_name']} ${cand['last_name']}` : '—'}
                      </p>
                      <p className="text-[12px] text-[#9CA3AF]">{cand?.['current_title'] ?? ''}</p>
                    </td>
                    {/* Position */}
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] text-[#374151]">{jd?.['title'] ?? '—'}</p>
                      {jd?.['location_city'] && (
                        <p className="text-[12px] text-[#9CA3AF]">📍 {jd['location_city']}</p>
                      )}
                    </td>
                    {/* Agency */}
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] text-[#374151]">{agency?.['name'] ?? '—'}</p>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {statusBadge(String(sub['status']))}
                    </td>
                    {/* IntelliMatch score chip */}
                    <td className="px-4 py-3.5">
                      {scored && score !== null ? (
                        <button
                          onClick={() => openScoreSheet(sub)}
                          title="Click for full score breakdown"
                          style={{ background: scoreBg(score), color: scoreColor(score) }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold
                            hover:opacity-80 transition-opacity cursor-pointer border-0"
                        >
                          <TrendingUp size={11} />
                          {score}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[12px] text-[#9CA3AF]">
                          <Clock size={11} className="animate-pulse" />
                          Scoring…
                        </span>
                      )}
                    </td>
                    {/* Submitted */}
                    <td className="px-4 py-3.5">
                      <p className="text-[12px] text-[#6B7280]">
                        {sub['submitted_at']
                          ? formatDistanceToNow(new Date(String(sub['submitted_at'])), { addSuffix: true })
                          : '—'}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
