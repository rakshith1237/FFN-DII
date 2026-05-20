'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'

interface AssignmentCard {
  id:                     string
  jd_id:                  string
  submission_quota:       number
  submissions_used:       number
  target_submission_date: string
  notes:                  string | null
  status:                 string
  assigned_at:            string
  x_ffn_jd: {
    id:               string
    title:            string
    location_city:    string | null
    work_arrangement: string | null
    start_date:       string | null
    tenant_id:        string
    partner_tenant:   { name: string } | null
  } | null
}

interface RequirementsClientProps {
  assignments: Record<string, unknown>[]
  isArm:       boolean
}

type FilterStatus = 'active' | 'completed' | 'all'
type SortKey = 'target_date' | 'title' | 'quota_remaining'

function dateUrgencyClass(dateStr: string): string {
  const date = new Date(dateStr)
  if (isPast(date)) return 'bg-[#FEE2E2] text-[#991B1B]'
  const days = differenceInDays(date, new Date())
  if (days <= 3) return 'bg-[#FEF3C7] text-[#92400E]'
  return 'bg-[#DCFCE7] text-[#166534]'
}

void formatDistanceToNow

export default function RequirementsClient({ assignments, isArm }: RequirementsClientProps) {
  const cards = assignments as unknown as AssignmentCard[]

  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('active')
  const [sortKey, setSortKey]             = useState<SortKey>('target_date')
  const [search, setSearch]               = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  function toggleNotes(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = cards
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c => !search.trim() || c.x_ffn_jd?.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'target_date') {
        return new Date(a.target_submission_date).getTime() - new Date(b.target_submission_date).getTime()
      }
      if (sortKey === 'title') {
        return (a.x_ffn_jd?.title ?? '').localeCompare(b.x_ffn_jd?.title ?? '')
      }
      const aRem = a.submission_quota - a.submissions_used
      const bRem = b.submission_quota - b.submissions_used
      return aRem - bRem
    })

  const counts = {
    active:    cards.filter(c => c.status === 'active').length,
    completed: cards.filter(c => c.status === 'completed').length,
    all:       cards.length,
  }

  return (
    <div className="max-w-[960px] mx-auto">

      {/* Header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 mb-6">
        <h1 className="text-[24px] font-bold text-[#0F2147]">My Active Requirements</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          {isArm ? 'All recruiter assignments for your agency' : 'Job Descriptions assigned to you'}
        </p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Status filter tabs */}
        <div className="flex gap-1 border border-[#E5E7EB] rounded-[6px] p-0.5 bg-[#F9FAFB]">
          {(['active', 'completed', 'all'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-[4px] capitalize transition-colors ${
                filterStatus === f ? 'bg-white text-[#0F2147] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {f} <span className="ml-1 opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          aria-label="Sort by"
        >
          <option value="target_date">Sort: Target Date</option>
          <option value="title">Sort: JD Title</option>
          <option value="quota_remaining">Sort: Quota Remaining</option>
        </select>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by JD title…"
          className="flex-1 h-9 px-3 text-[13px] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          aria-label="Search requirements"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={40} className="text-[#D1D5DB] mb-3" />
          <p className="text-[14px] font-medium text-[#374151]">No requirements found</p>
          <p className="text-[13px] text-[#6B7280] mt-1">
            {filterStatus === 'active'
              ? 'No active assignments yet. Your Recruiting Manager will assign JDs to you.'
              : `No ${filterStatus} assignments match your search.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(card => {
            const jd           = card.x_ffn_jd
            const remaining    = card.submission_quota - card.submissions_used
            const pct          = Math.min(100, Math.round((card.submissions_used / card.submission_quota) * 100))
            const quotaReached = remaining <= 0
            const notesExpanded = expandedNotes.has(card.id)
            const notesShort   = card.notes !== null && card.notes.length > 120
            const notesDisplay = card.notes
              ? (notesExpanded || !notesShort ? card.notes : card.notes.slice(0, 120) + '…')
              : null

            return (
              <div key={card.id} className="bg-white rounded-[8px] border border-[#E5E7EB] p-5 shadow-sm">
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0F2147]">
                      {jd?.title ?? 'Untitled JD'}
                    </h3>
                    <p className="text-[13px] text-[#6B7280] mt-0.5">
                      {jd?.partner_tenant?.name ?? 'Partner Organisation'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      card.status === 'active'    ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                      : card.status === 'completed' ? 'bg-[#DCFCE7] text-[#166534]'
                      : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {card.status}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${dateUrgencyClass(card.target_submission_date)}`}>
                      Due {new Date(card.target_submission_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Metadata chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {jd?.location_city && (
                    <span className="px-2.5 py-1 bg-[#F3F4F6] text-[#374151] rounded-full text-[12px]">
                      📍 {jd.location_city}
                    </span>
                  )}
                  {jd?.work_arrangement && (
                    <span className="px-2.5 py-1 bg-[#F3F4F6] text-[#374151] rounded-full text-[12px] capitalize">
                      {jd.work_arrangement}
                    </span>
                  )}
                  {jd?.start_date && (
                    <span className="px-2.5 py-1 bg-[#F3F4F6] text-[#374151] rounded-full text-[12px]">
                      Start: {jd.start_date}
                    </span>
                  )}
                </div>

                {/* Quota progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-[#374151]">
                      Submissions: {card.submissions_used} / {card.submission_quota}
                    </span>
                    <span className="text-[12px] text-[#6B7280]">
                      {remaining} remaining
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        quotaReached   ? 'bg-[#DC2626]'
                        : remaining === 1 ? 'bg-[#D97706]'
                        : 'bg-[#16A34A]'
                      }`}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={card.submissions_used}
                      aria-valuemax={card.submission_quota}
                      aria-label="Submission progress"
                    />
                  </div>
                </div>

                {/* ARM Notes */}
                {notesDisplay && (
                  <div className="mb-4 p-3 bg-[#FFFBEB] border border-[#FEF3C7] rounded-[6px]">
                    <p className="text-[11px] font-semibold text-[#92400E] uppercase tracking-wide mb-1">
                      Instructions from ARM
                    </p>
                    <p className="text-[13px] text-[#374151]">{notesDisplay}</p>
                    {notesShort && (
                      <button
                        type="button"
                        onClick={() => toggleNotes(card.id)}
                        className="flex items-center gap-1 mt-1.5 text-[12px] text-[#D97706] font-medium"
                      >
                        {notesExpanded
                          ? <><ChevronUp size={12} /> Show less</>
                          : <><ChevronDown size={12} /> Read more</>
                        }
                      </button>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="flex items-center justify-end pt-3 border-t border-[#F3F4F6]">
                  {quotaReached ? (
                    <span className="text-[13px] text-[#DC2626] font-semibold">
                      Quota reached — contact your ARM to increase
                    </span>
                  ) : (
                    <Link
                      href={`/agency/jd/${card.jd_id}/submit`}
                      className="px-5 py-2 text-[13px] font-semibold text-white bg-[#E8531E] rounded-[6px] hover:bg-[#d44718] transition-colors"
                    >
                      Submit Candidate →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
