import { createAdminClient } from '@/lib/supabase/admin'
import { getSetting }        from '@/lib/settings/resolver'

export type TenureResult = {
  totalDays:       number
  totalPlacements: number
  isNearThreshold: boolean
  isAtThreshold:   boolean
  thresholdDays:   number
  firstStart:      string | null
  lastEnd:         string | null
}

export async function computeTenure(params: {
  candidateId: string
  tenantId:    string
  agencyTenantId: string
}): Promise<TenureResult> {
  const db = createAdminClient()

  // Fetch all placements (all statuses except cancelled) for this candidate+partner
  const { data: placements } = await db
    .from('x_ffn_placement')
    .select('start_date, end_date, concluded_at, status')
    .eq('candidate_id', params.candidateId)
    .eq('tenant_id', params.tenantId)
    .not('status', 'eq', 'cancelled')

  const today = new Date()
  let totalDays = 0
  let firstStart: string | null = null
  let lastEnd:    string | null = null

  for (const p of placements ?? []) {
    const start = new Date(p.start_date)
    // Use concluded_at > end_date > today as the end point
    const endPoint = p.concluded_at
      ? new Date(p.concluded_at)
      : p.end_date
        ? new Date(p.end_date)
        : today

    const days = Math.max(0, Math.ceil((endPoint.getTime() - start.getTime()) / 86400000))
    totalDays += days

    if (!firstStart || p.start_date < firstStart) firstStart = p.start_date
    const endStr = p.end_date ?? today.toISOString().split('T')[0]
    if (!lastEnd || endStr > lastEnd) lastEnd = endStr
  }

  const thresholdStr = await getSetting('tenure.limit_days', { tenantId: params.tenantId })
  const thresholdDays = thresholdStr ? parseInt(thresholdStr) : 730

  const isAtThreshold   = totalDays >= thresholdDays
  const isNearThreshold = totalDays >= Math.floor(thresholdDays * 0.9)

  // UPSERT x_ffn_tenure_summary
  await db.from('x_ffn_tenure_summary').upsert({
    candidate_id:      params.candidateId,
    tenant_id:         params.tenantId,
    agency_tenant_id:  params.agencyTenantId,
    total_days_active: totalDays,
    total_placements:  (placements ?? []).length,
    first_placement_start: firstStart,
    last_placement_end:    lastEnd,
    is_near_threshold: isNearThreshold,
    is_at_threshold:   isAtThreshold,
    threshold_days:    thresholdDays,
    last_computed_at:  new Date().toISOString(),
  }, { onConflict: 'candidate_id,tenant_id' })

  return {
    totalDays,
    totalPlacements: (placements ?? []).length,
    isNearThreshold,
    isAtThreshold,
    thresholdDays,
    firstStart,
    lastEnd,
  }
}
