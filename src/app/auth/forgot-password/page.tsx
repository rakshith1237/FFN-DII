'use client'

import { useActionState } from 'react'
import { forgotPassword, type AuthActionState } from '../actions'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    forgotPassword,
    {},
  )

  return (
    <>
      <h1 className="text-2xl font-semibold text-[#0F2147] mb-2">Reset your password</h1>
      <p className="text-sm text-[#6B7280] mb-8">
        Enter your email and we&apos;ll send a reset link if an account exists.
      </p>

      {state.success ? (
        <div className="bg-[#DCFCE7] border border-[#16A34A] text-[#166534] rounded-md p-4 text-sm space-y-2">
          <p>{state.success}</p>
          <Link href="/auth/login" className="font-medium underline hover:no-underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-10 px-3 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors"
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
            disabled={isPending}
            className="w-full h-11 bg-[#0F2147] text-white text-sm font-medium rounded-md hover:bg-[#1a3366] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2"
          >
            {isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-sm text-[#3B82F6] hover:underline focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded"
        >
          ← Back to sign in
        </Link>
      </div>
    </>
  )
}
