import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { CheckCircle, Users, Building2, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function OnboardingWizardPage() {
  const [persona, tenantId, user] = await Promise.all([getPersonaCode(), getTenantId(), getUser()])
  if (!persona || !tenantId || !user) redirect('/auth/login')
  if (!['p_super_admin','a_super_admin'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: tenant } = await db
    .from('x_ffn_tenant')
    .select('name, type, subscription_status')
    .eq('id', tenantId)
    .single()

  const isPartner = persona === 'p_super_admin'
  const dashboardPath = isPartner ? '/partner/dashboard' : '/agency/dashboard'

  const STEPS = [
    {
      icon: Building2,
      title: 'Organisation confirmed',
      desc:  `${tenant?.name ?? 'Your organisation'} is set up and active.`,
      done:  true,
    },
    {
      icon: Users,
      title: 'Invite your team',
      desc:  `Use Settings to invite ${isPartner ? 'Hiring Managers and Recruiters' : 'Recruiting Managers and Recruiters'}.`,
      done:  false,
    },
    {
      icon: Zap,
      title: isPartner ? 'Publish your first JD' : 'Add bench candidates',
      desc:  isPartner ? 'Create a job description and broadcast it to agencies.' : 'Add candidates to your bench to start receiving JD assignments.',
      done:  false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-[#0F2147] mb-1">Welcome to FlexForceNow</h1>
        <p className="text-sm text-[#6B7280] mb-8">
          You're all set. Here's how to get started with your {isPartner ? 'Partner' : 'Agency'} account.
        </p>

        <div className="space-y-5 mb-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done ? 'bg-green-100' : 'bg-[#EEF2FF]'
                }`}>
                  {step.done
                    ? <CheckCircle size={18} className="text-green-600" />
                    : <Icon size={18} className="text-[#4F46E5]" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#374151]">{step.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <Link href={dashboardPath}
          className="block w-full py-3 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] transition-colors text-center">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
