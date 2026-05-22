'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { hashApiKey }           from '@/lib/api/verify-api-key'
import { randomBytes }          from 'crypto'
import { revalidatePath }       from 'next/cache'

export async function generateApiKey(input: {
  name:   string
  scopes: string[]
}): Promise<{ error: string | null; rawKey: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', rawKey: null }
  if (persona !== 'p_super_admin') return { error: 'Only Partner Super Admins can manage API keys', rawKey: null }
  if (!input.name.trim()) return { error: 'Key name is required', rawKey: null }
  if (!input.scopes.length) return { error: 'At least one scope is required', rawKey: null }

  const validScopes = new Set(['read','write','admin'])
  for (const s of input.scopes) {
    if (!validScopes.has(s)) return { error: `Invalid scope: ${s}. Allowed: read, write, admin`, rawKey: null }
  }

  // Generate cryptographically secure raw key
  const rawKey  = `ffnk_${randomBytes(32).toString('hex')}`
  const keyHash = hashApiKey(rawKey)

  const db = createAdminClient()
  const { error } = await db.from('x_ffn_api_keys').insert({
    tenant_id:  tenantId,
    key_hash:   keyHash,
    name:       input.name.trim(),
    scopes:     input.scopes,
    is_active:  true,
    created_by: user.id,
  })

  if (error) return { error: error.message, rawKey: null }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'api_key.created',
    entity_type:  'x_ffn_api_keys',
    entity_id:    null,
    new_values:   { name: input.name, scopes: input.scopes },
  })

  revalidatePath('/partner/settings/api-keys')
  return { error: null, rawKey }
}

export async function revokeApiKey(keyId: string): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (persona !== 'p_super_admin') return { error: 'Forbidden' }

  const db = createAdminClient()
  const { error } = await db
    .from('x_ffn_api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'api_key.revoked',
    entity_type:  'x_ffn_api_keys',
    entity_id:    keyId,
    new_values:   { is_active: false },
  })

  revalidatePath('/partner/settings/api-keys')
  return { error: null }
}
