import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { PricingCheckout } from '@/components/billing/pricing-checkout'

const PLANS = [
  {
    key:      'partner' as const,
    name:     'Partner Plan',
    subtitle: 'For Hiring Organisations',
    price:    '£299',
    period:   '/month',
    color:    'border-[#0F2147]',
    badge:    null,
    features: [
      'Unlimited Job Descriptions',
      'VMS Email Rail (Mailgun integration)',
      'AI JD Smart Write',
      'IntelliMatch AI Scoring',
      'Decision Vault + Override Economy',
      'Workforce Planning module',
      'Full analytics dashboards',
      'Up to 3 agency tiers',
      'DocuSign RTR e-signature',
      'Multi-persona access (HM, Recruiter, SA)',
    ],
  },
  {
    key:      'agency' as const,
    name:     'Agency Plan',
    subtitle: 'For Recruitment Agencies',
    price:    '£199',
    period:   '/month',
    color:    'border-[#E5E7EB]',
    badge:    null,
    features: [
      'Bench candidate management',
      'pgvector AI bench-first search',
      'XY scoring scatter chart',
      'RTR generation and e-sign',
      'Submission management',
      'Override request workflow',
      'Engagement lifecycle tracking',
      'Timesheet + invoice management',
      'Full analytics dashboards',
      'Multi-persona access (Recruiter, ARM, SA)',
    ],
  },
] as const

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#0F2147] mb-3">Simple, transparent pricing</h1>
          <p className="text-[#6B7280] text-lg">Start your 14-day free trial. No credit card required until you're ready.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map(plan => (
            <div key={plan.key}
              className={`bg-white rounded-2xl border-2 ${plan.color} p-8 flex flex-col`}>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#0F2147]">{plan.name}</h2>
                <p className="text-sm text-[#6B7280] mt-0.5">{plan.subtitle}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#0F2147]">{plan.price}</span>
                  <span className="text-[#6B7280]">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#374151]">{f}</span>
                  </li>
                ))}
              </ul>

              <PricingCheckout planType={plan.key} planName={plan.name} />
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[#9CA3AF] mt-8">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#0F2147] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
