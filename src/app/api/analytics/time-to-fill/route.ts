import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  // Join placements with JDs to get days-to-fill per employment type
  const { data: placements } = await db
    .from('x_ffn_placement')
    .select('start_date, x_ffn_jd!inner(employment_type, published_at)')
    .eq('tenant_id', tenantId)
    .not('x_ffn_jd.published_at', 'is', null)

  type PlacementRow = {
    start_date: string
    x_ffn_jd: { employment_type: string; published_at: string }
  }

  const byType: Record<string, number[]> = {}
  for (const p of (placements ?? []) as unknown as PlacementRow[]) {
    const days = Math.round(
      (new Date(p.start_date).getTime() - new Date(p.x_ffn_jd.published_at).getTime())
      / (1000 * 60 * 60 * 24)
    )
    if (days < 0 || days > 365) continue
    const type = p.x_ffn_jd.employment_type
    if (!byType[type]) byType[type] = []
    byType[type].push(days)
  }

  function percentile(arr: number[], p: number): number {
    if (!arr.length) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, idx)] ?? 0
  }

  const result = Object.entries(byType).map(([type, days]) => ({
    employmentType: type,
    count:          days.length,
    p50Days:        percentile(days, 50),
    p90Days:        percentile(days, 90),
    avgDays:        Math.round(days.reduce((s, d) => s + d, 0) / days.length),
  }))

  return NextResponse.json({ data: result })
}
