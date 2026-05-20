'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Inbox, Clock, CheckCircle2, XCircle, ChevronDown, AlertCircle } from 'lucide-react'
import { acceptJD } from '@/lib/actions/agency/accept-jd'
import { declineJD } from '@/lib/actions/agency/decline-jd'
import { DECLINE_REASONS, type DeclineReason } from '@/lib/types/broadcast'

interface JdEntry {
  id:               string
  jd_id:            string
  tier:             number
  status:           string
  sent_at:          string | null
  responded_at:     string | null
  decline_reason:   string | null
  created_at:       string
  x_ffn_jd: {
    title:            string
    required_skills:  string | null
    location_city:    string | null
    work_arrangement: string | null
    start_date:       string | null
  } | null
  partner_tenant: { name: string } | null
}

interface JdInboxClientProps {
  broadcasts: JdEntry[]
}

const SLA_HOURS = 48

function getSlaDeadline(sentAt: string | null): Date | null {
  if (!sentAt) return null
  return new Date(new Date(sentAt).getTime() + SLA_HOURS * 3600000)
}

function getSlaChipClass(deadline: Date | null): string {
  if (!deadline) return 'bg-[#F3F4F6] text-[#6B7280]'
  const hoursLeft = (deadline.getTime() - Date.now()) / 3600000
  if (hoursLeft < 0)  return 'bg-[#FEE2E2] text-[#991B1B]'
  if (hoursLeft < 24) return 'bg-[#FEF3C7] text-[#92400E]'
  return 'bg-[#DCFCE7] text-[#166534]'
}

function getSlaLabel(deadline: Date | null): string {
  if (!deadline) return 'No SLA'
  const hoursLeft = (deadline.getTime() - Date.now()) / 3600000
  if (hoursLeft < 0) return 'SLA Breached'
  return `SLA: ${formatDistanceToNow(deadline, { addSuffix: true })}`
}

function TierBadge({ tier }: { tier: number }) {
  const cls =
    tier === 1 ? 'bg-[#0F2147] text-white' :
    tier === 2 ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                 'bg-[#CCFBF1] text-[#0F766E]'
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls}`}>
      Tier {tier}
    </span>
  )
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'declined'

export default function JdInboxClient({ broadcasts }: JdInboxClientProps) {
  const [items, setItems]                 = useState<JdEntry[]>(broadcasts)
  const [filter, setFilter]               = useState<FilterTab>('all')
  const [pendingId, setPendingId]         = useState<string | null>(null)
  const [declineTarget, setDeclineTarget] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState<DeclineReason | ''>('')
  const [toast, setToast]                 = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAccept(broadcastId: string) {
    setPendingId(broadcastId)
    const result = await acceptJD(broadcastId)
    setPendingId(null)
    if (result.error) { showToast(result.error, 'error'); return }
    setItems(prev => prev.map(i => i.id === broadcastId ? { ...i, status: 'accepted' } : i))
    showToast('JD accepted. You can now assign recruiters.', 'success')
  }

  async function handleDeclineConfirm() {
    if (!declineTarget || !declineReason) return
    const targetId = declineTarget
    const reason   = declineReason as DeclineReason
    setPendingId(targetId)
    const result = await declineJD(targetId, reason)
    setPendingId(null)
    setDeclineTarget(null)
    setDeclineReason('')
    if (result.error) { showToast(result.error, 'error'); return }
    setItems(prev => prev.map(i =>
      i.id === targetId ? { ...i, status: 'declined', decline_reason: reason } : i
    ))
    showToast('JD declined.', 'success')
  }

  const filtered = items.filter(i => filter === 'all' || i.status === filter)
  const counts: Record<FilterTab, number> = {
    all:      items.length,
    pending:  items.filter(i => i.status === 'pending').length,
    accepted: items.filter(i => i.status === 'accepted').length,
    declined: items.filter(i => i.status === 'declined').length,
  }

  return (
    <div className="max-w-[960px] mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[8px] shadow-lg text-white text-[13px] font-medium ${
          toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 mb-6">
        <h1 className="text-[24px] font-bold text-[#0F2147]">JD Inbox</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">Job Descriptions broadcast to your agency</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6">
        {(['all', 'pending', 'accepted', 'declined'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium capitalize transition-colors ${
              filter === tab
                ? 'border-b-2 border-[#D97706] text-[#D97706]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tab}
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
              filter === tab ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox size={40} className="text-[#D1D5DB] mb-3" />
          <p className="text-[14px] font-medium text-[#374151]">No items</p>
          <p className="text-[13px] text-[#6B7280] mt-1">
            {filter === 'all'
              ? 'No JDs have been broadcast to your agency yet'
              : `No ${filter} JDs`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const jd          = item.x_ffn_jd
            const partnerName = item.partner_tenant?.name ?? 'Partner Organisation'
            const deadline    = getSlaDeadline(item.sent_at)
            const skillTags   = jd?.required_skills
              ? jd.required_skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5)
              : []
            const isItemPending = pendingId === item.id

            return (
              <div key={item.id} className="bg-white rounded-[8px] border border-[#E5E7EB] p-5 shadow-sm">
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0F2147]">
                      {jd?.title ?? 'Untitled JD'}
                    </h3>
                    <p className="text-[13px] text-[#6B7280] mt-0.5">{partnerName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TierBadge tier={item.tier} />
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getSlaChipClass(deadline)}`}>
                      {getSlaLabel(deadline)}
                    </span>
                  </div>
                </div>

                {/* Metadata chips */}
                <div className="flex flex-wrap gap-2 mb-3">
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

                {/* Skill chips */}
                {skillTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {skillTags.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-[#DBEAFE] text-[#1D4ED8] rounded-full text-[11px] font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Accepted panel */}
                {item.status === 'accepted' && (
                  <div className="flex items-center justify-between p-3 bg-[#DCFCE7] rounded-[6px] border border-[#BBF7D0]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#16A34A]" />
                      <span className="text-[13px] font-semibold text-[#166534]">Accepted</span>
                    </div>
                    <a
                      href={`/agency/jd/${item.jd_id}/assign`}
                      className="px-4 py-1.5 text-[12px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] transition-colors"
                    >
                      Assign Recruiters →
                    </a>
                  </div>
                )}

                {/* Declined panel */}
                {item.status === 'declined' && (
                  <div className="flex items-center gap-2 p-3 bg-[#FEE2E2] rounded-[6px]">
                    <XCircle size={15} className="text-[#DC2626]" />
                    <span className="text-[13px] font-semibold text-[#991B1B]">
                      Declined — {item.decline_reason}
                    </span>
                  </div>
                )}

                {/* Pending actions */}
                {item.status === 'pending' && (
                  <div className="flex items-center gap-3 pt-3 border-t border-[#F3F4F6]">
                    <button
                      onClick={() => { setDeclineTarget(item.id); setDeclineReason('') }}
                      disabled={isItemPending}
                      className="px-4 py-2 text-[13px] font-semibold text-[#DC2626] border border-[#DC2626] rounded-[6px] hover:bg-[#FEE2E2] disabled:opacity-40 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(item.id)}
                      disabled={isItemPending}
                      className="px-6 py-2 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 transition-colors flex items-center gap-2"
                    >
                      {isItemPending
                        ? <><Clock size={13} className="animate-spin" />Accepting…</>
                        : 'Accept JD'
                      }
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Decline modal */}
      {declineTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-modal-title"
        >
          <div className="bg-white rounded-[8px] w-full max-w-[400px] p-6 shadow-xl">
            <h3 id="decline-modal-title" className="text-[16px] font-bold text-[#0F2147] mb-1">
              Decline Job Description
            </h3>
            <p className="text-[13px] text-[#6B7280] mb-4">
              Select a reason. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label htmlFor="decline-reason" className="block text-[13px] font-bold text-[#374151] mb-1.5">
                Reason <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <select
                  id="decline-reason"
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value as DeclineReason | '')}
                  className="w-full h-10 px-3 pr-8 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="" disabled>Select a reason</option>
                  {DECLINE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeclineTarget(null); setDeclineReason('') }}
                className="flex-1 py-2 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineConfirm}
                disabled={!declineReason || pendingId === declineTarget}
                className="flex-1 py-2 text-[13px] font-semibold text-white bg-[#DC2626] rounded-[6px] hover:bg-[#b91c1c] disabled:opacity-40 transition-colors"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
