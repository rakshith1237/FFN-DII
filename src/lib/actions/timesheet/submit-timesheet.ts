'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { revalidatePath }       from 'next/cache'

export type TimesheetInput = {
  placementId:  string
  weekStart:    string   // ISO date string YYYY-MM-DD (Monday)
  hoursMon:     number
  hoursTue:     number
  hoursWed:     number
  hoursThu:     number
  hoursFri:     number
  hoursOvertime: number
  description:  string | null
}

export async function submitTimesheet(
  input: TimesheetInput
): Promise<{ error: string | null; timesheetId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', timesheetId: null }
  if (!['a_recruiter','a_recruiting_manager','a_super_admin'].includes(persona)) {
    return { error: 'Only agency staff can submit timesheets', timesheetId: null }
  }

  // Validate hours
  const dailyHours = [input.hoursMon, input.hoursTue, input.hoursWed, input.hoursThu, input.hoursFri]
  for (const h of dailyHours) {
    if (h < 0 || h > 24) return { error: 'Daily hours must be between 0 and 24', timesheetId: null }
  }
  const hoursRegular = dailyHours.reduce((s, h) => s + h, 0)
  const hoursTotal   = hoursRegular + (input.hoursOvertime ?? 0)
  if (hoursTotal <= 0) return { error: 'Total hours must be greater than 0', timesheetId: null }

  const db = createAdminClient()

  // Verify placement is active and belongs to agency tenant
  const { data: placement } = await db
    .from('x_ffn_placement')
    .select('id, status, tenant_id, agency_tenant_id, bill_rate, currency')
    .eq('id', input.placementId)
    .eq('agency_tenant_id', tenantId)
    .maybeSingle()

  if (!placement) return { error: 'Placement not found', timesheetId: null }
  if (placement.status !== 'active') {
    return { error: `Timesheets can only be submitted for active placements (current: ${placement.status})`, timesheetId: null }
  }

  // Check for duplicate timesheet for same week
  const weekEnd = new Date(input.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { data: existing } = await db
    .from('x_ffn_timesheet')
    .select('id, status')
    .eq('placement_id', input.placementId)
    .eq('period_start', input.weekStart)
    .maybeSingle()

  if (existing) {
    if (['submitted','approved'].includes(existing.status)) {
      return { error: 'A timesheet for this week has already been submitted', timesheetId: null }
    }
    // Re-submit rejected timesheet
    await db.from('x_ffn_timesheet').update({
      hours_mon:      input.hoursMon,
      hours_tue:      input.hoursTue,
      hours_wed:      input.hoursWed,
      hours_thu:      input.hoursThu,
      hours_fri:      input.hoursFri,
      hours_regular:  hoursRegular,
      hours_overtime: input.hoursOvertime ?? 0,
      notes:          input.description,
      status:         'submitted',
      submitted_at:   new Date().toISOString(),
    }).eq('id', existing.id)

    await fireNotification('TIMESHEET_SUBMITTED', placement.tenant_id, {
      weekStart: input.weekStart, totalHours: String(hoursTotal),
    })
    revalidatePath('/agency/timesheets')
    return { error: null, timesheetId: existing.id }
  }

  const { data: ts, error } = await db
    .from('x_ffn_timesheet')
    .insert({
      tenant_id:      placement.tenant_id,
      placement_id:   input.placementId,
      period_start:   input.weekStart,
      period_end:     weekEnd.toISOString().split('T')[0],
      hours_mon:      input.hoursMon,
      hours_tue:      input.hoursTue,
      hours_wed:      input.hoursWed,
      hours_thu:      input.hoursThu,
      hours_fri:      input.hoursFri,
      hours_regular:  hoursRegular,
      hours_overtime: input.hoursOvertime ?? 0,
      notes:          input.description,
      status:         'submitted',
      submitted_at:   new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message, timesheetId: null }

  await fireNotification('TIMESHEET_SUBMITTED', placement.tenant_id, {
    weekStart: input.weekStart, totalHours: String(hoursTotal),
  })

  revalidatePath('/agency/timesheets')
  return { error: null, timesheetId: ts.id }
}
