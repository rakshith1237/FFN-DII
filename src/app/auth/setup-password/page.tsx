'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import zxcvbn from 'zxcvbn'

const RULES = [
  { id: 'length',  label: '8 or more characters', test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: '1 uppercase letter',   test: (p: string) => /[A-Z]/.test(p) },
  { id: 'number',  label: '1 number',              test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: '1 special character',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const
const STRENGTH_COLORS = [
  'bg-[#DC2626]',
  'bg-[#F97316]',
  'bg-[#EAB308]',
  'bg-[#22C55E]',
  'bg-[#16A34A]',
] as const
const STRENGTH_TEXT = [
  'text-[#DC2626]',
  'text-[#F97316]',
  'text-[#EAB308]',
  'text-[#22C55E]',
  'text-[#16A34A]',
] as const

export default function SetupPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState<string>('')

  const ruleResults = RULES.map(r => ({ ...r, passed: r.test(password) }))
  const allRulesPassed = ruleResults.every(r => r.passed)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const canSubmit = allRulesPassed && passwordsMatch && !isPending

  const strength = useMemo(() => (password.length > 0 ? zxcvbn(password) : null), [password])
  const score: 0 | 1 | 2 | 3 | 4 = (strength?.score ?? 0) as 0 | 1 | 2 | 3 | 4

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setIsPending(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) { setError(updateError.message); return }
      setSuccess(true)
      setTimeout(() => router.push('/flexadmin/dashboard'), 2000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  if (success) return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-[#16A34A]" />
      </div>
      <h2 className="text-[20px] font-bold text-[#0F2147] mb-2">Account Activated</h2>
      <p className="text-sm text-[#6B7280]">Redirecting to your dashboardâ€¦</p>
    </div>
  )

  return (
    <div>
      <p className="text-[14px] italic text-[#6B7280] text-center mb-6">
        Activating your account
      </p>

      <h1 className="text-[20px] font-bold text-[#0F2147] mb-6">Set Your Password</h1>

      {email && (
        <div className="mb-5">
          <p className="text-[13px] font-bold text-[#374151] mb-1">Email Address</p>
          <p className="text-[14px] text-[#374151]">{email}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="block text-[13px] font-bold text-[#374151] mb-1.5">
            New Password <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password"
              className="w-full h-10 px-3 pr-10 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
              aria-label={showPassword ? 'Hide' : 'Show'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Strength bar â€” zxcvbn (ASVS V2.1.8) */}
          {password.length > 0 && (
            <div className="mt-2" aria-label={`Password strength: ${STRENGTH_LABELS[score]}`}>
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? STRENGTH_COLORS[score] : 'bg-[#E5E7EB]'}`}
                  />
                ))}
              </div>
              <p className={`text-[11px] font-medium ${STRENGTH_TEXT[score]}`}>
                {STRENGTH_LABELS[score]}
              </p>
            </div>
          )}

          {/* Rules checklist */}
          <ul className="mt-3 space-y-1.5" aria-label="Password requirements">
            {ruleResults.map(rule => (
              <li key={rule.id} className="flex items-center gap-2">
                {rule.passed
                  ? <CheckCircle2 size={12} className="text-[#16A34A] shrink-0" />
                  : <Circle       size={12} className="text-[#9CA3AF] shrink-0" />
                }
                <span className={`text-[12px] ${rule.passed ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-[13px] font-bold text-[#374151] mb-1.5">
            Confirm Password <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null) }}
              onBlur={() => {
                if (confirmPassword && confirmPassword !== password) {
                  setConfirmError('Passwords do not match.')
                }
              }}
              placeholder="Re-enter your password"
              className={`w-full h-10 px-3 pr-10 text-sm border rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors ${confirmError ? 'border-[#DC2626]' : 'border-[#D1D5DB]'}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
              aria-label={showConfirm ? 'Hide' : 'Show'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmError && (
            <p className="mt-1 text-[12px] text-[#DC2626]" role="alert">{confirmError}</p>
          )}
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
          disabled={!canSubmit}
          className={`w-full h-11 text-white text-[14px] font-bold rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 flex items-center justify-center gap-2 ${canSubmit ? 'bg-[#0F2147] hover:bg-[#1a3460] cursor-pointer' : 'bg-[#D1D5DB] cursor-not-allowed'}`}
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? 'Activatingâ€¦' : 'Activate Account'}
        </button>

        <p className="text-center text-[12px] italic text-[#9CA3AF]">
          By activating your account, you agree to FlexForceNow{' '}
          <span className="underline cursor-pointer">Terms of Service</span> and{' '}
          <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </form>
    </div>
  )
}