'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const PERSONA_HOME_ROUTES: Record<string, string> = {
  flex_admin:           '/flexadmin/dashboard',
  p_super_admin:        '/partner/dashboard',
  p_hiring_manager:     '/partner/hiring/dashboard',
  p_recruiter:          '/partner/recruiter/dashboard',
  a_super_admin:        '/agency/dashboard',
  a_recruiting_manager: '/agency/manager/dashboard',
  a_recruiter:          '/agency/recruiter/dashboard',
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1]
    if (!part) return {}
    const padded = part + '=='.slice((part.length + 2) % 4 > 0 ? (part.length + 2) % 4 : 4)
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !data.session) {
        setError(
          signInError?.message === 'Email not confirmed'
            ? 'Please confirm your email before signing in.'
            : 'Invalid email or password.',
        )
        return
      }
      const payload = decodeJwtPayload(data.session.access_token)
      const personaCode = typeof payload['persona_code'] === 'string' ? payload['persona_code'] : null
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
    <>
      <h1 className="text-2xl font-semibold text-[#0F2147] mb-2">Sign in to your account</h1>
      <p className="text-sm text-[#6B7280] mb-8">Enter your credentials to continue.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full h-10 px-3 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full h-10 px-3 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
          />
        </div>

        {error !== null && (
          <div role="alert" aria-live="polite" className="text-sm text-[#DC2626] flex items-center gap-1.5">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-[#0F2147] text-white text-sm font-medium rounded-md hover:bg-[#1a3366] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/auth/forgot-password" className="text-sm text-[#3B82F6] hover:underline">
          Forgot your password?
        </Link>
      </div>
    </>
  )
}
