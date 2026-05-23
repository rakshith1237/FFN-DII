'use server'
import { createAdminClient }                    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }                      from '@/lib/notifications/fire-notification'
import { revalidatePath }                        from 'next/cache'

export async function approveRejectExtension(
  extensionId:     string,
  action:          'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (persona !== 'p_super_admin') {
    return { error: 'Only Partner Super Admin can approve or reject extensions' }
  }
  if (action === 'rejected' && (!rejectionReason || rejectionReason.trim().length < 10)) {
    return { error: 'Rejection reason required (min 10 characters)' }
  }

  const db = createAdminClient()

  const { data: ext } = await db
    .from('x_ffn_contract_extension')
    .select('id, status, placement_id, proposed_end_date, tenant_id')
    .eq('id', extensionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!ext)                  return { error: 'Extension request not found' }
  if (ext.status !== 'pending') return { error: 'This request has already been reviewed' }

  const updateData: Record<string, unknown> = {
    status:      action,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    ...(action === 'rejected' ? { rejection_reason: rejectionReason!.trim() } : {}),
    ...(action === 'approved' ? { approved_at: new Date().toISOString() }     : {}),
  }

  const { error: updateError } = await db
    .from('x_ffn_contract_extension')
    .update(updateData)
    .eq('id', extensionId)

  if (updateError) return { error: updateError.message }

  // BR-EXT-003: approved extension updates placement end_date immediately
  if (action === 'approved') {
    await db
      .from('x_ffn_placement')
      .update({ end_date: ext.proposed_end_date })
      .eq('id', ext.placement_id)
  }

  try {
    const eventKey = action === 'approved'
      ? 'CONTRACT_EXTENSION_APPROVED'
      : 'CONTRACT_EXTENSION_REJECTED'
    await fireNotification(eventKey, ext.tenant_id, {
      extensionId,
      placementId: ext.placement_id,
    })
  } catch (_) { /* notification failure must not block the transaction */ }

  revalidatePath('/partner/extensions')
  return { error: null }
}