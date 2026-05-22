'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantId }       from '@/lib/auth/session'

export type TeamMember = {
  userId: string
  name:   string
  email:  string
  persona: string
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('x_ffn_user_profile')
    .select('user_id, full_name, email, persona_code')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('full_name')

  return (data ?? []).map(p => ({
    userId:  p.user_id,
    name:    p.full_name   ?? p.email ?? '',
    email:   p.email       ?? '',
    persona: p.persona_code,
  }))
}
