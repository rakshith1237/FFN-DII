'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/auth/ratelimit'
import { PERSONA_HOME_ROUTES } from '@/lib/auth/constants'

export type AuthActionState = { error?: string; success?: string }

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.')
    const segment = parts[1]
    if (!segment) return {}
    return JSON.parse(Buffer.from(segment, 'base64url').toString()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function signIn(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return { error: 'Email and password are required.' }
  }

  const ip =
    ((await headers()).get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]?.trim() ?? '127.0.0.1'

  const rl = await checkRateLimit(ip)
  if (!rl.success) {
    return { error: 'Too many sign-in attempts. Please try again in 15 minutes.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please confirm your email address before signing in.' }
    }
    return { error: 'Invalid email or password.' }
  }

  if (data.session) {
    const payload = decodeJwtPayload(data.session.access_token)
    const raw = payload['persona_code']
    const personaCode = typeof raw === 'string' ? raw : null
    const homeRoute = (personaCode !== null ? PERSONA_HOME_ROUTES[personaCode] : undefined) ?? '/auth/login'
    redirect(homeRoute)
  }

  return { error: 'Sign in failed. Please try again.' }
}

export async function setupPassword(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const newPassword = (formData.get('newPassword') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }
  if (newPassword.length < 12) {
    return { error: 'Password must be at least 12 characters.' }
  }
  if (!/[A-Z]/.test(newPassword)) {
    return { error: 'Password must contain at least one uppercase letter.' }
  }
  if (!/[a-z]/.test(newPassword)) {
    return { error: 'Password must contain at least one lowercase letter.' }
  }
  if (!/[0-9]/.test(newPassword)) {
    return { error: 'Password must contain at least one number.' }
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return { error: 'Password must contain at least one special character.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return {
      error: 'Failed to update password. Your reset link may have expired. Please request a new one.',
    }
  }

  return { success: 'Password updated successfully. You can now sign in.' }
}

export async function forgotPassword(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = (formData.get('email') as string | null) ?? ''

  if (!email) {
    return { error: 'Please enter your email address.' }
  }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      (process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000') + '/auth/setup-password',
  })

  return {
    success:
      'If this email is registered, you will receive a reset link shortly. Check your inbox.',
  }
}
