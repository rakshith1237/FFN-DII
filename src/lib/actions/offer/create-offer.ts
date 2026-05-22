'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { revalidatePath }       from 'next/cache'

export type CreateOfferInput = {
  submissionId:    string
  candidateId:     string
  jdId:            string
  agencyTenantId:  string
  billRate:        number
  currency:        string
  rateModel:       'hourly' | 'daily' | 'fixed'
  startDate:       string
  endDate:         string | null
  paymentTerms:    string
  notes:           string | null
}

export async function createOffer(
  input: CreateOfferInput
): Promise<{ error: string | null; offerId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', offerId: null }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) {
    return { error: 'Only Hiring Managers can create offers', offerId: null }
  }
  if (input.billRate <= 0) return { error: 'Bill rate must be greater than 0', offerId: null }
  if (!input.startDate) return { error: 'Start date is required', offerId: null }

  const db = createAdminClient()

  // Verify interview is scored before offer
  const { data: interview } = await db
    .from('x_ffn_interview')
    .select('id, status, composite_interview_score, offer_recommendation')
    .eq('submission_id', input.submissionId)
    .maybeSingle()

  if (interview && interview.status !== 'scored') {
    return { error: 'Interview must be completed and scored before creating an offer', offerId: null }
  }

  const { data: offer, error } = await db
    .from('x_ffn_offer')
    .insert({
      tenant_id:        tenantId,
      agency_tenant_id: input.agencyTenantId,
      jd_id:            input.jdId,
      submission_id:    input.submissionId,
      candidate_id:     input.candidateId,
      bill_rate:        input.billRate,
      currency:         input.currency,
      rate_model:       input.rateModel,
      start_date:       input.startDate,
      end_date:         input.endDate,
      payment_terms:    input.paymentTerms,
      status:           'draft',
      created_by:       user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, offerId: null }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'offer.created',
    entity_type:  'x_ffn_offer',
    entity_id:    offer.id,
    new_values:   { bill_rate: input.billRate, currency: input.currency },
  })

  await fireNotification('OFFER_CREATED', tenantId, {
    candidateName: '',
    jdTitle:       '',
    amount:        `${input.billRate} ${input.currency}`,
  }, { extraTenantIds: [input.agencyTenantId] })

  revalidatePath('/partner/offers')
  return { error: null, offerId: offer.id }
}
