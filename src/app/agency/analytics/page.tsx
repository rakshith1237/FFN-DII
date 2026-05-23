import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function AgencyAnalyticsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['a_super_admin','a_recruiting_manager'].includes(persona)) redirect('/agency/dashboard')

  const db = createAdminClient()
  const [
    { count: totalCandidates },
    { count: activeSubmissions },
    { count: activePlacements },
    { count: pendingTimesheets },
  ] = await Promise.all([
    db.from('x_ffn_candidate').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).eq('agency_tenant_id', tenantId).in('status', ['received','under_review','shortlisted']),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }).eq('agency_tenant_id', tenantId).eq('status', 'active'),
    db.from('x_ffn_timesheet').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
  ])

  const stats = [
    { label: 'Total Candidates',   value: totalCandidates ?? 0,  color: 'bg-[#0F2147]' },
    { label: 'Active Submissions', value: activeSubmissions ?? 0, color: 'bg-[#3B82F6]' },
    { label: 'Active Placements',  value: activePlacements ?? 0,  color: 'bg-[#16A34A]' },
    { label: 'Pending Timesheets', value: pendingTimesheets ?? 0, color: 'bg-[#E8531E]' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Analytics</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-[#E5E7EB] p-5">
            <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
            <p className="text-3xl font-bold text-[#0F2147]">{s.value}</p>
            <p className="text-sm text-[#6B7280] mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-8 text-center">
        <p className="text-sm text-[#6B7280]">Detailed analytics charts coming in V1.1.</p>
      </div>
    </div>
  )
}