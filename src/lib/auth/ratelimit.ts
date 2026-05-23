import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const url = process.env['UPSTASH_REDIS_REST_URL']
const token = process.env['UPSTASH_REDIS_REST_TOKEN']

if (!url) throw new Error('[FFN] UPSTASH_REDIS_REST_URL is required')
if (!token) throw new Error('[FFN] UPSTASH_REDIS_REST_TOKEN is required')

const redis = new Redis({ url, token })

export const signInRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '15 m'),
  prefix: 'ffn:ratelimit:signin',
})

export const gdprExportRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1, '24 h'),
  prefix: 'ffn:ratelimit:gdpr-export',
})

export async function checkRateLimit(
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await signInRateLimit.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
