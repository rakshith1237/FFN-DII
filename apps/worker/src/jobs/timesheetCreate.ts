import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function runTimesheetCreate(): Promise<{
  created: number
  skipped: number
  errors:  string[]
}> {
  const supabase = db()
  let created = 0
  let skipped = 0
  const errors: string[] = []

  const { data: placements, error: pErr } = await supabase
    .from('x_ffn_placement')
    .select('id, tenant_id, agency_tenant_id')
    .eq('status', 'active')

  if (pErr) { errors.push(pErr.message); return { created, skipped, errors } }

  // Compute current week Monday–Sunday
  const now        = new Date()
  const dow        = now.getDay()
  const monday     = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const periodStart = monday.toISOString().split('T')[0]!
  const periodEnd   = sunday.toISOString().split('T')[0]!

  for (const placement of placements ?? []) {
    const { data: existing } = await supabase
      .from('x_ffn_timesheet')
      .select('id')
      .eq('placement_id', placement.id)
      .eq('period_start', periodStart)
      .maybeSingle()

    if (existing) { skipped++; continue }

    const { error: insErr } = await supabase
      .from('x_ffn_timesheet')
      .insert({
        tenant_id:        placement.tenant_id,
        agency_tenant_id: placement.agency_tenant_id,
        placement_id:     placement.id,
        period_start:     periodStart,
        period_end:       periodEnd,
        status:           'draft',
        hours_regular:    0,
        hours_overtime:   0,
      })

    if (insErr) { errors.push(`${placement.id}: ${insErr.message}`); continue }
    created++
    console.log(`[timesheetCreate] created for placement=${placement.id} period=${periodStart}`)
  }

  console.log(`[timesheetCreate] created=${created} skipped=${skipped} errors=${errors.length}`)
  return { created, skipped, errors }
}