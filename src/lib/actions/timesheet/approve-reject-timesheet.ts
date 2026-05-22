'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { generateInvoice }      from './generate-invoice'
import { revalidatePath }       from 'next/cache'

export async function approveTimesheet(
  timesheetId: string
): Promise<{ error: string | null; invoiceId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', invoiceId: null }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) {
    return { error: 'Only Hiring Managers can approve timesheets', invoiceId: null }
  }

  const db = createAdminClient()
  const { data: ts } = await db
    .from('x_ffn_timesheet')
    .select('id, status, placement_id, hours_regular, hours_overtime, period_start, period_end, tenant_id')
    .eq('id', timesheetId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!ts) return { error: 'Timesheet not found', invoiceId: null }
  if (ts.status !== 'submitted') return { error: 'Only submitted timesheets can be approved', invoiceId: null }

  await db.from('x_ffn_timesheet').update({
    status:      'approved',
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  }).eq('id', timesheetId)

  // Generate invoice
  const { invoiceId, error: invError } = await generateInvoice({
    timesheetId,
    placementId:   ts.placement_id,
    tenantId,
    periodStart:   ts.period_start,
    periodEnd:     ts.period_end,
    hoursRegular:  ts.hours_regular,
    hoursOvertime: ts.hours_overtime ?? 0,
  })

  if (invError) console.error('[approveTimesheet] invoice error:', invError)

  await fireNotification('TIMESHEET_APPROVED', tenantId, { weekStart: ts.period_start })
  revalidatePath('/partner/invoices')
  revalidatePath('/agency/timesheets')
  return { error: null, invoiceId: invoiceId ?? null }
}

export async function rejectTimesheet(
  timesheetId: string,
  reason: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) return { error: 'Forbidden' }

  const db = createAdminClient()
  const { data: ts } = await db
    .from('x_ffn_timesheet')
    .select('id, status, period_start, tenant_id')
    .eq('id', timesheetId).eq('tenant_id', tenantId).maybeSingle()

  if (!ts) return { error: 'Timesheet not found' }
  if (ts.status !== 'submitted') return { error: 'Only submitted timesheets can be rejected' }

  await db.from('x_ffn_timesheet').update({ status: 'rejected', notes: reason }).eq('id', timesheetId)
  await fireNotification('TIMESHEET_REJECTED', tenantId, { weekStart: ts.period_start, reason })
  revalidatePath('/agency/timesheets')
  return { error: null }
}
