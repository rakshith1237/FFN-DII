import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdminClient()

  // Required: sum skills from approved headcount
  const { data: headcounts } = await db
    .from('x_ffn_approved_headcount')
    .select('required_skills, headcount_count')
    .eq('tenant_id', tenantId)

  const required: Record<string, number> = {}
  for (const hc of headcounts ?? []) {
    if (!hc.required_skills) continue
    for (const [skill, weight] of Object.entries(hc.required_skills as Record<string, number>)) {
      required[skill] = (required[skill] ?? 0) + hc.headcount_count * (weight || 1)
    }
  }

  // Available: count on-bench candidates with each skill
  const { data: benchSkills } = await db
    .from('x_ffn_candidate_skill')
    .select('skill_id, x_ffn_skill_taxonomy!inner(name), x_ffn_candidate!inner(bench_status, tenant_id)')
    .eq('x_ffn_candidate.tenant_id', tenantId)
    .eq('x_ffn_candidate.bench_status', 'on_bench')

  const available: Record<string, number> = {}
  for (const row of benchSkills ?? []) {
    const skillName = (row.x_ffn_skill_taxonomy as unknown as { name: string }).name
    available[skillName] = (available[skillName] ?? 0) + 1
  }

  // Merge into gap chart data
  const allSkills = new Set([...Object.keys(required), ...Object.keys(available)])
  const result = Array.from(allSkills).map(skill => ({
    skill,
    required:  required[skill]  ?? 0,
    available: available[skill] ?? 0,
    gap:       Math.max(0, (required[skill] ?? 0) - (available[skill] ?? 0)),
  })).sort((a, b) => b.gap - a.gap)

  return NextResponse.json({ data: result })
}
