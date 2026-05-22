import { createClient } from '@supabase/supabase-js'

// Note: this worker runs server-side only — no auth session needed
// It uses the admin client directly and mirrors concludePlacement logic

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const OFFBOARDING_TEMPLATES = [
  { taskName: 'System Access Revocation', taskDescription: 'Revoke all system access, VPN, software licences, and user accounts for the concluded contractor.', taskType: 'system_access_revocation', dueDaysAfterEnd: 0 },
  { taskName: 'Asset Return',             taskDescription: 'Confirm return of all company equipment including laptop, access cards, and any other issued assets.',                              taskType: 'asset_return',             dueDaysAfterEnd: 3 },
  { taskName: 'Knowledge Transfer Sign-Off', taskDescription: 'Ensure all work documentation, handover notes, and knowledge transfer activities are complete and signed off.',               taskType: 'knowledge_transfer',       dueDaysAfterEnd: 5 },
  { taskName: 'Contractor Performance Rating', taskDescription: 'Submit a performance rating (1–5) and optional feedback for the contractor. Used for future engagement decisions.',          taskType: 'exit_interview',           dueDaysAfterEnd: 7 },
  { taskName: 'Final Invoice Submission', taskDescription: 'Agency Recruiting Manager: submit and reconcile the final timesheet and invoice within 10 days of engagement end.',               taskType: 'compliance',               dueDaysAfterEnd: 10 },
] as const

async function createOffboardingTasksInline(supabase: ReturnType<typeof db>, placementId: string, tenantId: string, endDate: string) {
  const { data: existing } = await supabase
    .from('x_ffn_offboarding_task')
    .select('task_type')
    .eq('placement_id', placementId)

  const existingTypes = new Set((existing ?? []).map((t: { task_type: string }) => t.task_type))
  const baseDate = new Date(endDate)

  const rows = OFFBOARDING_TEMPLATES
    .filter(t => !existingTypes.has(t.taskType))
    .map((t, i) => {
      const due = new Date(baseDate)
      due.setDate(due.getDate() + t.dueDaysAfterEnd)
      return {
        tenant_id:        tenantId,
        placement_id:     placementId,
        task_name:        t.taskName,
        task_description: t.taskDescription,
        task_type:        t.taskType,
        status:           'pending',
        due_date:         due.toISOString().split('T')[0],
        sort_order:       i,
      }
    })

  if (rows.length > 0) {
    await supabase.from('x_ffn_offboarding_task').insert(rows)
  }
}

export async function runEngagementEndCheck(): Promise<{
  processed: number
  errors:    string[]
}> {
  const supabase = db()
  let processed  = 0
  const errors:  string[] = []

  const today = new Date().toISOString().split('T')[0]

  // Find active placements where end_date <= today
  const { data: placements, error: fetchError } = await supabase
    .from('x_ffn_placement')
    .select('id, tenant_id, agency_tenant_id, candidate_id, start_date, end_date')
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .lte('end_date', today)

  if (fetchError) {
    errors.push(`fetch error: ${fetchError.message}`)
    return { processed, errors }
  }

  for (const p of placements ?? []) {
    try {
      const concludedAt = new Date().toISOString()
      const effectiveDate = p.end_date!

      // UPDATE placement status
      const { error: updateErr } = await supabase
        .from('x_ffn_placement')
        .update({
          status:          'concluded',
          concluded_at:    concludedAt,
          conclusion_type: 'natural_end',
          ended_at:        concludedAt,
        })
        .eq('id', p.id)

      if (updateErr) { errors.push(`${p.id}: ${updateErr.message}`); continue }

      // Create offboarding tasks
      await createOffboardingTasksInline(supabase, p.id, p.tenant_id, effectiveDate)

      // Reset candidate availability
      await supabase
        .from('x_ffn_candidate')
        .update({ availability_status: 'available' })
        .eq('id', p.candidate_id)

      // Compute + upsert tenure summary
      const { data: allPlacements } = await supabase
        .from('x_ffn_placement')
        .select('start_date, end_date, concluded_at, status')
        .eq('candidate_id', p.candidate_id)
        .eq('tenant_id', p.tenant_id)
        .not('status', 'eq', 'cancelled')

      const now = new Date()
      let totalDays = 0
      for (const pl of allPlacements ?? []) {
        const start = new Date(pl.start_date)
        const end   = pl.concluded_at
          ? new Date(pl.concluded_at)
          : pl.end_date ? new Date(pl.end_date) : now
        totalDays += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000))
      }

      await supabase.from('x_ffn_tenure_summary').upsert({
        candidate_id:      p.candidate_id,
        tenant_id:         p.tenant_id,
        agency_tenant_id:  p.agency_tenant_id,
        total_days_active: totalDays,
        total_placements:  (allPlacements ?? []).length,
        is_near_threshold: totalDays >= Math.floor(730 * 0.9),
        is_at_threshold:   totalDays >= 730,
        threshold_days:    730,
        last_computed_at:  new Date().toISOString(),
      }, { onConflict: 'candidate_id,tenant_id' })

      // Build conclusion summary
      const [{ data: timesheets }, { data: invoices }] = await Promise.all([
        supabase.from('x_ffn_timesheet').select('hours_regular, hours_overtime').eq('placement_id', p.id).eq('status', 'approved'),
        supabase.from('x_ffn_invoice').select('total_amount, status').eq('placement_id', p.id),
      ])

      const totalDaysActive  = Math.ceil((new Date(effectiveDate).getTime() - new Date(p.start_date).getTime()) / 86400000)
      const totalHours       = (timesheets ?? []).reduce((s, t) => s + Number(t.hours_regular ?? 0) + Number(t.hours_overtime ?? 0), 0)
      const totalInvoiced    = (invoices ?? []).filter(i => ['sent','paid','approved'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount), 0)
      const totalPaid        = (invoices ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)

      await supabase.from('x_ffn_conclusion_summary').upsert({
        tenant_id:        p.tenant_id,
        placement_id:     p.id,
        candidate_id:     p.candidate_id,
        agency_tenant_id: p.agency_tenant_id,
        conclusion_date:  effectiveDate,
        conclusion_type:  'natural_end',
        total_days_active: totalDaysActive,
        total_hours_worked: totalHours,
        total_invoiced:   totalInvoiced,
        total_paid:       totalPaid,
        pending_amount:   Math.max(0, totalInvoiced - totalPaid),
        tenure_total_days: totalDays,
        re_bench_triggered: true,
        re_bench_triggered_at: concludedAt,
        concluded_at:     concludedAt,
      }, { onConflict: 'placement_id' })

      processed++
      console.log(`[engagementEndCheck] concluded placement=${p.id}`)
    } catch (err) {
      errors.push(`${p.id}: ${String(err)}`)
    }
  }

  console.log(`[engagementEndCheck] processed=${processed} errors=${errors.length}`)
  return { processed, errors }
}
