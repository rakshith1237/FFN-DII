'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Settings, Database,
  Plug, Cpu, ScrollText, Activity, BarChart3,
} from 'lucide-react'

type NavItem = {
  label: string
  href:  string
  icon:  ElementType
  ready: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',          href: '/flexadmin/dashboard',   icon: LayoutDashboard, ready: true  },
  { label: 'Tenant Management',  href: '/flexadmin/tenants',     icon: Building2,       ready: true  },
  { label: 'Platform Settings',  href: '/flexadmin/settings',    icon: Settings,        ready: false },
  { label: 'Master Data',        href: '/flexadmin/master-data', icon: Database,    ready: true  },
  { label: 'Integrations',       href: '/flexadmin/integrations',icon: Plug,         ready: false },
  { label: 'Jobs',               href: '/flexadmin/jobs',        icon: Cpu,          ready: true  },
  { label: 'Audit Log',          href: '/flexadmin/audit-log',   icon: ScrollText,   ready: true  },
  { label: 'Health',             href: '/flexadmin/health',      icon: Activity,     ready: true  },
  { label: 'Platform Analytics', href: '/flexadmin/analytics',   icon: BarChart3,       ready: false },
]

export default function FlexAdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="FlexAdmin navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        if (!item.ready) {
          return (
            <div
              key={item.href}
              title="Available in upcoming sprint"
              className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-white/40 cursor-not-allowed select-none"
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-[14px] font-medium leading-none truncate">{item.label}</span>
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[6px] transition-colors group ${
              isActive
                ? 'bg-white/10 border-l-[3px] border-[#E8531E] pl-[9px]'
                : 'hover:bg-white/[0.06] border-l-[3px] border-transparent pl-[9px]'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={18}
              className={`shrink-0 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}
            />
            <span className={`text-[14px] font-medium leading-none truncate ${
              isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
            }`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
