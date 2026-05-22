'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { revalidatePath }       from 'next/cache'

// Submit draft offer for approval
export async function submitOfferForApproval(
  offerId: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) return { error: 'Forbidden' }

  const db = createAdminClient()
  const { data: offer } = await db
    .from('x_ffn_offer')
    .select('id, status, jd_id, candidate_id, bill_rate, currency, agency_tenant_id')
    .eq('id', offerId).eq('tenant_id', tenantId).maybeSingle()

  if (!offer) return { error: 'Offer not found' }
  if (offer.status !== 'draft' && offer.status !== 'counter') {
    return { error: 'Only draft or counter offers can be submitted for approval' }
  }

  // Get L1 approver config
  const { data: l1Config } = await db
    .from('x_ffn_offer_approval_config')
    .select('approver_persona')
    .eq('tenant_id', tenantId)
    .eq('level', 1)
    .eq('is_active', true)
    .maybeSingle()

  const approverPersona = l1Config?.approver_persona ?? 'p_super_admin'

  await db.from('x_ffn_offer').update({ status: 'pending_approval' }).eq('id', offerId)

  // Create L1 approval record
  await db.from('x_ffn_offer_approval').insert({
    tenant_id:   tenantId,
    offer_id:    offerId,
    approver_id: user.id, // placeholder — will be updated by actual approver
    level:       1,
    decision:    'pending',
  })

  // Notify L1 approver persona
  await fireNotification('OFFER_CREATED', tenantId, {
    candidateName: '',
    jdTitle:       `Approval required — Level 1 (${approverPersona})`,
    amount:        `${offer.bill_rate} ${offer.currency}`,
  })

  revalidatePath('/partner/offers')
  return { error: null }
}

// Approve or reject at any level
export async function approveOrRejectOffer(
  offerId: string,
  decision: 'approved' | 'rejected',
  notes?: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }

  const db = createAdminClient()
  const { data: offer } = await db
    .from('x_ffn_offer')
    .select('id, status, bill_rate, currency, agency_tenant_id, jd_id, candidate_id')
    .eq('id', offerId).eq('tenant_id', tenantId).maybeSingle()

  if (!offer) return { error: 'Offer not found' }
  if (offer.status !== 'pending_approval') {
    return { error: 'Offer is not pending approval' }
  }

  // Record decision on the pending approval row
  await db.from('x_ffn_offer_approval')
    .update({ decision, notes: notes ?? null, decided_at: new Date().toISOString(), approver_id: user.id })
    .eq('offer_id', offerId).eq('decision', 'pending')

  if (decision === 'rejected') {
    await db.from('x_ffn_offer').update({ status: 'rejected' }).eq('id', offerId)
    await fireNotification('OFFER_REJECTED', tenantId, { candidateName: '', jdTitle: '' })
    revalidatePath('/partner/offers')
    return { error: null }
  }

  // Check if next level exists
  const { data: pendingApproval } = await db
    .from('x_ffn_offer_approval')
    .select('level')
    .eq('offer_id', offerId)
    .eq('decision', 'approved')
    .order('level', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentLevel = pendingApproval?.level ?? 1
  const { data: nextConfig } = await db
    .from('x_ffn_offer_approval_config')
    .select('approver_persona')
    .eq('tenant_id', tenantId)
    .eq('level', currentLevel + 1)
    .eq('is_active', true)
    .maybeSingle()

  if (nextConfig) {
    // Create next level approval record
    await db.from('x_ffn_offer_approval').insert({
      tenant_id:   tenantId,
      offer_id:    offerId,
      approver_id: user.id,
      level:       currentLevel + 1,
      decision:    'pending',
    })
    await fireNotification('OFFER_CREATED', tenantId, {
      candidateName: '',
      jdTitle:       `Approval required — Level ${currentLevel + 1} (${nextConfig.approver_persona})`,
      amount:        `${offer.bill_rate} ${offer.currency}`,
    })
  } else {
    // All levels approved
    await db.from('x_ffn_offer').update({ status: 'approved' }).eq('id', offerId)
    await fireNotification('OFFER_APPROVED', tenantId, { candidateName: '', jdTitle: '' },
      { extraTenantIds: [offer.agency_tenant_id] })
    await fireNotification('OFFER_DELIVERED', tenantId, {
      candidateName: '',
      jdTitle:       '',
      billRate:      String(offer.bill_rate),
      currency:      offer.currency,
    }, { extraTenantIds: [offer.agency_tenant_id] })
  }

  revalidatePath('/partner/offers')
  return { error: null }
}
