import type { ElementType } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowRight, Users, Building2, Briefcase, FileCheck, Activity, TrendingUp } from 'lucide-react'

type KpiCard = {
  label:   string
  value:   number | string
  icon:    ElementType
  color:   string
  bgColor: string
}

type AuditRow = {
  id:           string
  action:       string
  persona_code: string
  created_at:   string
}

export default async function FlexAdminDashboard() {
  const supabaseAdmin = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [
    { count: partnerCount },
    { count: agencyCount },
    { count: userCount },
    { data: recentActivityRaw },
  ] = await Promise.all([
    supabaseAdmin.from('x_ffn_tenant').select('*', { count: 'exact', head: true }).eq('type', 'partner').eq('status', 'active'),
    supabaseAdmin.from('x_ffn_tenant').select('*', { count: 'exact', head: true }).eq('type', 'agency').eq('status', 'active'),
    supabaseAdmin.from('x_ffn_user_profile').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('x_ffn_audit_log').select('id, action, persona_code, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const recentActivity = (recentActivityRaw ?? []) as AuditRow[]

  const KPI_CARDS: KpiCard[] = [
    { label: 'Active Partner Tenants', value: partnerCount ?? 0, icon: Building2,  color: 'text-[#3B82F6]', bgColor: 'bg-[#DBEAFE]' },
    { label: 'Active Agency Tenants',  value: agencyCount ?? 0,  icon: Building2,  color: 'text-[#16A34A]', bgColor: 'bg-[#DCFCE7]' },
    { label: 'Total Active Users',     value: userCount ?? 0,    icon: Users,      color: 'text-[#9333EA]', bgColor: 'bg-[#F3E8FF]' },
    { label: 'Jobs Published (Month)', value: 0,                 icon: Briefcase,  color: 'text-[#D97706]', bgColor: 'bg-[#FEF3C7]' },
    { label: 'Submissions (Month)',    value: 0,                 icon: FileCheck,  color: 'text-[#0F2147]', bgColor: 'bg-[#EFF6FF]' },
    { label: 'Active Placements',      value: 0,                 icon: TrendingUp, color: 'text-[#DC2626]', bgColor: 'bg-[#FEE2E2]' },
  ]

  return (
    <div className="space-y-6">

      {/* Platform Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#DCFCE7] rounded-[8px] border border-[#BBF7D0]">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#16A34A]" />
          <span className="text-[14px] font-semibold text-[#166534]">All Systems Operational</span>
        </div>
        <button className="text-[13px] text-[#16A34A] hover:underline">View Status Detail</button>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F2147]">FlexAdmin Dashboard</h1>
          <p className="text-[14px] text-[#6B7280] mt-0.5">Platform overview — all tenants</p>
        </div>
        <Link
          href="/flexadmin/tenants/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8531E] text-white text-[14px] font-semibold rounded-[6px] hover:bg-[#d44718] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8531E] focus-visible:ring-offset-2"
        >
          Provision Tenant <ArrowRight size={15} />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Priority Actions Queue */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-bold text-[#0F2147]">Priority Actions</h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Platform issues requiring attention</p>
          </div>
          <div className="p-5">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity size={32} className="text-[#9CA3AF] mb-3" />
              <p className="text-[14px] font-medium text-[#374151]">No actions required</p>
              <p className="text-[13px] text-[#6B7280] mt-1">Platform running normally</p>
            </div>
          </div>
        </div>

        {/* Recent Tenant Activity */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#0F2147]">Recent Activity</h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">Last 10 platform events</p>
            </div>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {recentActivity.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-[13px] text-[#6B7280]">No activity recorded yet.</p>
              </div>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-[#374151] font-mono">{log.action}</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-0.5">{log.persona_code}</p>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] shrink-0 ml-4">
                    {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
