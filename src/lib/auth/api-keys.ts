import { createAdminClient } from '@/lib/supabase/admin'
import { createHash }        from 'crypto'

export type ApiKeyContext = {
  tenantId: string
  scopes:   string[]
  keyId:    string
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export async function verifyApiKey(
  rawKey: string | null | undefined
): Promise<ApiKeyContext | null> {
  if (!rawKey) return null

  const keyHash = hashApiKey(rawKey)
  const db      = createAdminClient()

  const { data: apiKey } = await db
    .from('x_ffn_api_keys')
    .select('id, tenant_id, scopes, is_active, rate_limit_rpm')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle()

  if (!apiKey) return null

  // Update last_used_at (fire-and-forget, non-blocking)
  void db.from('x_ffn_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(() => {}, () => {})

  return {
    tenantId: apiKey.tenant_id,
    scopes:   apiKey.scopes as string[],
    keyId:    apiKey.id,
  }
}

export function hasScope(ctx: ApiKeyContext, scope: string): boolean {
  return ctx.scopes.includes(scope) || ctx.scopes.includes('admin')
}
