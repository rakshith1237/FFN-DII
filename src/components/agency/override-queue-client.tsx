'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, AlertCircle, Inbox,
  Loader2, ChevronDown,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { approveOverride }   from '@/lib/actions/override/approve-override'
import { rejectOverride,
  REJECTION_CODES, REJECTION_LABELS,
  type RejectionCode }       from '@/lib/actions/override/reject-override'
import {
  OVERRIDE_REASON_LABELS,
  type OverrideReasonCode,
} from '@/lib/actions/override/create-override-request'

void XCircle

interface OverrideQueueClientProps {
  requested: Record<string, unknown>[]
  resolved:  Record<string, unknown>[]
}

export default function OverrideQueueClient({ requested, resolved }: OverrideQueueClientProps) {
  const [pendingId,     setPendingId]     = useState<string | null>(null)
  const [rejectTarget,  setRejectTarget]  = useState<string | null>(null)
  const [rejectionCode, setRejectionCode] = useState<RejectionCode | ''>('')
  const [toast,         setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [localStates,   setLocalStates]   = useState<Record<string, 'approved' | 'rejected'>>({})
  const [activeTab,     setActiveTab]     = useState<'pending' | 'resolved'>('pending')

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove(ovrId: string) {
    setPendingId(ovrId)
    const result = await approveOverride(ovrId)
    setPendingId(null)
    if (result.error) { showToast(result.error, 'error'); return }
    setLocalStates(prev => ({ ...prev, [ovrId]: 'approved' }))
    showToast('Override approved. Submission unlocked.', 'success')
  }

  async function handleRejectConfirm() {
    if (!rejectTarget || !rejectionCode) return
    const targetId = rejectTarget
    setPendingId(targetId)
    const result = await rejectOverride(targetId, rejectionCode as RejectionCode)
    setPendingId(null)
    setRejectTarget(null)
    setRejectionCode('')
    if (result.error) { showToast(result.error, 'error'); return }
    setLocalStates(prev => ({ ...prev, [targetId]: 'rejected' }))
    showToast('Override rejected.', 'success')
  }

  function renderCard(ovr: Record<string, unknown>, showActions: boolean) {
    const ovrId   = String(ovr['id'])
    const cand    = ovr['candidate'] as Record<string, string> | null
    const jd      = ovr['jd']        as Record<string, string> | null
    const partner = ovr['partner']   as Record<string, string> | null
    const localSt = localStates[ovrId]
    const isPending = pendingId === ovrId
    const status  = localSt ?? String(ovr['status'] ?? '')

    return (
      <div key={ovrId}
        className={`bg-white rounded-[8px] border p-5 ${
          status === 'approved' ? 'border-[#BBF7D0]'
          : status === 'rejected' ? 'border-[#FECACA] opacity-70'
          : 'border-[#E5E7EB]'
        }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-[#9CA3AF]">{String(ovr['number'] ?? '')}</span>
              {status === 'approved' && (
                <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-bold">✓ Approved</span>
              )}
              {status === 'rejected' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold">Rejected</span>
              )}
              {status === 'requested' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold">Pending Review</span>
              )}
            </div>
            <p className="text-[15px] font-bold text-[#0F2147]">
              {cand ? `${cand['first_name']} ${cand['last_name']}` : '—'}
            </p>
            <p className="text-[12px] text-[#6B7280]">
              {cand?.['current_title'] ?? '—'} · {jd?.['title'] ?? '—'}
            </p>
            <p className="text-[12px] text-[#9CA3AF]">
              Requested by {partner?.['name'] ?? '—'} ·{' '}
              {ovr['created_at']
                ? formatDistanceToNow(new Date(String(ovr['created_at'])), { addSuffix: true })
                : '—'}
            </p>
          </div>
          {/* Score gap badge */}
          <div className="text-right shrink-0">
            <p className="text-[11px] text-[#9CA3AF]">Score gap</p>
            <p className="text-[20px] font-black text-[#DC2626]">
              -{String(ovr['score_gap'] ?? '?')}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              {String(ovr['score_at_request'] ?? '?')} / {String(ovr['threshold_at_request'] ?? '?')}
            </p>
          </div>
        </div>

        {/* Reason + justification */}
        <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 mb-4">
          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">
            {OVERRIDE_REASON_LABELS[String(ovr['reason_code']) as OverrideReasonCode] ?? String(ovr['reason_code'] ?? '')}
          </p>
          <p className="text-[13px] text-[#374151] leading-relaxed">
            {String(ovr['justification'] ?? '')}
          </p>
        </div>

        {/* Actions */}
        {showActions && status === 'requested' && (
          <div className="flex gap-3">
            <button onClick={() => { setRejectTarget(ovrId); setRejectionCode('') }}
              disabled={isPending}
              className="px-4 py-2 text-[13px] font-semibold text-[#DC2626] border border-[#DC2626]
                rounded-[6px] hover:bg-[#FEE2E2] disabled:opacity-40 transition-colors">
              Reject
            </button>
            <button onClick={() => handleApprove(ovrId)} disabled={isPending}
              className="flex items-center gap-2 px-6 py-2 text-[13px] font-semibold text-white
                bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 transition-colors">
              {isPending
                ? <><Loader2 size={13} className="animate-spin" /> Approving…</>
                : <><CheckCircle2 size={13} /> Approve Override</>
              }
            </button>
          </div>
        )}
      </div>
    )
  }

  const pendingToShow  = requested.filter(o => !localStates[String(o['id'])])
  const resolvedToShow = [
    ...requested.filter(o => !!localStates[String(o['id'])]),
    ...resolved,
  ]

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[8px]
          shadow-lg text-white text-[13px] font-medium ${toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 mb-6">
        <h1 className="text-[24px] font-bold text-[#0F2147]">Override Queue</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Review and approve Hiring Manager score override requests
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6">
        {([
          { id: 'pending',  label: `Pending (${pendingToShow.length})`   },
          { id: 'resolved', label: `Resolved (${resolvedToShow.length})` },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[#D97706] text-[#D97706]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingToShow.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox size={36} className="text-[#D1D5DB] mb-3" />
              <p className="text-[14px] font-medium text-[#374151]">No pending overrides</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">All override requests have been reviewed</p>
            </div>
          ) : (
            pendingToShow.map(o => renderCard(o, true))
          )}
        </div>
      )}

      {activeTab === 'resolved' && (
        <div className="space-y-4">
          {resolvedToShow.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox size={36} className="text-[#D1D5DB] mb-3" />
              <p className="text-[14px] font-medium text-[#374151]">No resolved overrides yet</p>
            </div>
          ) : (
            resolvedToShow.map(o => renderCard(o, false))
          )}
        </div>
      )}

      {/* Rejection modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true">
          <div className="bg-white rounded-[8px] w-full max-w-[400px] p-6 shadow-xl">
            <h3 className="text-[16px] font-bold text-[#0F2147] mb-1">Reject Override</h3>
            <p className="text-[13px] text-[#6B7280] mb-4">Select a reason for rejection.</p>
            <div className="relative mb-4">
              <select value={rejectionCode} onChange={e => setRejectionCode(e.target.value as RejectionCode)}
                className="w-full h-10 px-3 pr-8 text-[13px] border border-[#D1D5DB] rounded-[6px]
                  appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]">
                <option value="">Select reason</option>
                {REJECTION_CODES.map(code => (
                  <option key={code} value={code}>{REJECTION_LABELS[code]}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)}
                className="flex-1 py-2 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
                Cancel
              </button>
              <button onClick={() => void handleRejectConfirm()} disabled={!rejectionCode || pendingId === rejectTarget}
                className="flex-1 py-2 text-[13px] font-semibold text-white bg-[#DC2626] rounded-[6px] hover:bg-[#b91c1c] disabled:opacity-40">
                {pendingId === rejectTarget ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
