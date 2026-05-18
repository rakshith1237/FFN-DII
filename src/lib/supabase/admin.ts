import { createClient } from '@supabase/supabase-js'

/**
 * SERVICE ROLE CLIENT — SERVER ONLY
 * Bypasses RLS intentionally for admin operations.
 * NEVER import in client components ('use client' files).
 * Safe imports: server actions, API routes, BullMQ workers.
 * ADR-EXT-002: Service role key never exposed to client bundle.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    '[FFN] createAdminClient() imported in a browser context. ' +
    'This module is server-only. Move the import to a server component or API route.'
  )
}

export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      '[FFN] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      'are required for the admin client.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
