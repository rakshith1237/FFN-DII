'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Inbox, Users, Settings,
  FileText, BarChart3, Briefcase,
} from 'lucide-react'

interface PartnerNavProps {
  personaCode: string
}

type NavItem = {
  label: string
  href: string
  icon: ElementType
  personas: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/partner/dashboard',    icon: LayoutDashboard, personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'VMS Inbox',    href: '/partner/vms-inbox',    icon: Inbox,           personas: ['p_recruiter'] },
  { label: 'Requirements', href: '/partner/requirements', icon: Briefcase,       personas: ['p_super_admin', 'p_hiring_manager', 'p_recruiter'] },
  { label: 'Submissions',  href: '/partner/submissions',  icon: FileText,        personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'Team',         href: '/partner/team',         icon: Users,           personas: ['p_super_admin'] },
  { label: 'Analytics',    href: '/partner/analytics',    icon: BarChart3,       personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'Settings',     href: '/partner/settings',     icon: Settings,        personas: ['p_super_admin'] },
]

export default function PartnerNav({ personaCode }: PartnerNavProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter(item => item.personas.includes(personaCode))

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Partner navigation">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
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
            <span className={`text-[14px] font-medium truncate ${
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
