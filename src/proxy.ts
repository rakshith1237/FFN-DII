import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROUTE_PERSONA_MAP: Record<string, string[]> = {
  '/flexadmin': ['flex_admin'],
  '/partner':   ['p_super_admin', 'p_hiring_manager', 'p_recruiter'],
  '/agency':    ['a_super_admin', 'a_recruiting_manager', 'a_recruiter'],
}

const PERSONA_HOME_ROUTES: Record<string, string> = {
  flex_admin:           '/flexadmin/dashboard',
  p_super_admin:        '/partner/dashboard',
  p_hiring_manager:     '/partner/dashboard',
  p_recruiter:          '/partner/vms-inbox',
  a_super_admin:        '/agency/dashboard',
  a_recruiting_manager: '/agency/dashboard',
  a_recruiter:          '/agency/requirements',
}

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

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const payload = session ? decodeJwtPayload(session.access_token) : {}
  const rawPersona = payload['persona_code']
  const personaCode = typeof rawPersona === 'string' ? rawPersona : null

  const sortedKeys = Object.keys(ROUTE_PERSONA_MAP).sort((a, b) => b.length - a.length)
  const matchedKey = sortedKeys.find((key) => pathname.startsWith(key))

  if (matchedKey !== undefined) {
    const allowedPersonas = ROUTE_PERSONA_MAP[matchedKey]
    if (allowedPersonas !== undefined) {
      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
      // RBAC ENFORCEMENT NOTE (B-025 / T-033 / T-094):
      // Currently in SOFT MODE: only redirects if personaCode is non-null AND wrong.
      // If personaCode is null (JWT hook broken on Supabase free tier), user passes through here.
      // Second enforcement layer: every protected page calls getPersonaCode() with DB fallback.
      // Switch to STRICT MODE (below) after Supabase Pro upgrade (T-033):
      //   if (!personaCode || !allowedPersonas.includes(personaCode)) {
      if (personaCode && !allowedPersonas.includes(personaCode)) {
        const homeRoute =
          (personaCode !== null ? PERSONA_HOME_ROUTES[personaCode] : undefined) ?? '/auth/login'
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = homeRoute
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  if (pathname.startsWith('/auth/') && user && personaCode !== null) {
    const homeRoute = PERSONA_HOME_ROUTES[personaCode]
    if (homeRoute !== undefined && homeRoute !== pathname) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = homeRoute
      return NextResponse.redirect(redirectUrl)
    }
    // No valid home route found â€” let the user through to auth pages
    // This handles: unprovisioned users, unknown persona codes, test accounts
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
