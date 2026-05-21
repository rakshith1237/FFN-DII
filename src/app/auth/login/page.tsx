'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PERSONA_HOME_ROUTES: Record<string, string> = {
  flex_admin:            '/flexadmin/dashboard',
  p_super_admin:         '/partner/dashboard',
  p_hiring_manager:      '/partner/dashboard',
  p_recruiter:           '/partner/vms-inbox',
  a_super_admin:         '/agency/dashboard',
  a_recruiting_manager:  '/agency/dashboard',
  a_recruiter:           '/agency/requirements',
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1]
    if (!part) return {}
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    if (isLocked) { e.preventDefault(); router.push('/auth/forgot-password'); return }
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !data.session) {
        const msg = signInError?.message ?? ''
        if (msg.toLowerCase().includes('locked')) {
          setIsLocked(true)
          setError('Your account has been locked. Click "Reset Password" to regain access.')
        } else {
          setError(
            msg === 'Email not confirmed'
              ? 'Please confirm your email before signing in.'
              : 'Invalid email or password.',
          )
        }
        return
      }
      const payload = decodeJwtPayload(data.session.access_token)
      let personaCode = typeof payload['persona_code'] === 'string' ? payload['persona_code'] : null

      if ((personaCode === null || personaCode === 'unprovisioned') && data.user) {
        const supabaseFallback = createClient()
        const { data: profileData } = await supabaseFallback
          .from('x_ffn_user_profile')
          .select('persona_code')
          .eq('user_id', data.user.id)
          .maybeSingle()
        personaCode = profileData?.persona_code ?? null
      }

      const homeRoute = personaCode !== null ? (PERSONA_HOME_ROUTES[personaCode] ?? null) : null
      if (homeRoute !== null) {
        router.push(homeRoute)
      } else {
        setError('Account not provisioned. Contact your administrator.')
      }
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div>
      <h1 className="text-[20px] font-bold text-[#0F2147] mb-1">Sign In</h1>
      <p className="text-sm text-[#6B7280] mb-7">
        Enter your credentials to access your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-[13px] font-bold text-[#374151] mb-1.5">
            Email Address <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); setIsLocked(false) }}
            placeholder="Your work email address"
            className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-[13px] font-bold text-[#374151]">
              Password <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[13px] text-[#3B82F6] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); setIsLocked(false) }}
              placeholder="Your password"
              className="w-full h-10 px-3 pr-10 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151] focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Error / Locked state */}
        {error !== null && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-3 p-3.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]"
          >
            <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#991B1B] leading-5">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-[#0F2147] text-white text-[14px] font-bold rounded-[6px] hover:bg-[#1a3460] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isLocked ? 'Reset Password' : (isPending ? 'Signing inâ€¦' : 'Sign In')}
        </button>
      </form>
    </div>
  )
}

