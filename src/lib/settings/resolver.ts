import { createAdminClient } from '@/lib/supabase/admin'

type CacheEntry = { value: string; expiresAt: number }
const _cache = new Map<string, CacheEntry>()
const TTL_MS = 5 * 60 * 1000 // 5 minutes

function cacheKey(key: string, tier: number, id: string): string {
  return `${tier}:${id}:${key}`
}

function fromCache(k: string): string | null {
  const entry = _cache.get(k)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { _cache.delete(k); return null }
  return entry.value
}

function toCache(k: string, value: string): void {
  _cache.set(k, { value, expiresAt: Date.now() + TTL_MS })
}

export type GetSettingOpts = {
  userId?:   string
  tenantId?: string
}

export async function getSetting(
  key: string,
  opts?: GetSettingOpts
): Promise<string | null> {
  const db = createAdminClient()

  // Tier 1: user-scoped
  if (opts?.userId) {
    const ck = cacheKey(key, 1, opts.userId)
    const cached = fromCache(ck)
    if (cached !== null) return cached
    const { data } = await db
      .from('x_ffn_setting')
      .select('value')
      .eq('tier', 1)
      .eq('user_id', opts.userId)
      .eq('key', key)
      .maybeSingle()
    if (data?.value !== undefined) { toCache(ck, data.value); return data.value }
  }

  // Tier 2: tenant-scoped
  if (opts?.tenantId) {
    const ck = cacheKey(key, 2, opts.tenantId)
    const cached = fromCache(ck)
    if (cached !== null) return cached
    const { data } = await db
      .from('x_ffn_setting')
      .select('value')
      .eq('tier', 2)
      .eq('tenant_id', opts.tenantId)
      .eq('key', key)
      .maybeSingle()
    if (data?.value !== undefined) { toCache(ck, data.value); return data.value }
  }

  // Tier 3: platform default
  const ck = cacheKey(key, 3, 'platform')
  const cached = fromCache(ck)
  if (cached !== null) return cached
  const { data } = await db
    .from('x_ffn_setting')
    .select('value')
    .eq('tier', 3)
    .eq('key', key)
    .maybeSingle()
  if (data?.value !== undefined) { toCache(ck, data.value); return data.value }

  return null
}

export async function upsertTenantSetting(
  key: string,
  value: string,
  tenantId: string
): Promise<{ error: string | null }> {
  const db = createAdminClient()
  const { error } = await db
    .from('x_ffn_setting')
    .upsert(
      { tier: 2, tenant_id: tenantId, user_id: null, key, value, data_type: 'string' },
      { onConflict: 'tenant_id,user_id,tier,key' }
    )
  if (error) return { error: error.message }
  // Invalidate cache
  _cache.delete(cacheKey(key, 2, tenantId))
  return { error: null }
}

export function invalidateCache(tenantId?: string): void {
  if (!tenantId) { _cache.clear(); return }
  for (const k of _cache.keys()) {
    if (k.includes(`:${tenantId}:`)) _cache.delete(k)
  }
}
