import { getPersonaCode }                  from '@/lib/auth/session'
import { redirect }                        from 'next/navigation'
import { FlexAdminAnalyticsDashboard }     from '@/components/flexadmin/flexadmin-analytics-dashboard'

export default async function FlexAdminAnalyticsPage() {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Platform Analytics</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Cross-tenant platform metrics. All data visible to FlexAdmin only.
        </p>
      </div>
      <FlexAdminAnalyticsDashboard />
    </div>
  )
}
