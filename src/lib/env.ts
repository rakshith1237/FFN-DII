import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL:      z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY:     z.string().min(1),
  MAILGUN_WEBHOOK_SIGNING_KEY:   z.string().min(1),
  MAILGUN_PRIVATE_API_KEY:       z.string().min(1),
  MAILGUN_DOMAIN:                z.string().min(1),
  MAILGUN_BASE_URL:              z.string().url(),
  UPSTASH_REDIS_REST_URL:        z.string().url(),
  UPSTASH_REDIS_REST_TOKEN:      z.string().min(1),
  RESEND_API_KEY:                z.string().min(1),
  RESEND_FROM_EMAIL:             z.string().email(),
  ANTHROPIC_API_KEY:             z.string().min(1),
  DOCUSIGN_INTEGRATION_KEY:      z.string().uuid(),
  DOCUSIGN_ACCOUNT_ID:           z.string().min(1),
  DOCUSIGN_USER_ID:              z.string().uuid(),
  DOCUSIGN_BASE_URL:             z.string().url(),
  DOCUSIGN_AUTH_SERVER:          z.string().min(1),
  NEXT_PUBLIC_APP_URL:           z.string().url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const missing = parsed.error.issues
    .map(i => '  - ' + i.path.join('.') + ': ' + i.message)
    .join('\n')
  throw new Error('\n❌ Environment variable validation failed:\n' + missing + '\n\nCheck your .env.local file.\n')
}

export const env = parsed.data
