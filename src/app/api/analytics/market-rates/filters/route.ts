import { NextRequest, NextResponse }   from 'next/server'
import { createAdminClient }           from '@/lib/supabase/admin'
import { getPersonaCode }              from '@/lib/auth/session'

export async function GET(_req: NextRequest) {
  const persona = await getPersonaCode()
  if (!persona) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  // Distinct employment types from JDs (proxy for ServiceNow modules)
  const { data: jdTypes } = await db
    .from('x_ffn_jd')
    .select('employment_type')
    .not('employment_type', 'is', null)

  // Distinct modules from market rate seed data
  const { data: marketModules } = await db
    .from('x_ffn_market_rate')
    .select('primary_module, work_type')
    .not('primary_module', 'is', null)

  const moduleSet = new Set<string>()
  for (const j of jdTypes ?? [])       if (j.employment_type) moduleSet.add(j.employment_type)
  for (const m of marketModules ?? []) if (m.primary_module)  moduleSet.add(m.primary_module)

  const workTypeSet = new Set<string>()
  for (const m of marketModules ?? []) if (m.work_type) workTypeSet.add(m.work_type)

  return NextResponse.json({
    modules:   Array.from(moduleSet).sort(),
    workTypes: ['all', ...Array.from(workTypeSet).sort()],
  })
}
