import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/auth/ratelimit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const forwarded =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  const ip = forwarded.split(',')[0]?.trim() ?? '127.0.0.1'

  const result = await checkRateLimit(ip)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': '900',
          'X-RateLimit-Remaining': String(result.remaining),
        },
      },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('email' in body) ||
    !('password' in body)
  ) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (!data.user || !data.session) {
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      expires_at: data.session.expires_at,
    },
  })
}
