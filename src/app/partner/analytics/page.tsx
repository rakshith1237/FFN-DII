import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }                    from 'next/navigation'
import { AnalyticsDashboard }          from '@/components/partner/analytics-dashboard'

export default async function AnalyticsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Analytics</h1>
      <AnalyticsDashboard />
    </div>
  )
}
