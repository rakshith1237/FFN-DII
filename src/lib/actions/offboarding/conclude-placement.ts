'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { createOffboardingTasks } from './create-offboarding-tasks'
import { computeTenure }        from '../engagement/compute-tenure'
import { revalidatePath }       from 'next/cache'

export type ConcludePlacementInput = {
  placementId:     string
  conclusionType:  'natural_end' | 'early_termination'
  conclusionReason: string | null   // required if early_termination
  effectiveDate:   string | null    // required if early_termination (YYYY-MM-DD)
  performanceRating: 'exceptional' | 'good' | 'satisfactory' | 'below_expectations' | 'unsatisfactory' | null
  rehireEligible:  boolean | null
  rehireNotes:     string | null
}

export async function concludePlacement(
  input: ConcludePlacementInput
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) {
    return { error: 'Only Hiring Managers can conclude engagements' }
  }

  // Validate early termination fields
  if (input.conclusionType === 'early_termination') {
    if (!input.conclusionReason || input.conclusionReason.trim().length < 20) {
      return { error: 'Termination reason must be at least 20 characters' }
    }
    if (!input.effectiveDate) {
      return { error: 'Effective date is required for early termination' }
    }
  }

  const db = createAdminClient()

  // Fetch placement
  const { data: placement } = await db
    .from('x_ffn_placement')
    .select('id, status, tenant_id, agency_tenant_id, candidate_id, jd_id, start_date, end_date, bill_rate, currency, rate_model, payment_terms')
    .eq('id', input.placementId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!placement) return { error: 'Placement not found' }
  if (placement.status !== 'active') {
    return { error: `Only active placements can be concluded (current: ${placement.status})` }
  }

  const effectiveDate = input.conclusionType === 'early_termination' && input.effectiveDate
    ? input.effectiveDate
    : placement.end_date ?? new Date().toISOString().split('T')[0]

  const concludedAt = new Date().toISOString()

  // UPDATE placement
  const { error: updateError } = await db
    .from('x_ffn_placement')
    .update({
      status:           'concluded',
      concluded_at:     concludedAt,
      conclusion_type:  input.conclusionType,
      ended_at:         concludedAt,
      end_reason:       input.conclusionReason ?? null,
    })
    .eq('id', input.placementId)

  if (updateError) return { error: updateError.message }

  // Cancel future timesheets if early termination
  if (input.conclusionType === 'early_termination' && input.effectiveDate) {
    await db
      .from('x_ffn_timesheet')
      .update({ status: 'cancelled', notes: `Cancelled — engagement concluded on ${input.effectiveDate}` })
      .eq('placement_id', input.placementId)
      .gt('period_start', input.effectiveDate)
      .in('status', ['draft','submitted'])
  }

  // Create offboarding tasks
  const { created: tasksCreated } = await createOffboardingTasks({
    placementId: input.placementId,
    tenantId,
    endDate:     effectiveDate,
  })

  // Reset candidate availability to 'available'
  await db
    .from('x_ffn_candidate')
    .update({ availability_status: 'available' })
    .eq('id', placement.candidate_id)

  // Compute and upsert tenure summary
  const tenure = await computeTenure({
    candidateId:    placement.candidate_id,
    tenantId,
    agencyTenantId: placement.agency_tenant_id,
  })

  // Fire TENURE_LIMIT_APPROACHING if near threshold
  if (tenure.isNearThreshold) {
    const { data: candidate } = await db
      .from('x_ffn_candidate')
      .select('first_name, last_name')
      .eq('id', placement.candidate_id)
      .maybeSingle()

    const candidateName = candidate
      ? `${candidate.first_name} ${candidate.last_name}`
      : 'Candidate'

    await fireNotification('TENURE_LIMIT_APPROACHING', tenantId, {
      candidateName,
      totalDays:     String(tenure.totalDays),
      thresholdDays: String(tenure.thresholdDays),
    })
  }

  // Aggregate financial data for conclusion summary
  const [
    { data: timesheets },
    { data: invoices },
  ] = await Promise.all([
    db.from('x_ffn_timesheet')
      .select('hours_regular, hours_overtime')
      .eq('placement_id', input.placementId)
      .eq('status', 'approved'),
    db.from('x_ffn_invoice')
      .select('total_amount, status')
      .eq('placement_id', input.placementId),
  ])

  const totalDaysActive  = Math.ceil(
    (new Date(effectiveDate).getTime() - new Date(placement.start_date).getTime()) / 86400000
  )
  const totalHoursWorked = (timesheets ?? []).reduce(
    (s, t) => s + Number(t.hours_regular ?? 0) + Number(t.hours_overtime ?? 0), 0
  )
  const totalInvoiced = (invoices ?? [])
    .filter(i => ['sent','paid','approved'].includes(i.status))
    .reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPaid = (invoices ?? [])
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total_amount), 0)

  const { data: offboardingCounts } = await db
    .from('x_ffn_offboarding_task')
    .select('status')
    .eq('placement_id', input.placementId)

  const offboardingTotal    = (offboardingCounts ?? []).length
  const offboardingComplete = (offboardingCounts ?? []).filter(t => t.status === 'completed').length

  // UPSERT conclusion summary
  const { data: candidate } = await db
    .from('x_ffn_candidate')
    .select('first_name, last_name')
    .eq('id', placement.candidate_id)
    .maybeSingle()

  const { data: jd } = await db
    .from('x_ffn_jd')
    .select('title')
    .eq('id', placement.jd_id)
    .maybeSingle()

  const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}` : ''
  const jdTitle       = jd?.title ?? ''

  await db.from('x_ffn_conclusion_summary').upsert({
    tenant_id:                 tenantId,
    placement_id:              input.placementId,
    candidate_id:              placement.candidate_id,
    agency_tenant_id:          placement.agency_tenant_id,
    conclusion_date:           effectiveDate,
    conclusion_type:           input.conclusionType,
    conclusion_reason:         input.conclusionReason ?? null,
    total_days_active:         totalDaysActive,
    total_hours_worked:        totalHoursWorked,
    total_invoiced:            totalInvoiced,
    total_paid:                totalPaid,
    pending_amount:            Math.max(0, totalInvoiced - totalPaid),
    offboarding_tasks_total:   offboardingTotal,
    offboarding_tasks_complete: offboardingComplete,
    tenure_total_days:         tenure.totalDays,
    performance_rating:        input.performanceRating ?? null,
    rehire_eligible:           input.rehireEligible ?? null,
    rehire_notes:              input.rehireNotes ?? null,
    re_bench_triggered:        true,
    re_bench_triggered_at:     concludedAt,
    completed_by:              user.id,
    concluded_at:              concludedAt,
  }, { onConflict: 'placement_id' })

  // Audit log
  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'placement.concluded',
    entity_type:  'x_ffn_placement',
    entity_id:    input.placementId,
    new_values:   { conclusion_type: input.conclusionType, effective_date: effectiveDate },
  })

  // Enqueue rebench BullMQ job
  try {
    const { Queue } = await import('bullmq')
    const rebenQueue = new Queue('bench_reindex', {
      connection: {
        host:     new URL(process.env.UPSTASH_REDIS_URL!).hostname,
        port:     parseInt(new URL(process.env.UPSTASH_REDIS_URL!).port || '6379'),
        password: process.env.UPSTASH_REDIS_TOKEN!,
      },
    })
    await rebenQueue.add('rebench', { candidateId: placement.candidate_id })
    await rebenQueue.close()
  } catch (err) {
    console.error('[concludePlacement] rebench enqueue error:', String(err))
  }

  // Fire ENGAGEMENT_CONCLUDED notification
  await fireNotification('ENGAGEMENT_CONCLUDED', tenantId, {
    candidateName,
    jdTitle,
    conclusionType:   input.conclusionType.replace('_', ' '),
    offboardingCount: String(tasksCreated),
  }, { extraTenantIds: [placement.agency_tenant_id] })

  revalidatePath('/partner/engagement')
  revalidatePath('/partner/placements')
  revalidatePath(`/partner/placements/${input.placementId}/conclusion`)
  return { error: null }
}
