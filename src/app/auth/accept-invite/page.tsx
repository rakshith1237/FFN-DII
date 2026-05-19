'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PERSONA_HOME_ROUTES: Record<string, string> = {
  flex_admin:           '/flexadmin/dashboard',
  p_super_admin:        '/partner/dashboard',
  p_hiring_manager:     '/partner/dashboard',
  p_recruiter:          '/partner/vms-inbox',
  a_super_admin:        '/agency/dashboard',
  a_recruiting_manager: '/agency/dashboard',
  a_recruiter:          '/agency/requirements',
}

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function verifyInvite() {
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!tokenHash || type !== 'invite') {
        setErrorMessage('Invalid or missing invite link. Please request a new invitation.')
        setStatus('error')
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'invite',
      })

      if (error || !data.session) {
        setErrorMessage(
          error?.message?.includes('expired')
            ? 'This invite link has expired. Please request a new invitation.'
            : 'This invite link is invalid or has already been used.',
        )
        setStatus('error')
        return
      }

      setStatus('success')

      const personaCode = data.session.user.user_metadata?.persona_code as string | undefined
      const email = data.session.user.email ?? ''

      if (!personaCode) {
        router.push(`/auth/setup-password?email=${encodeURIComponent(email)}`)
        return
      }

      const homeRoute = PERSONA_HOME_ROUTES[personaCode]
      if (homeRoute) {
        setTimeout(() => router.push(homeRoute), 1500)
      } else {
        router.push('/auth/login')
      }
    }

    verifyInvite()
  }, [searchParams, router])

  return (
    <div className="text-center">

      {/* Verifying */}
      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 size={40} className="text-[#3B82F6] animate-spin" />
          <h2 className="text-[18px] font-bold text-[#0F2147]">Verifying your invite…</h2>
          <p className="text-[14px] text-[#6B7280]">Please wait while we confirm your invitation.</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center">
            <CheckCircle2 size={28} className="text-[#16A34A]" />
          </div>
          <h2 className="text-[18px] font-bold text-[#0F2147]">Invite Accepted!</h2>
          <p className="text-[14px] text-[#6B7280]">Redirecting you to your dashboard…</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-start gap-3 p-4 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px] text-left w-full">
            <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#991B1B]">{errorMessage}</p>
          </div>
          <a href="/auth/login" className="text-[14px] text-[#3B82F6] hover:underline">
            Back to Sign In
          </a>
        </div>
      )}

    </div>
  )
}
