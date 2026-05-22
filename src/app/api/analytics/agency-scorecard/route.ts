import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdminClient()

  // Broadcasts per agency
  const { data: broadcasts } = await db
    .from('x_ffn_jd_broadcast')
    .select('agency_tenant_id')
    .eq('tenant_id', tenantId)

  // Placements per agency
  const { data: placements } = await db
    .from('x_ffn_placement')
    .select('agency_tenant_id, start_date')
    .eq('tenant_id', tenantId)

  // Submissions per agency
  const { data: submissions } = await db
    .from('x_ffn_submission')
    .select('agency_tenant_id, submitted_at, created_at')
    .eq('partner_tenant_id', tenantId)

  // RTRs per agency
  const { data: rtrs } = await db
    .from('x_ffn_rtr')
    .select('agency_tenant_id, status')
    .eq('tenant_id', tenantId)

  // Agency names
  const { data: agencies } = await db
    .from('x_ffn_tenant')
    .select('id, name')
    .eq('type', 'agency')

  const agencyMap: Record<string, string> = {}
  for (const a of agencies ?? []) agencyMap[a.id] = a.name

  // Aggregate per agency
  const broadcastCount: Record<string, number> = {}
  for (const b of broadcasts ?? []) {
    broadcastCount[b.agency_tenant_id] = (broadcastCount[b.agency_tenant_id] ?? 0) + 1
  }

  const placementCount: Record<string, number> = {}
  for (const p of placements ?? []) {
    placementCount[p.agency_tenant_id] = (placementCount[p.agency_tenant_id] ?? 0) + 1
  }

  const submissionCount: Record<string, number> = {}
  for (const s of submissions ?? []) {
    submissionCount[s.agency_tenant_id] = (submissionCount[s.agency_tenant_id] ?? 0) + 1
  }

  const rtrTotal:  Record<string, number> = {}
  const rtrSigned: Record<string, number> = {}
  for (const r of rtrs ?? []) {
    rtrTotal[r.agency_tenant_id]  = (rtrTotal[r.agency_tenant_id]  ?? 0) + 1
    if (r.status === 'signed') {
      rtrSigned[r.agency_tenant_id] = (rtrSigned[r.agency_tenant_id] ?? 0) + 1
    }
  }

  const allAgencyIds = new Set([
    ...Object.keys(broadcastCount),
    ...Object.keys(placementCount),
  ])

  const result = Array.from(allAgencyIds).map(id => {
    const bc = broadcastCount[id] ?? 0
    const pc = placementCount[id] ?? 0
    const sc = submissionCount[id] ?? 0
    const rt = rtrTotal[id]  ?? 0
    const rs = rtrSigned[id] ?? 0
    return {
      agencyId:          id,
      agencyName:        agencyMap[id] ?? id.slice(0, 8),
      broadcastCount:    bc,
      placementCount:    pc,
      submissionCount:   sc,
      fillRate:          bc > 0 ? Math.round((pc / bc) * 100) : 0,
      rtrApprovalRate:   rt > 0 ? Math.round((rs / rt) * 100) : 0,
      qualityRate:       sc > 0 ? Math.round((pc / sc) * 100) : 0,
    }
  }).sort((a, b) => b.fillRate - a.fillRate)

  return NextResponse.json({ data: result })
}
