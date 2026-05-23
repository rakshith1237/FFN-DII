import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function runInvoiceReminder(): Promise<{
  reminded: number
  errors:   string[]
}> {
  const supabase = db()
  let reminded   = 0
  const errors: string[] = []

  // Approved timesheets older than 7 days with no invoice
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const { data: timesheets, error } = await supabase
    .from('x_ffn_timesheet')
    .select('id, tenant_id, agency_tenant_id, placement_id, period_end')
    .eq('status', 'approved')
    .lt('updated_at', cutoff.toISOString())

  if (error) { errors.push(error.message); return { reminded, errors } }

  for (const ts of timesheets ?? []) {
    // Skip if invoice already exists for this timesheet
    const { data: invoice } = await supabase
      .from('x_ffn_invoice')
      .select('id')
      .eq('timesheet_id', ts.id)
      .maybeSingle()

    if (invoice) continue

    const { error: auditErr } = await supabase
      .from('x_ffn_audit_log')
      .insert({
        tenant_id:    ts.tenant_id,
        actor_id:     null,
        persona_code: 'system',
        action:       'invoice.reminder_fired',
        entity_type:  'x_ffn_timesheet',
        entity_id:    ts.id,
        new_values:   { placement_id: ts.placement_id, period_end: ts.period_end },
        ip_address:   null,
        user_agent:   null,
      })

    if (auditErr) { errors.push(`${ts.id}: ${auditErr.message}`); continue }
    reminded++
    console.log(`[invoiceReminder] fired for timesheet=${ts.id}`)
  }

  console.log(`[invoiceReminder] reminded=${reminded} errors=${errors.length}`)
  return { reminded, errors }
}