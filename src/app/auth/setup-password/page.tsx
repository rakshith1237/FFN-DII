'use client'

import { useActionState, useState } from 'react'
import { setupPassword, type AuthActionState } from '../actions'
import Link from 'next/link'

function checkRules(pw: string): {
  length: boolean
  upper: boolean
  lower: boolean
  number: boolean
  special: boolean
} {
  return {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
}

function strengthScore(pw: string): number {
  return Object.values(checkRules(pw)).filter(Boolean).length
}

function strengthLabel(score: number): string {
  return ['', 'Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score] ?? ''
}

function strengthColor(score: number): string {
  return (
    ['bg-[#E5E7EB]', 'bg-[#DC2626]', 'bg-[#D97706]', 'bg-[#F59E0B]', 'bg-[#16A34A]', 'bg-[#16A34A]'][score] ??
    'bg-[#E5E7EB]'
  )
}

const inputClassName =
  'w-full h-10 px-3 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors'

export default function SetupPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    setupPassword,
    {},
  )
  const [password, setPassword] = useState('')

  const score = strengthScore(password)
  const rules = checkRules(password)
  const allRulesMet = score === 5

  if (state.success) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-[#0F2147] mb-2">Set up your password</h1>
        <div className="bg-[#DCFCE7] border border-[#16A34A] text-[#166534] rounded-md p-4 text-sm space-y-2">
          <p>{state.success}</p>
          <Link href="/auth/login" className="font-medium underline hover:no-underline">
            Sign in now →
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-[#0F2147] mb-2">Set up your password</h1>
      <p className="text-sm text-[#6B7280] mb-8">
        Create a secure password that meets all requirements.
      </p>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-[#374151] mb-1.5">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />

          {password.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? strengthColor(score) : 'bg-[#E5E7EB]'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#6B7280]">{strengthLabel(score)}</p>
            </div>
          )}

          {password.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {(
                [
                  [rules.length, 'At least 12 characters'],
                  [rules.upper, 'Uppercase letter'],
                  [rules.lower, 'Lowercase letter'],
                  [rules.number, 'Number'],
                  [rules.special, 'Special character'],
                ] as [boolean, string][]
              ).map(([met, label]) => (
                <li key={label} className={met ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                  {met ? '✓' : '✗'} {label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[#374151] mb-1.5"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className={inputClassName}
          />
        </div>

        {state.error && (
          <div
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-[#DC2626] flex items-center gap-1.5"
          >
            {`⚠ ${state.error}`}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !allRulesMet}
          className="w-full h-11 bg-[#0F2147] text-white text-sm font-medium rounded-md hover:bg-[#1a3366] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2"
        >
          {isPending ? 'Updating…' : 'Set password'}
        </button>
      </form>
    </>
  )
}
