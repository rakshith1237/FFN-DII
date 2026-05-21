'use client'

import Link from 'next/link'
import { Bell, MessageSquare, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/notifications/notification-bell'

interface TopNavProps {
  email?: string
  orgName?: string
  userId?: string
}

export default function TopNav({ orgName, userId }: TopNavProps) {
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-[#0F2147] z-[1000] flex items-center px-4">
      {/* Left: FFN wordmark — 240px wide to align with sidebar */}
      <div className="flex items-center gap-2.5 w-[240px] shrink-0">
        <div className="w-9 h-9 rounded-[6px] bg-[#E8531E] flex items-center justify-center">
          <span className="text-white font-black text-xs tracking-tighter">FFN</span>
        </div>
        <span className="text-white text-[16px] font-bold tracking-tight">FlexForceNow</span>
      </div>

      {/* Center: org name */}
      <div className="flex-1 flex items-center justify-center">
        {orgName && (
          <span className="text-white/60 text-[13px] font-medium truncate max-w-[300px]">
            {orgName}
          </span>
        )}
      </div>

      {/* Right: icons + logout */}
      <div className="flex items-center gap-1">
        {userId ? (
          <div className="w-9 h-9 flex items-center justify-center">
            <NotificationBell userId={userId} />
          </div>
        ) : (
          <button
            className="w-9 h-9 flex items-center justify-center rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
        )}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Messages"
        >
          <MessageSquare size={18} />
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Profile"
        >
          <User size={18} />
        </button>
        <div className="w-px h-5 bg-white/20 mx-1" />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors text-[13px]"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Log Out</span>
        </button>
      </div>
    </header>
  )
}
