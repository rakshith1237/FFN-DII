'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type DedupResult = {
  isDuplicate:    boolean
  agencyTenantId: string | null
}

export async function checkRtrDedup(
  candidateId: string,
  jdId:        string
): Promise<DedupResult> {
  const db = createAdminClient()
  const fourMonthsAgo = new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: existing } = await db
    .from('x_ffn_rtr')
    .select('id, agency_tenant_id')
    .eq('candidate_id', candidateId)
    .eq('jd_id', jdId)
    .not('status', 'in', '("expired","voided")')
    .gt('created_at', fourMonthsAgo)
    .maybeSingle()

  if (!existing) return { isDuplicate: false, agencyTenantId: null }
  return { isDuplicate: true, agencyTenantId: existing.agency_tenant_id }
}
