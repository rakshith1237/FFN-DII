'use client'
import { useEffect, useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationDrawer } from './notification-drawer'

export function NotificationBell({ userId }: { userId: string }) {
  const [unread, setUnread]   = useState(0)
  const [open, setOpen]       = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial unread count
    supabase
      .from('x_ffn_notification')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .then(({ count }) => setUnread(count ?? 0))

    // Realtime subscription
    channelRef.current = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'x_ffn_notification',
          filter: `user_id=eq.${userId}`,
        },
        () => setUnread(prev => prev + 1)
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId])

  function handleOpen() {
    setOpen(true)
    setUnread(0)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        className="relative p-2 rounded-lg text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <NotificationDrawer
        userId={userId}
        open={open}
        onClose={() => setOpen(false)}
        onRead={() => setUnread(0)}
      />
    </>
  )
}
