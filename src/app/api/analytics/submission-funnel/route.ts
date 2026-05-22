import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const [
    { count: published },
    { count: submitted },
    { count: shortlisted },
    { count: interviewed },
    { count: offerMade },
    { count: placed },
  ] = await Promise.all([
    db.from('x_ffn_jd').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['active','broadcast','filled','closed']),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).eq('partner_tenant_id', tenantId),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).eq('partner_tenant_id', tenantId).in('status', ['shortlisted','interview_scheduled','offer_made','filled']),
    db.from('x_ffn_interview').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('x_ffn_submission').select('*', { count: 'exact', head: true }).eq('partner_tenant_id', tenantId).in('status', ['offer_made','filled']),
    db.from('x_ffn_placement').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  const stages = [
    { stage: 'JDs Published',        count: published  ?? 0 },
    { stage: 'Submissions Received', count: submitted  ?? 0 },
    { stage: 'Shortlisted',          count: shortlisted ?? 0 },
    { stage: 'Interviews',           count: interviewed ?? 0 },
    { stage: 'Offers Made',          count: offerMade  ?? 0 },
    { stage: 'Placements',           count: placed     ?? 0 },
  ]

  // Add drop-off percentage vs previous stage
  const result = stages.map((s, i) => {
    const prev = stages[i - 1]
    return {
      ...s,
      dropoffPct: i === 0 || !prev ? 0
        : prev.count > 0
          ? Math.round((1 - s.count / prev.count) * 100)
          : 0,
    }
  })

  return NextResponse.json({ data: result })
}
