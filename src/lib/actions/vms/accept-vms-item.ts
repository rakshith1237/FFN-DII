'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { type ExtractedData } from '@/lib/types/vms'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type AcceptVmsState = { error?: string; success?: boolean; jdId?: string }

export async function acceptVmsItem(
  inboxId:      string,
  mergedFields: Record<string, string>,
  rawExtracted: ExtractedData | null
): Promise<AcceptVmsState> {
  await requirePersona(['p_recruiter', 'p_hiring_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  // BR-VMS-004: Only Pending items can be accepted
  const { data: inbox, error: inboxFetchError } = await supabaseAdmin
    .from('x_ffn_vms_inbox')
    .select('parse_status')
    .eq('id', inboxId)
    .eq('tenant_id', tenantId)
    .single()

  if (inboxFetchError || !inbox) return { error: 'Inbox record not found.' }
  if (inbox.parse_status !== 'pending') {
    return { error: `BR-VMS-004: This item is already ${inbox.parse_status} and cannot be accepted again.` }
  }

  // Validate mandatory fields
  const jobTitle  = mergedFields['job_title']?.trim()
  const startDate = mergedFields['start_date']?.trim()
  if (!jobTitle || !startDate)
    return { error: 'Job Title and Start Date are required to accept.' }

  // Extract to local vars — noUncheckedIndexedAccess requires a const to narrow through ternary
  const billRateStr  = mergedFields['bill_rate']
  const headcountStr = mergedFields['headcount']

  // Create Draft JD
  const { data: jd, error: jdError } = await supabaseAdmin
    .from('x_ffn_job_description')
    .insert({
      tenant_id:        tenantId,
      vms_inbox_id:     inboxId,
      status:           'draft',
      title:            jobTitle,
      requisition_id:   mergedFields['requisition_id']   ?? null,
      description:      mergedFields['description']      ?? null,
      business_unit:    mergedFields['business_unit']    ?? null,
      location_city:    mergedFields['location_city']    ?? null,
      location_state:   mergedFields['location_state']   ?? null,
      location_country: mergedFields['location_country'] ?? null,
      work_type:        mergedFields['work_type']        ?? null,
      start_date:       startDate                        ?? null,
      end_date:         mergedFields['end_date']         ?? null,
      bill_rate:        billRateStr  ? parseFloat(billRateStr)        : null,
      skills:           mergedFields['skills']           ?? null,
      headcount:        headcountStr ? parseInt(headcountStr, 10)     : null,
      priority:         mergedFields['priority']         ?? null,
      raw_extracted:    rawExtracted,
    })
    .select('id')
    .single()

  if (jdError || !jd) return { error: jdError?.message ?? 'Failed to create JD.' }

  // Update inbox record
  const { error: updateError } = await supabaseAdmin
    .from('x_ffn_vms_inbox')
    .update({ parse_status: 'accepted', parsed_jd_id: jd.id })
    .eq('id', inboxId)
    .eq('tenant_id', tenantId)

  if (updateError) return { error: updateError.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'p_recruiter',
    action:       'vms.item_accepted',
    entity_type:  'x_ffn_vms_inbox',
    entity_id:    inboxId,
    new_values:   { jd_id: jd.id, title: jobTitle },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true, jdId: jd.id }
}
