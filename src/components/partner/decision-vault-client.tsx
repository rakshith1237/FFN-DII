'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  SlidersHorizontal, BarChart2,
  CheckCircle2, AlertCircle,
  Shield, Loader2, ChevronDown, Calendar,
} from 'lucide-react'
import { InterviewSchedulingModal } from '@/components/partner/interview-scheduling-modal'
import { formatDistanceToNow } from 'date-fns'
import { shortlistCandidate }  from '@/lib/actions/submission/shortlist-candidate'
import { rejectCandidate }     from '@/lib/actions/submission/reject-candidate'
import {
  createOverrideRequest,
  OVERRIDE_REASON_CODES, OVERRIDE_REASON_LABELS,
  type OverrideReasonCode,
} from '@/lib/actions/override/create-override-request'
import ScoreExplainSheet from '@/components/partner/score-explain-sheet'
import { type FactorScore } from '@/lib/ai/intellimatch'

interface FactorSnapshotData {
  tf_score:  number
  af_score:  number
  composite: number
  factors:   FactorScore[]
}

interface JdContext {
  id:                     string
  title:                  string
  intellimatch_threshold: number
  location_type:          string
}

interface DecisionVaultClientProps {
  jd:          JdContext
  submissions: Record<string, unknown>[]
  overrides:   Record<string, unknown>[]
}

function parseSnapshot(raw: unknown): FactorSnapshotData | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r['composite'] !== 'number') return null
  return {
    composite: Number(r['composite']),
    tf_score:  Number(r['tf_score']  ?? 0),
    af_score:  Number(r['af_score']  ?? 0),
    factors:   Array.isArray(r['factors']) ? (r['factors'] as FactorScore[]) : [],
  }
}

function scoreColor(score: number): string {
  if (score >= 75) return '#16A34A'
  if (score >= 50) return '#D97706'
  return '#DC2626'
}

function scoreBg(score: number): string {
  if (score >= 75) return '#DCFCE7'
  if (score >= 50) return '#FEF3C7'
  return '#FEE2E2'
}

export default function DecisionVaultClient({ jd, submissions, overrides }: DecisionVaultClientProps) {
  const [sheetOpen,       setSheetOpen]       = useState(false)
  const [selectedSub,     setSelectedSub]     = useState<Record<string, unknown> | null>(null)
  const [pendingId,       setPendingId]       = useState<string | null>(null)
  const [toast,           setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [localStatuses,   setLocalStatuses]   = useState<Record<string, string>>({})
  const [localOverrides,  setLocalOverrides]  = useState<Record<string, { status: string; number: string }>>({})
  const [rejectTarget,    setRejectTarget]    = useState<string | null>(null)
  const [rejectNotes,     setRejectNotes]     = useState('')
  const [overrideTarget,  setOverrideTarget]  = useState<string | null>(null)
  const [overrideReason,  setOverrideReason]  = useState<OverrideReasonCode | ''>('')
  const [overrideJustif,  setOverrideJustif]  = useState('')
  const [overridePending, setOverridePending] = useState(false)
  const [scoreMin,        setScoreMin]        = useState(0)
  const [scoreMax,        setScoreMax]        = useState(100)
  const [agencyFilter,    setAgencyFilter]    = useState('')
  const [verifiedOnly,    setVerifiedOnly]    = useState(false)
  const [workTypeFilter,  setWorkTypeFilter]  = useState('')
  const [rateMaxFilter,   setRateMaxFilter]   = useState('')
  const [showFilters,     setShowFilters]     = useState(false)
  const [interviewModal,  setInterviewModal]  = useState<{
    submissionId:  string
    candidateId:   string
    candidateName: string
  } | null>(null)

  void workTypeFilter
  void setWorkTypeFilter

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const agencies = useMemo(() => {
    const seen   = new Set<string>()
    const result: Array<{ id: string; name: string }> = []
    for (const sub of submissions) {
      const agency   = sub['agency'] as Record<string, string> | null
      const agencyId = agency?.['id']
      if (agencyId && !seen.has(agencyId)) {
        seen.add(agencyId)
        result.push({ id: agencyId, name: agency['name'] ?? '' })
      }
    }
    return result
  }, [submissions])

  const filtered = useMemo(() => {
    return submissions.filter(sub => {
      const subId = String(sub['id'])
      if (localStatuses[subId] === 'rejected') return false

      const score = sub['intellimatch_score'] != null ? Number(sub['intellimatch_score']) : null
      if (score !== null && (score < scoreMin || score > scoreMax)) return false

      if (agencyFilter) {
        const agency = sub['agency'] as Record<string, string> | null
        if (agency?.['id'] !== agencyFilter) return false
      }

      if (verifiedOnly) {
        const certsData = sub['certs'] as unknown as {
          x_ffn_candidate_cert: Array<{ verification_status: string }>
        } | null
        const hasVerified = (certsData?.x_ffn_candidate_cert ?? []).some(
          c => c.verification_status === 'verified'
        )
        if (!hasVerified) return false
      }

      if (rateMaxFilter) {
        const cand    = sub['candidate'] as Record<string, unknown> | null
        const rateMax = Number(cand?.['rate_expectation_max'] ?? Infinity)
        if (rateMax > Number(rateMaxFilter)) return false
      }

      return true
    })
  }, [submissions, localStatuses, scoreMin, scoreMax, agencyFilter, verifiedOnly, rateMaxFilter])

  function getOverrideForSub(subId: string) {
    const localOvr = localOverrides[subId]
    if (localOvr) return localOvr
    const existing = overrides.find(o => String(o['submission_id']) === subId)
    if (!existing) return null
    return {
      status:      String(existing['status']      ?? ''),
      number:      String(existing['number']      ?? ''),
      reason_code: String(existing['reason_code'] ?? ''),
    }
  }

  async function handleShortlist(subId: string) {
    setPendingId(subId)
    const result = await shortlistCandidate(subId)
    setPendingId(null)
    if (result.error) { showToast(result.error, 'error'); return }
    setLocalStatuses(prev => ({ ...prev, [subId]: 'shortlisted' }))
    showToast('Candidate shortlisted.', 'success')
  }

  async function handleRejectConfirm() {
    if (!rejectTarget || !rejectNotes.trim()) return
    const targetId = rejectTarget
    setPendingId(targetId)
    const result = await rejectCandidate(targetId, rejectNotes.trim())
    setPendingId(null)
    setRejectTarget(null)
    setRejectNotes('')
    if (result.error) { showToast(result.error, 'error'); return }
    setLocalStatuses(prev => ({ ...prev, [targetId]: 'rejected' }))
    showToast('Candidate rejected.', 'success')
  }

  async function handleOverrideSubmit() {
    if (!overrideTarget || !overrideReason || overrideJustif.trim().length < 50) return
    const targetId = overrideTarget
    setOverridePending(true)
    const result = await createOverrideRequest(
      targetId,
      overrideReason as OverrideReasonCode,
      overrideJustif.trim(),
    )
    setOverridePending(false)
    if (result.error) { showToast(result.error, 'error'); return }
    setLocalOverrides(prev => ({
      ...prev,
      [targetId]: { status: 'requested', number: result.number ?? '' },
    }))
    setOverrideTarget(null)
    setOverrideReason('')
    setOverrideJustif('')
    showToast(`Override request ${result.number ?? ''} submitted.`, 'success')
  }

  const selectedSnapshot  = selectedSub ? parseSnapshot(selectedSub['score_factor_snapshot']) : null
  const selectedComposite = selectedSub?.['intellimatch_score'] != null
    ? Number(selectedSub['intellimatch_score']) : null
  const selectedCand = selectedSub?.['candidate'] as Record<string, string> | null

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[8px]
          shadow-lg text-white text-[13px] font-medium ${toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Score explain sheet */}
      <ScoreExplainSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        candidateName={selectedCand
          ? `${selectedCand['first_name'] ?? ''} ${selectedCand['last_name'] ?? ''}`.trim()
          : ''}
        jdTitle={jd.title}
        composite={selectedComposite}
        tfScore={selectedSnapshot ? Math.round(selectedSnapshot.tf_score) : null}
        afScore={selectedSnapshot ? Math.round(selectedSnapshot.af_score) : null}
        snapshot={selectedSnapshot}
        explanation={selectedSub?.['score_explanation'] != null
          ? String(selectedSub['score_explanation']) : null}
        scoredAt={selectedSub?.['scored_at'] != null
          ? String(selectedSub['scored_at']) : null}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="border-l-4 border-l-[#0F2147] pl-4 py-1">
          <h1 className="text-[22px] font-bold text-[#0F2147]">Decision Vault</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">{jd.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-[6px]
              border transition-colors ${showFilters
                ? 'border-[#0F2147] bg-[#0F2147] text-white'
                : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'}`}>
            <SlidersHorizontal size={14} /> Filters
          </button>
          <Link
            href={`/partner/jd/${jd.id}/decision-vault/analytics`}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-[6px]
              border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <BarChart2 size={14} /> Analytics
          </Link>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-6 grid grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
              Score Min
            </label>
            <input type="number" min={0} max={100} value={scoreMin}
              onChange={e => setScoreMin(Number(e.target.value))}
              className="w-full h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px]
                focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
              Score Max
            </label>
            <input type="number" min={0} max={100} value={scoreMax}
              onChange={e => setScoreMax(Number(e.target.value))}
              className="w-full h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px]
                focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
              Agency
            </label>
            <div className="relative">
              <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)}
                className="w-full h-9 px-3 pr-8 text-[13px] border border-[#D1D5DB] rounded-[6px]
                  appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]">
                <option value="">All agencies</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer mt-4">
              <input type="checkbox" checked={verifiedOnly}
                onChange={e => setVerifiedOnly(e.target.checked)}
                className="rounded accent-[#0F2147]" />
              <span className="text-[12px] font-medium text-[#374151]">Verified certs only</span>
            </label>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Max Rate ($/hr)
              </label>
              <input type="number" min={0} placeholder="Any"
                value={rateMaxFilter}
                onChange={e => setRateMaxFilter(e.target.value)}
                className="w-full h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px]
                  focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-[12px] text-[#9CA3AF] mb-4">
        <span>{filtered.length} candidate{filtered.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Threshold: <strong className="text-[#0F2147]">{jd.intellimatch_threshold}</strong></span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] font-medium text-[#374151]">No submissions match your filters</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Try adjusting the score range or agency filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const subId   = String(sub['id'])
            const cand    = sub['candidate'] as Record<string, unknown> | null
            const agency  = sub['agency']    as Record<string, string>  | null
            const localSt = localStatuses[subId]
            const status  = localSt ?? String(sub['status'] ?? '')
            const score   = sub['intellimatch_score'] != null   ? Number(sub['intellimatch_score'])   : null
            const tfScore = sub['technical_fit_score'] != null  ? Number(sub['technical_fit_score'])  : null
            const afScore = sub['auxiliary_fit_score'] != null  ? Number(sub['auxiliary_fit_score'])  : null
            const isPending = pendingId === subId
            const ovr       = getOverrideForSub(subId)
            const belowThreshold = score !== null && score < jd.intellimatch_threshold

            const certsData = sub['certs'] as unknown as {
              x_ffn_candidate_cert: Array<{ cert_name: string; verification_status: string }>
            } | null
            const certList = certsData?.x_ffn_candidate_cert ?? []

            const rateMin   = cand?.['rate_expectation_min'] != null ? Number(cand['rate_expectation_min']) : null
            const rateMax   = cand?.['rate_expectation_max'] != null ? Number(cand['rate_expectation_max']) : null
            const rateModel = cand?.['rate_model'] != null ? String(cand['rate_model']) : 'hourly'

            return (
              <div key={subId}
                className={`bg-white rounded-[8px] border p-4 transition-colors ${
                  status === 'shortlisted' ? 'border-[#BBF7D0]'
                  : status === 'rejected'  ? 'border-[#FECACA] opacity-60'
                  : 'border-[#E5E7EB]'
                }`}>
                <div className="flex items-start gap-4">
                  {/* Score chip */}
                  <button
                    onClick={() => { setSelectedSub(sub); setSheetOpen(true) }}
                    title="View IntelliMatch breakdown"
                    className="shrink-0 w-[58px] h-[58px] rounded-[8px] flex flex-col items-center
                      justify-center font-black text-[22px] leading-none hover:scale-105 transition-transform"
                    style={{
                      background: score !== null ? scoreBg(score)   : '#F3F4F6',
                      color:      score !== null ? scoreColor(score) : '#9CA3AF',
                    }}>
                    {score !== null ? score : '—'}
                    <span className="text-[9px] font-semibold mt-0.5 opacity-60">/100</span>
                  </button>

                  {/* Candidate info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[15px] font-bold text-[#0F2147] truncate">
                        {cand
                          ? `${String(cand['first_name'] ?? '')} ${String(cand['last_name'] ?? '')}`.trim()
                          : '—'}
                      </p>
                      {status === 'shortlisted' && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-bold">
                          ✓ Shortlisted
                        </span>
                      )}
                      {ovr?.status === 'requested' && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
                          Override Pending
                        </span>
                      )}
                      {ovr?.status === 'approved' && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-bold">
                          Override ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6B7280] truncate">
                      {cand?.['current_title'] != null ? String(cand['current_title']) : '—'} · {agency?.['name'] ?? '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {rateMin !== null && rateMax !== null && (
                        <span className="text-[11px] text-[#9CA3AF]">
                          ${rateMin}–${rateMax}/{rateModel === 'hourly' ? 'hr' : rateModel}
                        </span>
                      )}
                      {sub['submitted_at'] != null && (
                        <span className="text-[11px] text-[#9CA3AF]">
                          {formatDistanceToNow(new Date(String(sub['submitted_at'])), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    {/* TF / AF mini bars */}
                    {(tfScore !== null || afScore !== null) && (
                      <div className="mt-2 flex items-center gap-4">
                        {tfScore !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-[#6B7280] w-5">TF</span>
                            <div className="w-20 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${tfScore}%`, background: scoreColor(tfScore) }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: scoreColor(tfScore) }}>
                              {tfScore}
                            </span>
                          </div>
                        )}
                        {afScore !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-[#6B7280] w-5">AF</span>
                            <div className="w-20 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${afScore}%`, background: scoreColor(afScore) }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: scoreColor(afScore) }}>
                              {afScore}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cert badges */}
                    {certList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {certList.map((cert, i) => (
                          <span key={i}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              cert.verification_status === 'verified'
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : 'bg-[#F3F4F6] text-[#9CA3AF]'
                            }`}>
                            {cert.verification_status === 'verified' && <Shield size={8} />}
                            {cert.cert_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {status !== 'rejected' && (
                    <div className="shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => void handleShortlist(subId)}
                        disabled={isPending || status === 'shortlisted'}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold
                          text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460]
                          disabled:opacity-40 transition-colors">
                        {isPending
                          ? <Loader2 size={11} className="animate-spin" />
                          : <CheckCircle2 size={11} />}
                        {status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
                      </button>
                      {status === 'shortlisted' && (
                        <button
                          onClick={() => setInterviewModal({
                            submissionId:  subId,
                            candidateId:   String(cand?.['id'] ?? ''),
                            candidateName: cand
                              ? `${String(cand['first_name'] ?? '')} ${String(cand['last_name'] ?? '')}`.trim()
                              : '',
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold
                            text-white bg-green-700 rounded-[6px] hover:bg-green-800 transition-colors">
                          <Calendar size={11} />
                          Schedule Interview
                        </button>
                      )}
                      <button
                        onClick={() => { setRejectTarget(subId); setRejectNotes('') }}
                        disabled={isPending}
                        className="px-3 py-1.5 text-[12px] font-semibold text-[#DC2626]
                          border border-[#DC2626] rounded-[6px] hover:bg-[#FEE2E2]
                          disabled:opacity-40 transition-colors">
                        Reject
                      </button>
                      {belowThreshold && !ovr && (
                        <button
                          onClick={() => { setOverrideTarget(subId); setOverrideReason(''); setOverrideJustif('') }}
                          disabled={isPending}
                          className="px-3 py-1.5 text-[12px] font-semibold text-[#D97706]
                            border border-[#D97706] rounded-[6px] hover:bg-[#FEF3C7]
                            disabled:opacity-40 transition-colors">
                          Request Override
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true">
          <div className="bg-white rounded-[8px] w-full max-w-[440px] p-6 shadow-xl">
            <h3 className="text-[16px] font-bold text-[#0F2147] mb-1">Reject Candidate</h3>
            <p className="text-[13px] text-[#6B7280] mb-4">Provide a reason for rejection.</p>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Candidate rate expectations exceed budget for this engagement."
              className="w-full px-3 py-2 text-[13px] border border-[#D1D5DB] rounded-[6px]
                resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6] mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)}
                className="flex-1 py-2 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
                Cancel
              </button>
              <button
                onClick={() => void handleRejectConfirm()}
                disabled={!rejectNotes.trim() || pendingId === rejectTarget}
                className="flex-1 py-2 text-[13px] font-semibold text-white bg-[#DC2626] rounded-[6px]
                  hover:bg-[#b91c1c] disabled:opacity-40">
                {pendingId === rejectTarget ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview scheduling modal */}
      {interviewModal && (
        <InterviewSchedulingModal
          open={true}
          onClose={() => setInterviewModal(null)}
          submissionId={interviewModal.submissionId}
          jdId={jd.id}
          candidateId={interviewModal.candidateId}
          candidateName={interviewModal.candidateName}
          jdTitle={jd.title}
        />
      )}

      {/* Override modal */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true">
          <div className="bg-white rounded-[8px] w-full max-w-[480px] p-6 shadow-xl">
            <h3 className="text-[16px] font-bold text-[#0F2147] mb-1">Request Score Override</h3>
            <p className="text-[13px] text-[#6B7280] mb-4">
              Justify why this candidate should advance despite scoring below the threshold.
            </p>
            <div className="relative mb-3">
              <select value={overrideReason}
                onChange={e => setOverrideReason(e.target.value as OverrideReasonCode)}
                className="w-full h-10 px-3 pr-8 text-[13px] border border-[#D1D5DB] rounded-[6px]
                  appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]">
                <option value="">Select reason</option>
                {OVERRIDE_REASON_CODES.map(code => (
                  <option key={code} value={code}>{OVERRIDE_REASON_LABELS[code]}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
            <textarea
              value={overrideJustif}
              onChange={e => setOverrideJustif(e.target.value)}
              rows={4}
              placeholder="Minimum 50 characters. Explain the business justification for this override."
              className="w-full px-3 py-2 text-[13px] border border-[#D1D5DB] rounded-[6px]
                resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6] mb-1"
            />
            <p className={`text-[11px] mb-4 ${overrideJustif.trim().length < 50 ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`}>
              {overrideJustif.trim().length}/50 characters minimum
            </p>
            <div className="flex gap-3">
              <button onClick={() => setOverrideTarget(null)}
                className="flex-1 py-2 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
                Cancel
              </button>
              <button
                onClick={() => void handleOverrideSubmit()}
                disabled={!overrideReason || overrideJustif.trim().length < 50 || overridePending}
                className="flex-1 py-2 text-[13px] font-semibold text-white bg-[#D97706] rounded-[6px]
                  hover:bg-[#b45309] disabled:opacity-40">
                {overridePending ? 'Submitting…' : 'Submit Override Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
