'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { revalidatePath }       from 'next/cache'

export async function requestExtension(input: {
  placementId:  string
  newEndDate:   string
  newBillRate:  number | null
  reason:       string
}): Promise<{ error: string | null; extensionId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', extensionId: null }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) {
    return { error: 'Only Hiring Managers can request extensions', extensionId: null }
  }

  const db = createAdminClient()
  const { data: placement } = await db
    .from('x_ffn_placement')
    .select('id, status, end_date, tenant_id')
    .eq('id', input.placementId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!placement) return { error: 'Placement not found', extensionId: null }
  if (!['active','pre_start'].includes(placement.status)) {
    return { error: 'Extensions can only be requested for active or pre-start placements', extensionId: null }
  }
  if (placement.end_date && new Date(input.newEndDate) <= new Date(placement.end_date)) {
    return { error: 'New end date must be after the current end date', extensionId: null }
  }

  const { data: ext, error } = await db
    .from('x_ffn_contract_extension')
    .insert({
      tenant_id:      tenantId,
      placement_id:   input.placementId,
      new_end_date:   input.newEndDate,
      new_bill_rate:  input.newBillRate,
      reason:         input.reason,
      status:         'requested',
      requested_by:   user.id,
      requested_at:   new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message, extensionId: null }

  await fireNotification('CONTRACT_EXTENDED', tenantId, {
    placementId:   input.placementId,
    newEndDate:    input.newEndDate,
    requestedBy:   persona,
    status:        'requested',
  })

  revalidatePath(`/partner/placements/${input.placementId}/extension`)
  return { error: null, extensionId: ext.id }
}
