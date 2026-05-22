import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: placements } = await db
    .from('x_ffn_placement')
    .select('start_date')
    .eq('tenant_id', tenantId)
    .gte('start_date', twelveMonthsAgo.toISOString().split('T')[0])
    .order('start_date', { ascending: true })

  const { data: jds } = await db
    .from('x_ffn_jd')
    .select('published_at')
    .eq('tenant_id', tenantId)
    .gte('published_at', twelveMonthsAgo.toISOString())
    .not('published_at', 'is', null)

  // Build 12 monthly buckets
  const months: { month: string; placements: number; published: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ month: key, placements: 0, published: 0 })
  }

  for (const p of placements ?? []) {
    const key = p.start_date.substring(0, 7)
    const bucket = months.find(m => m.month === key)
    if (bucket) bucket.placements++
  }
  for (const j of jds ?? []) {
    const key = j.published_at.substring(0, 7)
    const bucket = months.find(m => m.month === key)
    if (bucket) bucket.published++
  }

  return NextResponse.json({ data: months })
}
