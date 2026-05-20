'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type DedupResult = {
  blocked:         boolean
  existingRtrId?:  string
  existingNumber?: string
}

export async function checkRtrDedup(
  candidateId:    string,
  jdId:           string,
  agencyTenantId: string
): Promise<DedupResult> {
  const { data } = await supabaseAdmin
    .from('x_ffn_rtr')
    .select('id, number')
    .eq('candidate_id',     candidateId)
    .eq('jd_id',            jdId)
    .eq('agency_tenant_id', agencyTenantId)
    .neq('status', 'voided')
    .gte('created_at', new Date(Date.now() - 4 * 30 * 24 * 3600000).toISOString())
    .limit(1)
    .single()

  if (!data) return { blocked: false }
  return {
    blocked:        true,
    existingRtrId:  data.id,
    existingNumber: data.number,
  }
}
