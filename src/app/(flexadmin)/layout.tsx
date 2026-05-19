import React from 'react'
import { requirePersona } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function FlexAdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requirePersona(['flex_admin'])
  } catch {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAFB]">
      <nav className="w-56 bg-[#0F2147] flex flex-col shrink-0 min-h-screen">
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <span className="text-white font-semibold text-base tracking-tight">FlexForceNow</span>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/flexadmin/tenants"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/80 rounded-md hover:bg-white/10 hover:text-white transition-colors"
          >
            ðŸ¢ Tenant Management
          </Link>
          <Link
            href="/flexadmin/platform-settings"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/80 rounded-md hover:bg-white/10 hover:text-white transition-colors"
          >
            âš™ï¸ Platform Settings
          </Link>
        </div>

        <div className="p-4 border-t border-white/10">
          <span className="text-xs text-white/40">FlexAdmin</span>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <div className="h-16 bg-white border-b border-[#E5E7EB] flex items-center px-6">
          <span className="text-sm font-medium text-[#374151]">FlexAdmin Console</span>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
