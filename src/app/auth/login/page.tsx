'use client'

import { useActionState } from 'react'
import { signIn, type AuthActionState } from '../actions'
import Link from 'next/link'

const initialState: AuthActionState = {}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState)

  return (
    <>
      <h1 className="text-2xl font-semibold text-[#0F2147] mb-2">Sign in to your account</h1>
      <p className="text-sm text-[#6B7280] mb-8">Enter your credentials to continue.</p>

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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-[#3B82F6] hover:underline focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded"
        >
          Forgot your password?
        </Link>
      </div>
    </>
  )
}
