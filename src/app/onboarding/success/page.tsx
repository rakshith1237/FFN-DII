import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { provisionTenantFromCheckout } from '@/lib/billing/provision-tenant'

export default async function OnboardingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const sp        = await searchParams
  const sessionId = sp.session_id

  if (!sessionId) redirect('/pricing')

  let provisioned = false
  let alreadyDone = false
  let provisionError: string | null = null

  try {
    const result = await provisionTenantFromCheckout(sessionId)
    provisioned = true
    alreadyDone = result.alreadyProvisioned
  } catch (err) {
    provisionError = String(err)
    console.error('[onboarding/success] provision error:', provisionError)
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 max-w-md w-full text-center">
        {provisioned ? (
          <>
            <div className="flex justify-center mb-5">
              <CheckCircle size={56} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F2147] mb-2">
              {alreadyDone ? 'Account already active' : 'Your account is ready!'}
            </h1>
            <p className="text-[#6B7280] text-sm mb-6">
              {alreadyDone
                ? 'Your account is already set up. Sign in to continue.'
                : "We've sent a sign-in link to your email. Click it to access your account and complete setup."}
            </p>
            <div className="space-y-3">
              <Link href="/auth/login"
                className="block w-full py-3 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] transition-colors">
                Go to Sign In
              </Link>
              <p className="text-xs text-[#9CA3AF]">Check your spam folder if you don't see the email.</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#0F2147] mb-2">Something went wrong</h1>
            <p className="text-[#6B7280] text-sm mb-6">
              Your payment was received but we had trouble setting up your account.
              Our team has been notified. Please contact support@hirenowwithflex.us.
            </p>
            <p className="text-xs font-mono text-[#9CA3AF] break-all">{provisionError}</p>
          </>
        )}
      </div>
    </div>
  )
}
