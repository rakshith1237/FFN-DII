'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { createOnboardingTasks } from '@/lib/actions/onboarding/create-onboarding-tasks'
import { revalidatePath }       from 'next/cache'

export async function acceptOffer(
  offerId: string
): Promise<{ error: string | null; placementId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', placementId: null }
  if (!['a_recruiting_manager','a_super_admin'].includes(persona)) {
    return { error: 'Only Agency Recruiting Managers can accept offers', placementId: null }
  }

  const db = createAdminClient()
  const { data: offer } = await db
    .from('x_ffn_offer')
    .select('id, status, tenant_id, agency_tenant_id, jd_id, candidate_id, bill_rate, currency, rate_model, start_date, end_date, payment_terms')
    .eq('id', offerId)
    .eq('agency_tenant_id', tenantId)
    .maybeSingle()

  if (!offer) return { error: 'Offer not found', placementId: null }
  if (offer.status !== 'approved') {
    return { error: 'Only approved offers can be accepted', placementId: null }
  }

  // INSERT placement
  const { data: placement, error: placementError } = await db
    .from('x_ffn_placement')
    .insert({
      tenant_id:        offer.tenant_id,
      agency_tenant_id: offer.agency_tenant_id,
      jd_id:            offer.jd_id,
      candidate_id:     offer.candidate_id,
      offer_id:         offerId,
      bill_rate:        offer.bill_rate,
      currency:         offer.currency,
      rate_model:       offer.rate_model,
      start_date:       offer.start_date,
      end_date:         offer.end_date,
      payment_terms:    offer.payment_terms,
      status:           'pre_start',
    })
    .select('id')
    .single()

  if (placementError) return { error: placementError.message, placementId: null }

  await db.from('x_ffn_offer').update({ status: 'accepted' }).eq('id', offerId)
  await db.from('x_ffn_submission').update({ status: 'offer_made' })
    .eq('jd_id', offer.jd_id).eq('candidate_id', offer.candidate_id)

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    offer.tenant_id,
    actor_id:     user.id,
    persona_code: persona,
    action:       'placement.created',
    entity_type:  'x_ffn_placement',
    entity_id:    placement.id,
    new_values:   { offer_id: offerId, status: 'pre_start' },
  })

  // Auto-create all onboarding tasks (FRD §68-73)
  const { data: candidateData } = await db
    .from('x_ffn_candidate')
    .select('first_name, last_name, work_authorization, location_country')
    .eq('id', offer.candidate_id)
    .maybeSingle()

  const candidateName = candidateData
    ? `${String(candidateData.first_name)} ${String(candidateData.last_name)}`
    : ''
  await fireNotification('PLACEMENT_CREATED', offer.tenant_id, {
    candidateName,
    startDate: offer.start_date,
  }, { extraTenantIds: [offer.agency_tenant_id] })

  await createOnboardingTasks({
    placementId:       placement.id,
    tenantId:          offer.tenant_id,
    startDate:         offer.start_date,
    workAuthorization: candidateData?.work_authorization ?? null,
    locationCountry:   candidateData?.location_country   ?? null,
  })

  revalidatePath('/agency/offers')
  return { error: null, placementId: placement.id }
}

export async function counterOffer(input: {
  offerId:          string
  proposedBillRate: number
  proposedStartDate: string | null
  proposedEndDate:  string | null
  currency:         string
  counterNotes:     string | null
}): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['a_recruiting_manager','a_super_admin'].includes(persona)) return { error: 'Forbidden' }
  if (input.proposedBillRate <= 0) return { error: 'Proposed rate must be greater than 0' }

  const db = createAdminClient()
  const { data: offer } = await db
    .from('x_ffn_offer')
    .select('id, status, tenant_id, agency_tenant_id')
    .eq('id', input.offerId)
    .eq('agency_tenant_id', tenantId)
    .maybeSingle()

  if (!offer) return { error: 'Offer not found' }
  if (offer.status !== 'approved') return { error: 'Can only counter an approved offer' }

  const { data: counter, error: counterError } = await db
    .from('x_ffn_offer_counter')
    .insert({
      tenant_id:          offer.tenant_id,
      original_offer_id:  input.offerId,
      agency_tenant_id:   tenantId,
      proposed_bill_rate: input.proposedBillRate,
      proposed_start_date: input.proposedStartDate,
      proposed_end_date:  input.proposedEndDate,
      currency:           input.currency,
      counter_notes:      input.counterNotes,
      status:             'pending',
      created_by:         user.id,
    })
    .select('id')
    .single()

  if (counterError) return { error: counterError.message }

  // Reset offer to draft for re-routing
  await db.from('x_ffn_offer').update({
    status:            'draft',
    latest_counter_id: counter.id,
  }).eq('id', input.offerId)

  await fireNotification('OFFER_REJECTED', offer.tenant_id, {
    candidateName: '',
    jdTitle:       `Counter-offer received: ${input.proposedBillRate} ${input.currency}/day`,
  })

  revalidatePath('/agency/offers')
  return { error: null }
}