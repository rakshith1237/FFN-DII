'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Settings,
  FileText, BarChart3, Briefcase, SlidersHorizontal,
} from 'lucide-react'

interface AgencyNavProps {
  personaCode: string
}

type NavItem = {
  label: string
  href: string
  icon: ElementType
  personas: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/agency/dashboard',    icon: LayoutDashboard, personas: ['a_super_admin', 'a_recruiting_manager'] },
  { label: 'Requirements', href: '/agency/requirements', icon: Briefcase,       personas: ['a_super_admin', 'a_recruiting_manager', 'a_recruiter'] },
  { label: 'Bench Index',  href: '/agency/bench',        icon: Users,           personas: ['a_super_admin', 'a_recruiting_manager', 'a_recruiter'] },
  { label: 'Submissions',  href: '/agency/submissions',  icon: FileText,        personas: ['a_super_admin', 'a_recruiting_manager', 'a_recruiter'] },
  { label: 'Team',         href: '/agency/team',         icon: Users,           personas: ['a_super_admin'] },
  { label: 'Analytics',    href: '/agency/analytics',    icon: BarChart3,       personas: ['a_super_admin', 'a_recruiting_manager'] },
  { label: 'Settings',        href: '/agency/settings',        icon: Settings,          personas: ['a_super_admin'] },
  { label: 'Scoring Override', href: '/agency/scoring-override', icon: SlidersHorizontal, personas: ['a_recruiting_manager', 'a_super_admin'] },
]

export default function AgencyNav({ personaCode }: AgencyNavProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter(item => item.personas.includes(personaCode))

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Agency navigation">
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
