'use client'
import { useEffect, useState, useCallback } from 'react'
import { X, CheckCheck, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id:         string
  event_type: string
  payload:    Record<string, unknown>
  read:       boolean
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  SUBMISSION_CREATED:            'New Submission',
  SUBMISSION_SCORED:             'Submission Scored',
  SUBMISSION_SHORTLISTED:        'Candidate Shortlisted',
  SUBMISSION_REJECTED:           'Submission Rejected',
  OVERRIDE_REQUESTED:            'Override Requested',
  OVERRIDE_APPROVED:             'Override Approved',
  OVERRIDE_REJECTED:             'Override Rejected',
  RTR_SIGNED:                    'RTR Signed',
  RTR_EXPIRED:                   'RTR Expired',
  JD_BROADCAST_RECEIVED:         'New JD Available',
  JD_ASSIGNED_TO_RECRUITER:      'JD Assigned',
  BUDGET_REQUEST_SUBMITTED:      'Budget Request',
  BUDGET_REQUEST_APPROVED:       'Budget Approved',
  INTERVIEW_SCHEDULED:           'Interview Scheduled',
  INTERVIEW_SCORED:              'Interview Scored',
  OFFER_APPROVED:                'Offer Approved',
  PLACEMENT_CREATED:             'Placement Confirmed',
  CONTRACT_ENDING_14:            'Contract Ending Soon',
  CONTRACT_ENDING_30:            'Contract Ending',
  INVOICE_OVERDUE:               'Invoice Overdue',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function NotificationDrawer({
  userId,
  open,
  onClose,
  onRead,
}: {
  userId: string
  open:   boolean
  onClose: () => void
  onRead:  () => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('x_ffn_notification')
      .select('id, event_type, payload, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data ?? []) as Notification[])
    setLoading(false)
  }, [userId])

  const markAllRead = useCallback(async () => {
    const supabase = createClient()
    await supabase
      .from('x_ffn_notification')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    onRead()
  }, [userId, onRead])

  useEffect(() => {
    if (open) {
      fetchNotifications()
      markAllRead()
    }
  }, [open, fetchNotifications, markAllRead])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-80 z-50 bg-white shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#0F2147]">Notifications</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              title="Mark all read"
              className="text-[#6B7280] hover:text-[#374151] transition-colors"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#374151] transition-colors"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-[#6B7280] text-center">Loading...</div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="p-8 text-center">
              <Bell size={32} className="mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-sm text-[#6B7280]">No notifications yet.</p>
            </div>
          )}
          {!loading && notifications.map(n => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-[#F3F4F6] ${!n.read ? 'bg-[#EFF6FF]' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#374151] mb-0.5">
                    {EVENT_LABELS[n.event_type] ?? n.event_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-[#6B7280] line-clamp-2">
                    {typeof n.payload === 'object' && n.payload !== null
                      ? Object.values(n.payload).filter(Boolean).join(' — ').substring(0, 120)
                      : ''}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-[#3B82F6] rounded-full flex-shrink-0 mt-1" aria-hidden="true" />
                )}
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-1">{timeAgo(n.created_at)}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
