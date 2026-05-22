import { NextRequest, NextResponse }   from 'next/server'
import { createAdminClient }           from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

function indexPercentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  return sorted[Math.floor(sorted.length * p)] ?? sorted[sorted.length - 1] ?? 0
}

export async function GET(req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['p_super_admin','p_hiring_manager','flex_admin'].includes(persona)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp           = req.nextUrl.searchParams
  const module_      = sp.get('module')   ?? ''
  const workType     = sp.get('workType') ?? ''
  const locationCtry = sp.get('location') ?? ''
  const currency     = sp.get('currency') ?? 'GBP'
  const dateFrom     = sp.get('dateFrom') ?? new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0] ?? ''
  const dateTo       = sp.get('dateTo')   ?? new Date().toISOString().split('T')[0] ?? ''

  const db = createAdminClient()

  // Cross-tenant placement query — no tenant_id filter (admin client)
  let query = db
    .from('x_ffn_placement')
    .select('bill_rate, currency, start_date, work_location_country, work_type, tenant_id, x_ffn_jd!inner(employment_type, primary_module)')
    .eq('currency', currency)
    .gte('start_date', dateFrom)
    .lte('start_date', dateTo)
    .not('bill_rate', 'is', null)

  if (workType && workType !== 'all') query = query.eq('work_type', workType)
  if (locationCtry) query = query.eq('work_location_country', locationCtry)

  const { data: placements } = await query

  type PlacementRow = {
    bill_rate: number
    currency: string
    start_date: string
    tenant_id: string
    x_ffn_jd: { employment_type: string; primary_module: string | null }
  }

  const rows = (placements ?? []) as unknown as PlacementRow[]

  // Filter by module (employment_type or primary_module)
  const filtered = module_
    ? rows.filter(r =>
        (r.x_ffn_jd.primary_module ?? r.x_ffn_jd.employment_type ?? '').toLowerCase().includes(module_.toLowerCase())
      )
    : rows

  // Group by month bucket (YYYY-MM)
  const bucketMap: Record<string, number[]> = {}
  for (const r of filtered) {
    const key = r.start_date.substring(0, 7)
    const arr = bucketMap[key] ?? []
    bucketMap[key] = arr
    arr.push(Number(r.bill_rate))
  }

  const MIN_RECORDS = 10
  const market = Object.entries(bucketMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rates]) => {
      const sorted = [...rates].sort((a, b) => a - b)
      const count  = sorted.length
      if (count < MIN_RECORDS) return { month, p25: null, p50: null, p75: null, count, insufficient: true }
      return {
        month,
        p25: Math.round(indexPercentile(sorted, 0.25)),
        p50: Math.round(indexPercentile(sorted, 0.50)),
        p75: Math.round(indexPercentile(sorted, 0.75)),
        count,
        insufficient: false,
      }
    })

  // Tenant's own JD bill_rates (own-rate overlay) — tenant-scoped
  let ownQuery = db
    .from('x_ffn_jd')
    .select('bill_rate_min, bill_rate_max, published_at, employment_type')
    .eq('tenant_id', tenantId)
    .not('published_at', 'is', null)
    .gte('published_at', `${dateFrom}T00:00:00Z`)
    .lte('published_at', `${dateTo}T23:59:59Z`)
    .not('bill_rate_min', 'is', null)

  if (module_) ownQuery = ownQuery.ilike('employment_type', `%${module_}%`)

  const { data: ownJds } = await ownQuery

  const ownByMonth: Record<string, number[]> = {}
  for (const j of ownJds ?? []) {
    if (!j.published_at) continue
    const key = j.published_at.substring(0, 7)
    const mid = ((Number(j.bill_rate_min ?? 0) + Number(j.bill_rate_max ?? j.bill_rate_min ?? 0)) / 2)
    const arr = ownByMonth[key] ?? []
    ownByMonth[key] = arr
    arr.push(mid)
  }

  const ownRates = Object.entries(ownByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rates]) => {
      const sorted = [...rates].sort((a, b) => a - b)
      return { month, median: Math.round(indexPercentile(sorted, 0.50)) }
    })

  // Rate positioning summary
  const sufficientBuckets = market.filter(b => !b.insufficient && b.p50 !== null)
  const marketMedian = sufficientBuckets.length > 0
    ? Math.round(sufficientBuckets.reduce((s, b) => s + (b.p50 ?? 0), 0) / sufficientBuckets.length)
    : null

  const ownMedianAll = ownRates.length > 0
    ? Math.round(ownRates.reduce((s, r) => s + r.median, 0) / ownRates.length)
    : null

  const pctDiff = marketMedian && ownMedianAll
    ? Math.round(((ownMedianAll - marketMedian) / marketMedian) * 100)
    : null

  // Percentile position: where does own median sit in all-time sorted market rates?
  const allRates  = filtered.map(r => Number(r.bill_rate)).sort((a, b) => a - b)
  const percentilePos = ownMedianAll && allRates.length >= MIN_RECORDS
    ? Math.round((allRates.filter(r => r <= ownMedianAll).length / allRates.length) * 100)
    : null

  // Trend: % change from first sufficient bucket p50 to last
  const firstP50 = sufficientBuckets[0]?.p50 ?? null
  const lastP50  = sufficientBuckets[sufficientBuckets.length - 1]?.p50 ?? null
  const trendPct = firstP50 && lastP50 && firstP50 > 0
    ? Math.round(((lastP50 - firstP50) / firstP50) * 100)
    : null

  return NextResponse.json({
    market,
    ownRates,
    summary: {
      yourMedian:    ownMedianAll,
      marketMedian,
      pctDiff,
      percentilePos,
      trendPct,
      totalPlacements: filtered.length,
      currency,
    },
  })
}
