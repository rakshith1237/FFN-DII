import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.')
    const payload = parts[1]
    if (!payload) return {}
    const decoded = Buffer.from(payload, 'base64url').toString()
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function getPersonaCode(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const payload = decodeJwtPayload(session.access_token)
  const fromJwt = typeof payload['persona_code'] === 'string' ? payload['persona_code'] : null
  if (fromJwt !== null && fromJwt !== 'unprovisioned') return fromJwt
  // Fallback: JWT hook disabled — query profile directly
  const supabase = await createClient()
  const { data } = await supabase
    .from('x_ffn_user_profile')
    .select('persona_code')
    .eq('id', session.user.id)
    .maybeSingle()
  return data?.persona_code ?? null
}

export async function getTenantId(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const payload = decodeJwtPayload(session.access_token)
  const value = payload['tenant_id']
  return typeof value === 'string' ? value : null
}

export async function getOrgType(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const payload = decodeJwtPayload(session.access_token)
  const value = payload['org_type']
  return typeof value === 'string' ? value : null
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requirePersona(allowed: string[]): Promise<void> {
  const persona = await getPersonaCode()
  if (!persona || !allowed.includes(persona)) {
    throw new Error('Forbidden: insufficient persona')
  }
}
