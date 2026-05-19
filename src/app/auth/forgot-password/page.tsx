'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!email.trim()) return
    setIsPending(true)
    setError(null)
    try {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/setup-password`,
      })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  if (sent) return (
    <div className="text-center py-2">
      <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={28} className="text-[#16A34A]" />
      </div>
      <h2 className="text-[20px] font-bold text-[#0F2147] mb-3">Check Your Email</h2>
      <p className="text-sm text-[#6B7280] mb-6">
        If an account exists for <strong className="text-[#374151]">{email}</strong>,
        we have sent a password reset link.
      </p>
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-sm text-[#3B82F6] hover:underline"
      >
        <ArrowLeft size={14} /> Back to Sign In
      </Link>
    </div>
  )

  return (
    <div>
      <h1 className="text-[20px] font-bold text-[#0F2147] mb-2">Reset Your Password</h1>
      <p className="text-[14px] text-[#6B7280] mb-7">
        Enter your work email address below. If an account exists for this email, we will send you a password reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-[13px] font-bold text-[#374151] mb-1.5">
            Email Address <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            placeholder="Your work email address"
            className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-3 p-3.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]"
          >
            <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#991B1B]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-[#0F2147] text-white text-[14px] font-bold rounded-[6px] hover:bg-[#1a3460] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#374151]"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </div>
  )
}
