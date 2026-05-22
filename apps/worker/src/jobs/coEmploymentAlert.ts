import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const THRESHOLDS = [365, 548, 730] // days

export async function runCoEmploymentAlert(): Promise<{
  checked: number
  alertsFired: number
  errors: string[]
}> {
  const supabase = db()
  let checked = 0
  let alertsFired = 0
  const errors: string[] = []

  // Get all active placements
  const { data: placements, error: pErr } = await supabase
    .from('x_ffn_placement')
    .select('id, tenant_id, candidate_id, start_date, end_date, agency_tenant_id')
    .eq('status', 'active')

  if (pErr) { errors.push(pErr.message); return { checked, alertsFired, errors } }

  // Group by candidate_id + tenant_id (partner) to detect multi-engagement
  const grouped: Record<string, typeof placements> = {}
  for (const p of placements ?? []) {
    const key = `${p.candidate_id}::${p.tenant_id}`
    const arr = grouped[key] ?? []
    grouped[key] = arr
    arr.push(p)
  }

  for (const [key, group] of Object.entries(grouped)) {
    checked++
    if (!group) continue

    // Sum total days across all active placements for this candidate+partner
    const today = new Date()
    let totalDays = 0
    for (const p of group) {
      const start = new Date(p.start_date)
      const end   = p.end_date ? new Date(p.end_date) : today
      const days  = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000))
      totalDays += days
    }

    // Fetch candidate name for notification
    const firstPlacement = group[0]
    if (!firstPlacement) continue

    const { data: candidate } = await supabase
      .from('x_ffn_candidate')
      .select('first_name, last_name')
      .eq('id', firstPlacement.candidate_id)
      .maybeSingle()

    const candidateName = candidate
      ? `${candidate.first_name} ${candidate.last_name}`
      : 'Unknown Candidate'

    // Check each threshold
    for (const threshold of THRESHOLDS) {
      if (totalDays < threshold) continue

      const alertTitle = `Co-employment risk: ${threshold} day threshold reached`

      // Check for existing alert (dedup)
      const { data: existing } = await supabase
        .from('x_ffn_engagement_alert')
        .select('id')
        .eq('placement_id', firstPlacement.id)
        .eq('alert_type', 'co_employment')
        .ilike('title', `%${threshold} day%`)
        .maybeSingle()

      if (existing) continue // Already alerted

      try {
        const { error: alertError } = await supabase
          .from('x_ffn_engagement_alert')
          .insert({
            tenant_id:    firstPlacement.tenant_id,
            placement_id: firstPlacement.id,
            candidate_id: firstPlacement.candidate_id,
            alert_type:   'co_employment',
            severity:     threshold >= 730 ? 'high' : threshold >= 548 ? 'medium' : 'low',
            title:        alertTitle,
            body:         `${candidateName} has accumulated ${totalDays} days (${threshold} day threshold). Review for co-employment risk under HMRC IR35 and agency worker regulations.`,
            is_read:      false,
            is_actioned:  false,
            expires_at:   null,
          })

        if (alertError) {
          errors.push(`${key}: ${alertError.message}`)
          continue
        }

        alertsFired++
        console.log(`[coEmployment] alert fired: ${candidateName} ${totalDays}d threshold=${threshold}`)
      } catch (err) {
        errors.push(`${key}: ${String(err)}`)
      }
    }
  }

  console.log(`[coEmployment] checked=${checked} alertsFired=${alertsFired} errors=${errors.length}`)
  return { checked, alertsFired, errors }
}
