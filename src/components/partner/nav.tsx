'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Inbox, Users, Settings,
  FileText, BarChart3, Briefcase, FileCheck,
  Wallet, Users2, TrendingUp, CalendarDays, ShieldCheck,
} from 'lucide-react'

interface PartnerNavProps {
  personaCode: string
}

type NavItem = {
  label: string
  href: string
  icon: ElementType
  personas: string[]
  subItem?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/partner/dashboard',    icon: LayoutDashboard, personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'VMS Inbox',    href: '/partner/vms-inbox',    icon: Inbox,           personas: ['p_recruiter'] },
  { label: 'Requirements', href: '/partner/requirements', icon: Briefcase,       personas: ['p_super_admin', 'p_hiring_manager', 'p_recruiter'] },
  { label: 'Submissions',  href: '/partner/submissions',  icon: FileText,        personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'Interviews',   href: '/partner/interviews',   icon: CalendarDays,    personas: ['p_super_admin', 'p_hiring_manager', 'p_recruiter'] },
  { label: 'Offers',       href: '/partner/offers',       icon: FileCheck,       personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'Team',         href: '/partner/team',         icon: Users,           personas: ['p_super_admin'] },
  { label: 'Analytics',    href: '/partner/analytics',    icon: BarChart3,       personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'Settings',         href: '/partner/settings',     icon: Settings,     personas: ['p_super_admin'] },
  { label: 'SSO Configuration', href: '/partner/settings/sso', icon: ShieldCheck,  personas: ['p_super_admin'], subItem: true },
]

const WORKFORCE_ITEMS: NavItem[] = [
  { label: 'Budget Requests',   href: '/partner/workforce/budget-request', icon: Wallet,       personas: ['p_super_admin', 'p_hiring_manager'] },
  { label: 'Headcount Tracker', href: '/partner/workforce/headcount',      icon: Users2,       personas: ['p_super_admin', 'p_hiring_manager', 'p_recruiter'] },
  { label: 'Skill Gap',         href: '/partner/workforce/skill-gap',      icon: TrendingUp,   personas: ['p_super_admin', 'p_hiring_manager', 'p_recruiter'] },
  { label: 'Calendar',          href: '/partner/workforce/calendar',       icon: CalendarDays, personas: ['p_super_admin', 'p_hiring_manager', 'p_recruiter'] },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const isActive = item.subItem
    ? pathname === item.href
    : pathname === item.href || (pathname.startsWith(item.href + '/') && !item.subItem)

  if (item.subItem) {
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2.5 ml-5 px-3 py-1.5 rounded-[6px] transition-colors group ${
          isActive
            ? 'bg-white/10 border-l-[3px] border-[#E8531E] pl-[9px]'
            : 'hover:bg-white/[0.06] border-l-[3px] border-transparent pl-[9px]'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={15} className={`shrink-0 ${isActive ? 'text-white' : 'text-white/55 group-hover:text-white'}`} />
        <span className={`text-[13px] font-medium truncate ${isActive ? 'text-white' : 'text-white/55 group-hover:text-white'}`}>
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <Link
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
}

export default function PartnerNav({ personaCode }: PartnerNavProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter(item => item.personas.includes(personaCode))
  const visibleWorkforce = WORKFORCE_ITEMS.filter(item => item.personas.includes(personaCode))

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Partner navigation">
      {visibleItems.map(item => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}

      {visibleWorkforce.length > 0 && (
        <>
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Workforce Planning
          </p>
          {visibleWorkforce.map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </>
      )}
    </nav>
  )
}
