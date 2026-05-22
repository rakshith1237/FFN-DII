'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { revalidatePath }       from 'next/cache'

export async function approveExtension(
  extensionId: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (persona !== 'p_super_admin') return { error: 'Only Super Admins can approve extensions' }

  const db = createAdminClient()
  const { data: ext } = await db
    .from('x_ffn_contract_extension')
    .select('id, status, placement_id, new_end_date, new_bill_rate, tenant_id')
    .eq('id', extensionId).eq('tenant_id', tenantId).maybeSingle()

  if (!ext) return { error: 'Extension not found' }
  if (ext.status !== 'requested') return { error: 'Only requested extensions can be approved' }

  // Update extension status
  await db.from('x_ffn_contract_extension').update({
    status:      'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }).eq('id', extensionId)

  // Update placement end_date (and optionally bill_rate)
  const updatePayload: Record<string, unknown> = { end_date: ext.new_end_date }
  if (ext.new_bill_rate) updatePayload.bill_rate = ext.new_bill_rate

  await db.from('x_ffn_placement').update(updatePayload).eq('id', ext.placement_id)

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'placement.extended',
    entity_type:  'x_ffn_placement',
    entity_id:    ext.placement_id,
    new_values:   { new_end_date: ext.new_end_date, new_bill_rate: ext.new_bill_rate },
  })

  await fireNotification('CONTRACT_EXTENDED', tenantId, {
    placementId: ext.placement_id,
    newEndDate:  ext.new_end_date,
    status:      'approved',
  })

  revalidatePath(`/partner/placements/${ext.placement_id}/extension`)
  revalidatePath('/partner/engagement')
  return { error: null }
}

export async function rejectExtension(
  extensionId: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (persona !== 'p_super_admin') return { error: 'Forbidden' }

  const db = createAdminClient()
  const { data: ext } = await db
    .from('x_ffn_contract_extension')
    .select('id, placement_id, status')
    .eq('id', extensionId).eq('tenant_id', tenantId).maybeSingle()

  if (!ext) return { error: 'Extension not found' }
  if (ext.status !== 'requested') return { error: 'Only requested extensions can be rejected' }

  await db.from('x_ffn_contract_extension').update({ status: 'rejected' }).eq('id', extensionId)
  revalidatePath(`/partner/placements/${ext.placement_id}/extension`)
  return { error: null }
}
