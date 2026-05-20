'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, Clock, AlertCircle,
  Inbox, ChevronDown, Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { approveRTR } from '@/lib/actions/rtr/approve-rtr'
import { rejectRTR }  from '@/lib/actions/rtr/reject-rtr'

interface RtrEntry {
  id:         string
  number:     string
  status:     string
  signed_at:  string | null
  created_at: string
  candidate:  { first_name: string; last_name: string; email: string; current_title: string | null } | null
  jd:         { title: string; location_city: string | null } | null
  partner:    { name: string } | null
  _approvedSubRef?: string
  _rejected?:       boolean
  _rejectReason?:   string
}

interface RtrInboxClientProps {
  rtrs: Record<string, unknown>[]
}

export default function RtrInboxClient({ rtrs: rawRtrs }: RtrInboxClientProps) {
  const [items, setItems]               = useState<RtrEntry[]>(rawRtrs as unknown as RtrEntry[])
  const [pendingId, setPendingId]       = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [filter, setFilter]             = useState<'all' | 'signed' | 'sent'>('all')

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove(rtrId: string) {
    setPendingId(rtrId)
    const result = await approveRTR(rtrId)
    setPendingId(null)
    if (result.error) { showToast(result.error, 'error'); return }
    setItems(prev => prev.map(r =>
      r.id === rtrId
        ? { ...r, _approvedSubRef: result.subNumber ?? '' }
        : r
    ))
    showToast(`Approved — Submission ${result.subNumber} created. Partner notified.`, 'success')
  }

  async function handleRejectConfirm() {
    if (!rejectTarget || !rejectReason.trim()) return
    setPendingId(rejectTarget)
    const result = await rejectRTR(rejectTarget, rejectReason.trim())
    setPendingId(null)
    setRejectTarget(null)
    setRejectReason('')
    if (result.error) { showToast(result.error, 'error'); return }
    setItems(prev => prev.map(r =>
      r.id === rejectTarget
        ? { ...r, _rejected: true, _rejectReason: rejectReason.trim() }
        : r
    ))
    showToast('RTR rejected.', 'success')
  }

  const filtered = items.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const counts = {
    all:    items.length,
    signed: items.filter(r => r.status === 'signed').length,
    sent:   items.filter(r => r.status === 'sent').length,
  }

  return (
    <div className="max-w-[920px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[8px] shadow-lg text-white text-[13px] font-medium ${toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 mb-6">
        <h1 className="text-[24px] font-bold text-[#0F2147]">RTR Inbox</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Review signed RTRs and approve submissions
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6">
        {(['all', 'signed', 'sent'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium capitalize transition-colors ${
              filter === tab
                ? 'border-b-2 border-[#D97706] text-[#D97706]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tab === 'signed' ? '✓ Signed' : tab === 'sent' ? '✉ Awaiting Signature' : 'All'}
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
          <p className="text-[14px] font-medium text-[#374151]">No RTRs</p>
          <p className="text-[13px] text-[#6B7280] mt-1">
            {filter === 'signed'
              ? 'No signed RTRs awaiting approval'
              : 'No RTRs in this category'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(rtr => {
            const candidateName = rtr.candidate
              ? `${rtr.candidate.first_name} ${rtr.candidate.last_name}`
              : 'Unknown Candidate'
            const isPending = pendingId === rtr.id

            return (
              <div key={rtr.id}
                className={`bg-white rounded-[8px] border p-5 shadow-sm transition-colors ${
                  rtr._approvedSubRef ?? rtr._rejected
                    ? 'border-[#E5E7EB] opacity-75'
                    : rtr.status === 'signed'
                      ? 'border-[#BBF7D0]'
                      : 'border-[#E5E7EB]'
                }`}>
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-bold text-[#0F2147]">{candidateName}</h3>
                      {rtr.status === 'signed' && !rtr._approvedSubRef && !rtr._rejected && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#166534]">
                          ✓ Signed
                        </span>
                      )}
                      {rtr.status === 'sent' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8] flex items-center gap-1">
                          <Clock size={10} /> Awaiting Signature
                        </span>
                      )}
                    </div>
                    {rtr.candidate?.current_title && (
                      <p className="text-[13px] text-[#6B7280]">{rtr.candidate.current_title}</p>
                    )}
                    <p className="text-[12px] text-[#9CA3AF]">{rtr.candidate?.email ?? ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono text-[#9CA3AF]">{rtr.number}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      {formatDistanceToNow(new Date(rtr.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* JD + Partner */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-[#F3F4F6]">
                  <div>
                    <p className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wide">Position</p>
                    <p className="text-[13px] font-medium text-[#374151]">{rtr.jd?.title ?? '—'}</p>
                    {rtr.jd?.location_city && (
                      <p className="text-[12px] text-[#9CA3AF]">📍 {rtr.jd.location_city}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wide">Partner</p>
                    <p className="text-[13px] font-medium text-[#374151]">{rtr.partner?.name ?? '—'}</p>
                    {rtr.signed_at && (
                      <p className="text-[12px] text-[#16A34A]">
                        Signed {formatDistanceToNow(new Date(rtr.signed_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action area */}
                {rtr._approvedSubRef && (
                  <div className="flex items-center gap-2 p-3 bg-[#DCFCE7] rounded-[6px]">
                    <CheckCircle2 size={15} className="text-[#16A34A]" />
                    <span className="text-[13px] font-semibold text-[#166534]">
                      Approved — Submission {rtr._approvedSubRef} created
                    </span>
                  </div>
                )}

                {rtr._rejected && (
                  <div className="flex items-center gap-2 p-3 bg-[#FEE2E2] rounded-[6px]">
                    <XCircle size={15} className="text-[#DC2626]" />
                    <span className="text-[13px] font-semibold text-[#991B1B]">
                      Rejected — {rtr._rejectReason}
                    </span>
                  </div>
                )}

                {!rtr._approvedSubRef && !rtr._rejected && rtr.status === 'signed' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setRejectTarget(rtr.id); setRejectReason('') }}
                      disabled={isPending}
                      className="px-4 py-2 text-[13px] font-semibold text-[#DC2626] border border-[#DC2626] rounded-[6px] hover:bg-[#FEE2E2] disabled:opacity-40 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => void handleApprove(rtr.id)}
                      disabled={isPending}
                      className="flex items-center gap-2 px-6 py-2 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 transition-colors"
                    >
                      {isPending
                        ? <><Loader2 size={13} className="animate-spin" /> Approving…</>
                        : <><CheckCircle2 size={13} /> Approve & Submit</>
                      }
                    </button>
                  </div>
                )}

                {!rtr._approvedSubRef && !rtr._rejected && rtr.status === 'sent' && (
                  <p className="text-[13px] text-[#6B7280] italic">
                    Waiting for candidate to sign via DocuSign…
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true">
          <div className="bg-white rounded-[8px] w-full max-w-[420px] p-6 shadow-xl">
            <h3 className="text-[16px] font-bold text-[#0F2147] mb-1">Reject RTR</h3>
            <p className="text-[13px] text-[#6B7280] mb-4">
              Provide a reason. The RTR will be voided and cannot be recovered.
            </p>
            <div className="mb-4">
              <label htmlFor="reject-reason" className="block text-[13px] font-bold text-[#374151] mb-1.5">
                Reason <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <select
                  id="reject-reason"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full h-10 px-3 pr-8 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="">Select a reason</option>
                  <option value="Candidate no longer available">Candidate no longer available</option>
                  <option value="Rate mismatch">Rate mismatch</option>
                  <option value="Candidate withdrew">Candidate withdrew</option>
                  <option value="Profile does not match JD requirements">Profile does not match JD requirements</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason('') }}
                className="flex-1 py-2 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
                Cancel
              </button>
              <button
                onClick={() => void handleRejectConfirm()}
                disabled={!rejectReason || pendingId === rejectTarget}
                className="flex-1 py-2 text-[13px] font-semibold text-white bg-[#DC2626] rounded-[6px] hover:bg-[#b91c1c] disabled:opacity-40 transition-colors">
                {pendingId === rejectTarget ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
