import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
function resend() { return new Resend(process.env.RESEND_API_KEY!) }

const THRESHOLDS_DAYS = [90, 60, 30, 14] as const

type ThresholdDay = (typeof THRESHOLDS_DAYS)[number]

const SEVERITY_MAP: Record<ThresholdDay, string> = {
  90: 'low',
  60: 'medium',
  30: 'high',
  14: 'critical',
}

export async function runContractEndAlert(): Promise<{ fired: number; skipped: number }> {
  const supabase = db()
  let fired = 0
  let skipped = 0

  for (const days of THRESHOLDS_DAYS) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const dateStr = targetDate.toISOString().split('T')[0]

    const { data: placements } = await supabase
      .from('x_ffn_placement')
      .select('id, tenant_id, candidate_id, jd_id, end_date, status')
      .eq('end_date', dateStr)
      .eq('status', 'active')

    if (!placements?.length) continue

    for (const placement of placements) {
      // Check for existing alert at this threshold to prevent re-firing
      const alertKey = `contract_expiry_${days}d`
      const { data: existing } = await supabase
        .from('x_ffn_engagement_alert')
        .select('id')
        .eq('tenant_id', placement.tenant_id)
        .eq('placement_id', placement.id)
        .eq('alert_type', 'contract_expiry')
        .ilike('title', `%${days} day%`)
        .maybeSingle()

      if (existing) { skipped++; continue }

      await supabase.from('x_ffn_engagement_alert').insert({
        tenant_id:    placement.tenant_id,
        placement_id: placement.id,
        candidate_id: placement.candidate_id,
        jd_id:        placement.jd_id,
        alert_type:   'contract_expiry',
        severity:     SEVERITY_MAP[days],
        title:        `Contract ending in ${days} days`,
        body:         `Placement contract is due to end in ${days} days (${dateStr}). Review extension or offboarding options.`,
        is_read:      false,
        is_actioned:  false,
        expires_at:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      fired++
    }
  }

  console.log(`[contractEndAlert] fired=${fired} skipped=${skipped}`)
  return { fired, skipped }
}
