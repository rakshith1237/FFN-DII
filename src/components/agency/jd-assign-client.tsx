'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react'
import { assignJD, type AssignmentInput } from '@/lib/actions/agency/assign-jd'

interface JdContext {
  id:               string
  title:            string
  location_city:    string | null
  work_arrangement: string | null
  start_date:       string | null
  required_skills:  string | null
}

interface RecruiterRow {
  id:        string
  full_name: string | null
  email:     string | null
}

interface ExistingAssignment {
  recruiter_id:           string
  submission_quota:       number
  submissions_used:       number
  target_submission_date: string
  notes:                  string | null
  status:                 string
}

interface JdAssignClientProps {
  jd:                  JdContext
  broadcastId:         string
  partnerName:         string
  recruiters:          RecruiterRow[]
  existingAssignments: ExistingAssignment[]
}

type RecruiterState = {
  checked:    boolean
  quota:      string
  targetDate: string
  notes:      string
}

export default function JdAssignClient({
  jd,
  broadcastId,
  partnerName,
  recruiters,
  existingAssignments,
}: JdAssignClientProps) {
  const router = useRouter()

  function initState(): Record<string, RecruiterState> {
    const state: Record<string, RecruiterState> = {}
    for (const r of recruiters) {
      const existing = existingAssignments.find(e => e.recruiter_id === r.id && e.status === 'active')
      state[r.id] = {
        checked:    !!existing,
        quota:      existing ? String(existing.submission_quota) : '',
        targetDate: existing ? existing.target_submission_date : '',
        notes:      existing?.notes ?? '',
      }
    }
    return state
  }

  const [recState, setRecState] = useState<Record<string, RecruiterState>>(initState)
  const [isPending, setIsPending] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  function updateRec(id: string, field: keyof RecruiterState, value: string | boolean) {
    setRecState(prev => ({ ...prev, [id]: { ...prev[id]!, [field]: value } }))
  }

  const checkedIds = recruiters.filter(r => recState[r.id]?.checked).map(r => r.id)
  const totalQuota = checkedIds.reduce((sum, id) => sum + (parseInt(recState[id]?.quota ?? '0', 10) || 0), 0)
  const canConfirm = checkedIds.length > 0 &&
    checkedIds.every(id => {
      const s = recState[id]!
      return s.quota.trim() !== '' &&
             parseInt(s.quota, 10) >= 1 &&
             s.targetDate.trim() !== ''
    }) && !isPending

  async function handleConfirm() {
    setIsPending(true)
    setError(null)
    const assignments: AssignmentInput[] = checkedIds.map(id => ({
      recruiterId:          id,
      submissionQuota:      parseInt(recState[id]!.quota, 10),
      targetSubmissionDate: recState[id]!.targetDate,
      notes:                recState[id]!.notes,
    }))
    const result = await assignJD(broadcastId, jd.id, jd.title, assignments)
    setIsPending(false)
    if (result.error) { setError(result.error); return }
    setConfirmed(true)
  }

  if (confirmed) {
    return (
      <div className="max-w-[720px] mx-auto py-16 text-center">
        <CheckCircle2 size={48} className="text-[#16A34A] mx-auto mb-4" />
        <h2 className="text-[22px] font-bold text-[#0F2147] mb-2">
          Assignments confirmed for {jd.title}
        </h2>
        <p className="text-[14px] text-[#6B7280] mb-6">
          {checkedIds.length} recruiter{checkedIds.length !== 1 ? 's' : ''} assigned.
          They will receive an email notification shortly.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/agency/jd-inbox"
            className="px-5 py-2.5 text-[13px] font-semibold text-[#0F2147] border border-[#0F2147] rounded-[6px] hover:bg-[#EFF6FF] transition-colors">
            My Job Descriptions
          </Link>
          <Link href="/agency/pipeline"
            className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] transition-colors">
            View Team Pipeline →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto pb-28">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-6">
        <Link href="/agency/jd-inbox" className="flex items-center gap-1 hover:text-[#374151]">
          <ArrowLeft size={14} /> My Job Descriptions
        </Link>
        <span>/</span>
        <span className="text-[#374151] font-medium">{jd.title}</span>
        <span>/</span>
        <span>Assign Recruiters</span>
      </div>

      {/* JD context card */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-[16px] font-bold text-[#0F2147]">{jd.title}</span>
        <span className="text-[#D1D5DB]">|</span>
        <span className="text-[14px] text-[#374151]">{partnerName}</span>
        {jd.location_city && (
          <>
            <span className="text-[#D1D5DB]">|</span>
            <span className="text-[13px] text-[#6B7280]">{jd.location_city}</span>
          </>
        )}
        {jd.work_arrangement && (
          <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#374151] rounded-full text-[12px] capitalize">
            {jd.work_arrangement}
          </span>
        )}
        {jd.start_date && (
          <span className="text-[13px] text-[#6B7280]">Start: {jd.start_date}</span>
        )}
      </div>

      {/* Recruiter list */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-[#0F2147]">
            Select Recruiters and Configure Assignments
          </h2>
          <div className="flex gap-3 text-[13px] text-[#3B82F6]">
            <button type="button"
              onClick={() => setRecState(prev => {
                const next = { ...prev }
                for (const r of recruiters) next[r.id] = { ...next[r.id]!, checked: true }
                return next
              })}>
              Select All
            </button>
            <button type="button"
              onClick={() => setRecState(prev => {
                const next = { ...prev }
                for (const r of recruiters) next[r.id] = { ...next[r.id]!, checked: false }
                return next
              })}>
              Deselect All
            </button>
          </div>
        </div>
        <p className="text-[13px] italic text-[#6B7280] mb-4">
          Check a recruiter to assign this Job Description. Set quota, target date, and notes individually.
        </p>

        {recruiters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[8px] border border-[#E5E7EB]">
            <User size={32} className="text-[#D1D5DB] mx-auto mb-3" />
            <p className="text-[14px] font-medium text-[#374151]">No recruiters found</p>
            <p className="text-[13px] text-[#6B7280] mt-1">
              Add Agency Recruiter accounts to your team first.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recruiters.map(r => {
              const s = recState[r.id]!
              const existing = existingAssignments.find(e => e.recruiter_id === r.id && e.status === 'active')
              return (
                <div key={r.id}
                  className={`bg-white rounded-[8px] border transition-all ${
                    s.checked ? 'border-[#0F2147] shadow-sm' : 'border-[#E5E7EB]'
                  }`}>
                  {/* Recruiter header row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <input
                      id={`rec-${r.id}`}
                      type="checkbox"
                      checked={s.checked}
                      onChange={e => updateRec(r.id, 'checked', e.target.checked)}
                      className="w-4 h-4 accent-[#0F2147]"
                    />
                    <label htmlFor={`rec-${r.id}`} className="flex-1 cursor-pointer">
                      <span className="text-[14px] font-semibold text-[#374151]">
                        {r.full_name ?? r.email ?? r.id}
                      </span>
                      {r.email && (
                        <span className="ml-2 text-[12px] text-[#9CA3AF]">{r.email}</span>
                      )}
                    </label>
                    {existing && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#DCFCE7] text-[#166534] rounded-full">
                        Already assigned — {existing.submissions_used}/{existing.submission_quota} submitted
                      </span>
                    )}
                  </div>

                  {/* Expanded fields when checked */}
                  {s.checked && (
                    <div className="grid grid-cols-3 gap-4 px-4 pb-4 border-t border-[#F3F4F6] pt-4">
                      <div>
                        <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                          Submission Quota <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={s.quota}
                          onChange={e => updateRec(r.id, 'quota', e.target.value)}
                          placeholder="e.g. 3"
                          aria-label={`Quota for ${r.full_name ?? r.id}`}
                          className="w-full h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                          Target Date <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="date"
                          value={s.targetDate}
                          onChange={e => updateRec(r.id, 'targetDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          aria-label={`Target date for ${r.full_name ?? r.id}`}
                          className="w-full h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={s.notes}
                          onChange={e => updateRec(r.id, 'notes', e.target.value)}
                          maxLength={1000}
                          placeholder="Instructions for this recruiter…"
                          aria-label={`Notes for ${r.full_name ?? r.id}`}
                          className="w-full h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 p-3.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
          <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] z-40 px-6 py-4 flex items-center justify-between">
        <p className="text-[14px] font-bold text-[#0F2147]">
          {checkedIds.length} recruiter{checkedIds.length !== 1 ? 's' : ''} selected
          {checkedIds.length > 0 && ` — Total combined quota: ${totalQuota}`}
        </p>
        <div className="flex gap-3">
          <Link href="/agency/jd-inbox"
            className="px-4 py-2.5 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors">
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? 'Confirming…' : 'Confirm Assignments'}
          </button>
        </div>
      </div>
    </div>
  )
}
