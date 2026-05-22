import { Ratelimit } from '@upstash/ratelimit'
import { Redis }     from '@upstash/redis'

let ratelimiter: Ratelimit | null = null

function getRatelimiter(): Ratelimit {
  if (ratelimiter) return ratelimiter

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL   ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  })

  ratelimiter = new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(100, '1 m'),
    analytics: false,
    prefix:    'ffn:api:rl',
  })

  return ratelimiter
}

export async function checkApiKeyRateLimit(
  keyId: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const rl     = getRatelimiter()
  const result = await rl.limit(`key:${keyId}`)
  return {
    success:   result.success,
    remaining: result.remaining,
    reset:     result.reset,
  }
}
