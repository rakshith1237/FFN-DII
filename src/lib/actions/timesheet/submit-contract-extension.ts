'use server'
import { createAdminClient }                    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }                      from '@/lib/notifications/fire-notification'
import { revalidatePath }                        from 'next/cache'

export type ContractExtensionInput = {
  placementId:       string
  newEndDate:        string
  proposedBillRate?: number | null
  extensionReason:   string
}

export async function submitContractExtension(
  input: ContractExtensionInput
): Promise<{ error: string | null; extensionId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', extensionId: null }
  if (!['p_hiring_manager', 'p_super_admin', 'a_recruiting_manager'].includes(persona)) {
    return { error: 'Only Partner HM or Agency ARM can request extensions', extensionId: null }
  }

  if (!input.extensionReason || input.extensionReason.trim().length < 50) {
    return { error: 'Extension justification must be at least 50 characters (FRD BR-EXT)', extensionId: null }
  }

  const db = createAdminClient()

  // BR-EXT-001: placement must be active
  const { data: placement } = await db
    .from('x_ffn_placement')
    .select('id, status, end_date, tenant_id, agency_tenant_id')
    .eq('id', input.placementId)
    .maybeSingle()

  if (!placement) return { error: 'Placement not found', extensionId: null }
  if (placement.status !== 'active') {
    return { error: 'Extensions can only be requested for active placements (BR-EXT-001)', extensionId: null }
  }

  if (new Date(input.newEndDate) <= new Date(placement.end_date)) {
    return { error: 'New end date must be after the current end date', extensionId: null }
  }

  const maxDate = new Date(placement.end_date)
  maxDate.setMonth(maxDate.getMonth() + 12)
  if (new Date(input.newEndDate) > maxDate) {
    return { error: 'Extension cannot exceed 12 months from current end date', extensionId: null }
  }

  // BR-EXT-002: only one pending extension per placement at a time
  const { data: existingPending } = await db
    .from('x_ffn_contract_extension')
    .select('id')
    .eq('placement_id', input.placementId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return { error: 'An extension request is already pending for this placement (BR-EXT-002)', extensionId: null }
  }

  const { data: ext, error } = await db
    .from('x_ffn_contract_extension')
    .insert({
      tenant_id:          placement.tenant_id,
      agency_tenant_id:   placement.agency_tenant_id,
      placement_id:       input.placementId,
      requested_by:       user.id,
      requested_by_role:  persona,
      current_end_date:   placement.end_date,
      proposed_end_date:  input.newEndDate,
      proposed_bill_rate: input.proposedBillRate ?? null,
      extension_reason:   input.extensionReason.trim(),
      status:             'pending',
    })
    .select('id')
    .single()

  if (error) return { error: error.message, extensionId: null }

  try {
    await fireNotification('CONTRACT_EXTENSION_REQUESTED', placement.tenant_id, {
      placementId: input.placementId,
      newEndDate:  input.newEndDate,
    })
  } catch (_) { /* notification failure must not block the transaction */ }

  revalidatePath('/partner/extensions')
  return { error: null, extensionId: ext.id }
}