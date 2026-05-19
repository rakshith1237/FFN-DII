import type { ElementType } from 'react'
import Link from 'next/link'
import { ArrowRight, Briefcase, FileText, Users, UserCheck } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

type KpiCard = {
  label:   string
  value:   number
  icon:    ElementType
  color:   string
  bgColor: string
}

export default async function AgencyDashboard() {
  const [personaCode, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])

  const supabaseAdmin = createAdminClient()
  const { count: teamCount } = await supabaseAdmin
    .from('x_ffn_user_profile')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId ?? '')

  const title = personaCode === 'a_recruiting_manager' ? 'Manager Dashboard' : 'Agency Dashboard'

  const KPI_CARDS: KpiCard[] = [
    { label: 'Active Requirements', value: 0,              icon: Briefcase,  color: 'text-[#3B82F6]', bgColor: 'bg-[#DBEAFE]' },
    { label: 'Bench Candidates',    value: 0,              icon: UserCheck,  color: 'text-[#16A34A]', bgColor: 'bg-[#DCFCE7]' },
    { label: 'Submissions',         value: 0,              icon: FileText,   color: 'text-[#9333EA]', bgColor: 'bg-[#F3E8FF]' },
    { label: 'Team Members',        value: teamCount ?? 0, icon: Users,      color: 'text-[#D97706]', bgColor: 'bg-[#FEF3C7]' },
  ]

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F2147]">{title}</h1>
          <p className="text-[14px] text-[#6B7280] mt-0.5">Overview of your agency activity</p>
        </div>
        <Link
          href="/agency/bench/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8531E] text-white text-[14px] font-semibold rounded-[6px] hover:bg-[#d44718] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8531E] focus-visible:ring-offset-2"
        >
          Add Bench Candidate <ArrowRight size={15} />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-[8px] border border-[#E5E7EB] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-[#6B7280] font-medium">{card.label}</p>
                  <p className="text-[32px] font-bold text-[#0F2147] mt-1 leading-none">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-[8px] ${card.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-bold text-[#0F2147]">Priority Actions</h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Items requiring your attention</p>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[14px] text-[#6B7280]">No pending actions</p>
          </div>
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-bold text-[#0F2147]">Recent Activity</h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Latest actions in your agency</p>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center px-5">
            <p className="text-[14px] text-[#6B7280]">
              No activity yet — start by adding your first bench candidate
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
