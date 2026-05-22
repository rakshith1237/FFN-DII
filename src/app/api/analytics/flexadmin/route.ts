import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin'
import { getPersonaCode }            from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db  = createAdminClient()
  const now  = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { count: totalTenants },
    { count: partnerCount },
    { count: agencyCount },
    { count: newTenants },
    { count: totalJds },
    { count: activeJds },
    { count: newJds },
    { count: totalPlacements },
    { count: activePlacements },
    { count: newPlacements },
    { count: lastMonthPlacements },
    { data: allAgencyBroadcasts },
    { data: allAgencyPlacements },
    { data: allAgencies },
  ] = await Promise.all([
    db.from('x_ffn_tenant').select('*', { count: 'exact', head: true }),
    db.from('x_ffn_tenant').select('*', { count: 'exact', head: true }).eq('type', 'partner'),
    db.from('x_ffn_tenant').select('*', { count: 'exact', head: true }).eq('type', 'agency'),
    db.from('x_ffn_tenant').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
    db.from('x_ffn_jd').select('*', { count: 'exact', head: true }),
    db.from('x_ffn_jd').select('*', { count: 'exact', head: true }).in('status', ['active','broadcast']),
    db.from('x_ffn_jd').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    db.from('x_ffn_jd_broadcast').select('agency_tenant_id'),
    db.from('x_ffn_placement').select('agency_tenant_id'),
    db.from('x_ffn_tenant').select('id, name').eq('type', 'agency'),
  ])

  // MoM growth
  const momGrowthPct = lastMonthPlacements && lastMonthPlacements > 0
    ? Math.round((((newPlacements ?? 0) - lastMonthPlacements) / lastMonthPlacements) * 100)
    : null

  // Top 5 agencies by fill_rate across all tenants
  const agencyMap: Record<string, string> = {}
  for (const a of allAgencies ?? []) agencyMap[a.id] = a.name

  const bcastCount: Record<string, number> = {}
  const placCount:  Record<string, number> = {}
  for (const b of allAgencyBroadcasts ?? []) bcastCount[b.agency_tenant_id] = (bcastCount[b.agency_tenant_id] ?? 0) + 1
  for (const p of allAgencyPlacements  ?? []) placCount[p.agency_tenant_id]  = (placCount[p.agency_tenant_id]  ?? 0) + 1

  const agencyIds = new Set([...Object.keys(bcastCount), ...Object.keys(placCount)])
  const topAgencies = Array.from(agencyIds)
    .map(id => ({
      agencyId:       id,
      agencyName:     agencyMap[id] ?? id.slice(0, 8),
      broadcastCount: bcastCount[id] ?? 0,
      placementCount: placCount[id] ?? 0,
      fillRate:       bcastCount[id] ? Math.round(((placCount[id] ?? 0) / bcastCount[id]) * 100) : 0,
    }))
    .sort((a, b) => b.fillRate - a.fillRate)
    .slice(0, 5)

  // Platform-wide submission funnel (no tenant filter)
  const [
    { count: fPublished },
    { count: fSubmitted },
    { count: fShortlisted },
    { count: fInterviewed },
    { count: fOfferMade },
    { count: fPlaced },
  ] = await Promise.all([
    db.from('x_ffn_jd').select('*', { count: 'exact', head: true }).in('status', ['active','broadcast','filled','closed']),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).in('status', ['shortlisted','interview_scheduled','offer_made','filled']),
    db.from('x_ffn_interview').select('*', { count: 'exact', head: true }),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).in('status', ['offer_made','filled']),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }),
  ])

  const funnelStages = [
    { stage: 'JDs Published',        count: fPublished   ?? 0 },
    { stage: 'Submissions Received', count: fSubmitted   ?? 0 },
    { stage: 'Shortlisted',          count: fShortlisted ?? 0 },
    { stage: 'Interviews',           count: fInterviewed ?? 0 },
    { stage: 'Offers Made',          count: fOfferMade   ?? 0 },
    { stage: 'Placements',           count: fPlaced      ?? 0 },
  ]

  const platformFunnel = funnelStages.map((s, i) => ({
    ...s,
    dropoffPct: i === 0 ? 0
      : funnelStages[i - 1]!.count > 0
        ? Math.round((1 - s.count / funnelStages[i - 1]!.count) * 100)
        : 0,
  }))

  // Placements-by-month (last 6 months)
  const { data: placementsByDate } = await db
    .from('x_ffn_placement')
    .select('created_at')
    .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
    .order('created_at', { ascending: true })

  const monthBuckets: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
  }
  for (const p of placementsByDate ?? []) {
    const key = p.created_at.substring(0, 7)
    if (key in monthBuckets) monthBuckets[key]!++
  }
  const placementsByMonth = Object.entries(monthBuckets).map(([month, count]) => ({ month, count }))

  return NextResponse.json({
    kpis: {
      tenants:    { total: totalTenants ?? 0, partners: partnerCount ?? 0, agencies: agencyCount ?? 0, newThisMonth: newTenants ?? 0 },
      jds:        { total: totalJds ?? 0, active: activeJds ?? 0, newThisMonth: newJds ?? 0 },
      placements: { total: totalPlacements ?? 0, active: activePlacements ?? 0, newThisMonth: newPlacements ?? 0, momGrowthPct },
    },
    topAgencies,
    platformFunnel,
    placementsByMonth,
  })
}
