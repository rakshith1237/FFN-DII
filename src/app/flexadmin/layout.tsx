import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Bell, MessageSquare, User } from 'lucide-react'
import { requirePersona } from '@/lib/auth/session'
import FlexAdminNav from '@/components/flexadmin/nav'
import { createClient } from '@/lib/supabase/server'

export default async function FlexAdminLayout({ children }: { children: ReactNode }) {
  await requirePersona(['flex_admin']).catch(() => redirect('/auth/login'))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      {/* ── TOP NAVIGATION BAR ─────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-[56px] bg-[#0F2147] z-[1000] flex items-center px-4">
        {/* Left: FFN Wordmark */}
        <div className="flex items-center gap-2.5 w-[240px] shrink-0">
          <div className="w-9 h-9 rounded-[6px] bg-[#E8531E] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-xs tracking-tighter">FFN</span>
          </div>
          <span className="text-white text-[16px] font-bold tracking-tight">FlexForceNow</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: icon buttons */}
        <div className="flex items-center gap-1">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
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
          <Link
            href="/auth/login"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors text-[13px]"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Log Out</span>
          </Link>
        </div>
      </header>

      {/* ── LEFT NAVIGATION SIDEBAR ────────────────────────── */}
      <aside className="fixed top-[56px] left-0 bottom-0 w-[240px] bg-[#1E3A5F] flex flex-col z-[999] overflow-y-auto">
        {/* Role indicator */}
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest">FlexAdmin Console</p>
          {user?.email && (
            <p className="text-[12px] text-white/60 mt-0.5 truncate">{user.email}</p>
          )}
        </div>

        {/* Navigation items */}
        <FlexAdminNav />

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-white/10 mt-auto">
          <p className="text-[11px] text-white/30">V0.1 Alpha</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ──────────────────────────────── */}
      <main className="ml-[240px] mt-[56px] min-h-[calc(100vh-56px)]">
        <div className="max-w-[1280px] mx-auto p-6">
          {children}
        </div>
      </main>

    </div>
  )
}
