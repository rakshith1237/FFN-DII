'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, Inbox, AlertCircle, CheckCircle2, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { acceptVmsItem } from '@/lib/actions/vms/accept-vms-item'
import { rejectVmsItem } from '@/lib/actions/vms/reject-vms-item'
import {
  type VmsInboxRecord,
  type RejectReason,
  FIELD_META,
  REJECT_REASONS,
} from '@/lib/types/vms'

// useCallback is imported for future memoization use
void (useCallback as unknown)

interface VmsInboxClientProps {
  initialRecords: VmsInboxRecord[]
  tenantId:       string
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'failed'

export default function VmsInboxClient({ initialRecords, tenantId }: VmsInboxClientProps) {
  const [records, setRecords]           = useState<VmsInboxRecord[]>(initialRecords)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedItem, setSelectedItem] = useState<VmsInboxRecord | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason]       = useState<RejectReason | ''>('')
  const [isPending, setIsPending]             = useState(false)
  const [toast, setToast]                     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('vms-inbox-changes')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'x_ffn_vms_inbox',
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        setRecords(prev => [payload.new as VmsInboxRecord, ...prev])
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [tenantId])

  const filteredRecords = records.filter(r =>
    statusFilter === 'all' ? true : r.parse_status === statusFilter
  )

  const tabCounts: Record<StatusFilter, number> = {
    all:      records.length,
    pending:  records.filter(r => r.parse_status === 'pending').length,
    accepted: records.filter(r => r.parse_status === 'accepted').length,
    rejected: records.filter(r => r.parse_status === 'rejected').length,
    failed:   records.filter(r => r.parse_status === 'failed').length,
  }

  function getMergedValue(fieldKey: string): string {
    const edited = editedFields[fieldKey]
    if (edited !== undefined) return edited
    return selectedItem?.extracted_data?.[fieldKey as keyof ExtractedData]?.value ?? ''
  }

  // Import ExtractedData type for the keyof cast above
  type ExtractedData = NonNullable<VmsInboxRecord['extracted_data']>

  const canAccept = getMergedValue('job_title').trim().length > 0
                 && getMergedValue('start_date').trim().length > 0
                 && !isPending

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAccept() {
    if (!selectedItem || !canAccept) return
    setIsPending(true)
    const mergedFields: Record<string, string> = {}
    for (const meta of FIELD_META) {
      mergedFields[meta.key] = getMergedValue(meta.key)
    }
    const result = await acceptVmsItem(selectedItem.id, mergedFields, selectedItem.extracted_data)
    setIsPending(false)
    if (result.error) { showToast(result.error, 'error'); return }
    setRecords(prev => prev.map(r =>
      r.id === selectedItem.id ? { ...r, parse_status: 'accepted', parsed_jd_id: result.jdId ?? null } : r
    ))
    setSelectedItem(null)
    setEditedFields({})
    showToast('Item accepted — Draft JD created', 'success')
  }

  async function handleReject() {
    if (!selectedItem || !rejectReason) return
    setIsPending(true)
    const result = await rejectVmsItem(selectedItem.id, rejectReason as RejectReason)
    setIsPending(false)
    if (result.error) { showToast(result.error, 'error'); return }
    setRecords(prev => prev.map(r =>
      r.id === selectedItem.id ? { ...r, parse_status: 'rejected' } : r
    ))
    setSelectedItem(null)
    setShowRejectModal(false)
    setRejectReason('')
    showToast('Item rejected', 'success')
  }

  function statusBorderColor(status: string): string {
    switch (status) {
      case 'pending':  return 'border-l-[#3B82F6]'
      case 'accepted': return 'border-l-[#16A34A]'
      case 'rejected': return 'border-l-[#DC2626]'
      default:         return 'border-l-[#9CA3AF]'
    }
  }

  function statusPillClass(status: string): string {
    switch (status) {
      case 'pending':  return 'bg-[#DBEAFE] text-[#1D4ED8]'
      case 'accepted': return 'bg-[#DCFCE7] text-[#166534]'
      case 'rejected': return 'bg-[#FEE2E2] text-[#991B1B]'
      default:         return 'bg-[#F3F4F6] text-[#6B7280]'
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[8px] shadow-lg text-white text-[13px] font-medium transition-all ${toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ZONE 1 — Page Header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 flex items-center justify-between shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-bold text-[#0F2147]">VMS Inbox</h1>
          {tabCounts.pending > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#DBEAFE] text-[#1D4ED8]">
              {tabCounts.pending} pending
            </span>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-[6px] text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          aria-label="Refresh inbox"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ZONE 2 — Filter Tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB] shrink-0 mb-4">
        {(['all','pending','accepted','rejected','failed'] as StatusFilter[]).map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              statusFilter === tab
                ? 'border-b-2 border-[#D97706] text-[#D97706]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
              statusFilter === tab ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#F3F4F6] text-[#9CA3AF]'
            }`}>
              {tabCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* ZONES 3 + 4 — Split Panel */}
      <div className="flex flex-1 gap-4 overflow-hidden">

        {/* ZONE 3 — Left Panel (queue list) */}
        <div className="w-[40%] overflow-y-auto rounded-[8px] border border-[#E5E7EB] bg-white">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <Inbox size={40} className="text-[#D1D5DB] mb-3" />
              <p className="text-[14px] font-medium text-[#374151]">No items</p>
              <p className="text-[13px] text-[#6B7280] mt-1">
                {statusFilter === 'all' ? 'Your VMS inbox is empty' : `No ${statusFilter} items`}
              </p>
            </div>
          ) : (
            <ul>
              {filteredRecords.map(record => (
                <li key={record.id}>
                  <button
                    onClick={() => { setSelectedItem(record); setEditedFields({}) }}
                    className={`w-full text-left border-l-4 ${statusBorderColor(record.parse_status)} px-4 py-3.5 transition-colors hover:bg-[#EFF6FF] ${selectedItem?.id === record.id ? 'bg-[#EFF6FF]' : ''} border-b border-[#F3F4F6]`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[13px] font-semibold text-[#0F2147] line-clamp-1 flex-1">
                        {record.subject.length > 60 ? record.subject.slice(0, 60) + '…' : record.subject}
                      </span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusPillClass(record.parse_status)}`}>
                        {record.parse_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#6B7280] truncate">{record.sender_email}</span>
                      {record.vms_mode === 'C' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 shrink-0">Mode C</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">
                      {formatDistanceToNow(new Date(record.received_at), { addSuffix: true })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ZONE 4 — Right Panel (detail) */}
        <div className="flex-1 flex flex-col rounded-[8px] border border-[#E5E7EB] bg-white overflow-hidden">

          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Inbox size={48} className="text-[#D1D5DB] mb-4" />
              <p className="text-[15px] font-semibold text-[#374151]">Select an item to review</p>
              <p className="text-[13px] text-[#6B7280] mt-1">Click any row in the queue to see extracted fields</p>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-[#E5E7EB] shrink-0">
                <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-widest mb-1">
                  {selectedItem.extracted_data?.requisition_id?.value ?? 'No Requisition ID'}
                </p>
                <h2 className="text-[16px] font-bold text-[#0F2147]">
                  {selectedItem.extracted_data?.job_title?.value ?? selectedItem.subject}
                </h2>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  From {selectedItem.sender_email} · {formatDistanceToNow(new Date(selectedItem.received_at), { addSuffix: true })}
                </p>
              </div>

              {/* Field table */}
              <div className="flex-1 overflow-y-auto">
                {!selectedItem.extracted_data ? (
                  <div className="p-5 text-center">
                    <p className="text-[13px] text-[#6B7280]">
                      {selectedItem.parse_status === 'pending'
                        ? 'This email is queued for parsing…'
                        : 'No extracted data available for this item.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide w-[35%]">
                          Field
                        </th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                          Extracted Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELD_META.map(meta => {
                        const field      = selectedItem.extracted_data![meta.key]
                        const confidence = field?.confidence ?? 0
                        const isAmber    = confidence < 0.80
                        const currentValue = getMergedValue(meta.key)
                        const rowBg      = isAmber ? 'bg-[#FFFBEB]' : 'bg-[#F0FDF4]'

                        return (
                          <tr key={meta.key} className={`${rowBg} border-b border-[#F3F4F6]`}>
                            <td className="px-4 py-3 text-[13px] font-medium text-[#374151] align-top">
                              {meta.label}
                              {meta.mandatory && (
                                <span className="text-[#DC2626] ml-0.5" aria-label="required">*</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {isAmber ? (
                                <div>
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={e => setEditedFields(prev => ({ ...prev, [meta.key]: e.target.value }))}
                                    placeholder={`Enter ${meta.label.toLowerCase()}`}
                                    aria-label={`Edit ${meta.label}`}
                                    className="w-full h-8 px-2.5 text-[13px] border border-[#FCD34D] rounded-[4px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                                  />
                                  <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                                    Manual Entry
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-[13px] text-[#374151]">
                                    {field?.value ?? '—'}
                                  </span>
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#DCFCE7] text-[#166534]">
                                    Parsed
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Sticky footer */}
              <div className="px-5 py-4 border-t border-[#E5E7EB] flex items-center justify-between gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isPending || ['accepted','rejected'].includes(selectedItem.parse_status)}
                  className="px-4 py-2 text-[13px] font-semibold text-[#DC2626] border border-[#DC2626] rounded-[6px] hover:bg-[#FEE2E2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!canAccept || ['accepted','rejected'].includes(selectedItem.parse_status)}
                  className={`px-6 py-2 text-[13px] font-semibold text-white rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 ${
                    canAccept && !['accepted','rejected'].includes(selectedItem.parse_status)
                      ? 'bg-[#0F2147] hover:bg-[#1a3460] cursor-pointer'
                      : 'bg-[#D1D5DB] cursor-not-allowed'
                  }`}
                >
                  {isPending ? 'Accepting…' : 'Accept'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] w-full max-w-[420px] p-6 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <h3 id="reject-modal-title" className="text-[16px] font-bold text-[#0F2147]">
                Reject Item
              </h3>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="text-[#9CA3AF] hover:text-[#374151]"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-4">
              Select a reason for rejection. This action cannot be undone.
            </p>
            <div className="mb-5">
              <label htmlFor="reject-reason" className="block text-[13px] font-bold text-[#374151] mb-1.5">
                Reason <span className="text-[#DC2626]" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <select
                  id="reject-reason"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value as RejectReason | '')}
                  className="w-full h-10 px-3 pr-8 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] appearance-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent cursor-pointer"
                >
                  <option value="" disabled>Select a reason</option>
                  {REJECT_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="flex-1 py-2 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason || isPending}
                className="flex-1 py-2 text-[13px] font-semibold text-white bg-[#DC2626] rounded-[6px] hover:bg-[#b91c1c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
