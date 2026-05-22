'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export type OnboardingTaskTemplate = {
  taskName:        string
  taskDescription: string
  taskType:        string
  blocksStart:     boolean
  dueOffsetDays:   number  // days before start_date
}

// Platform-wide onboarding task templates
const STANDARD_TASKS: OnboardingTaskTemplate[] = [
  {
    taskName:        'Background Check',
    taskDescription: 'Obtain a satisfactory background check (DBS or equivalent) from the approved provider before the start date.',
    taskType:        'background_check',
    blocksStart:     true,
    dueOffsetDays:   14,
  },
  {
    taskName:        'Right to Work Verification',
    taskDescription: 'Verify the candidate has the right to work in the UK. Upload a copy of Passport, Visa, or Share Code. Mark as verified once confirmed.',
    taskType:        'work_authorization',
    blocksStart:     true,
    dueOffsetDays:   14,
  },
  {
    taskName:        'Equipment Provision',
    taskDescription: 'Arrange and confirm delivery of required equipment (laptop, access card, etc.) before the start date.',
    taskType:        'equipment',
    blocksStart:     false,
    dueOffsetDays:   7,
  },
  {
    taskName:        'System Access Setup',
    taskDescription: 'Create system accounts, VPN access, and necessary software licences for the new contractor.',
    taskType:        'system_access',
    blocksStart:     false,
    dueOffsetDays:   3,
  },
  {
    taskName:        'Induction Scheduled',
    taskDescription: 'Book and confirm the induction session with the hiring manager and relevant team members.',
    taskType:        'induction',
    blocksStart:     false,
    dueOffsetDays:   0,
  },
]

const UK_TASKS: OnboardingTaskTemplate[] = [
  {
    taskName:        'IR35 Status Determination (SDS)',
    taskDescription: 'Complete the HMRC IR35 SDS questionnaire before activating this placement. Navigate to the IR35 tab to complete.',
    taskType:        'ir35',
    blocksStart:     true,
    dueOffsetDays:   14,
  },
]

export async function createOnboardingTasks(params: {
  placementId:     string
  tenantId:        string
  startDate:       string | null
  workAuthorization: string | null
  locationCountry: string | null
}): Promise<{ created: number; error: string | null }> {
  const db = createAdminClient()

  // Determine if UK candidate
  const isUk =
    params.locationCountry === 'GB' ||
    !params.workAuthorization ||
    (params.workAuthorization?.toLowerCase().includes('uk') ?? false)

  const templates = isUk
    ? [...STANDARD_TASKS, ...UK_TASKS]
    : STANDARD_TASKS

  // Idempotency: check which task types already exist
  const { data: existing } = await db
    .from('x_ffn_onboarding_task')
    .select('task_type')
    .eq('placement_id', params.placementId)

  const existingTypes = new Set((existing ?? []).map(t => t.task_type))

  const startDate = params.startDate ? new Date(params.startDate) : new Date()
  const rows = templates
    .filter(t => !existingTypes.has(t.taskType))
    .map(t => {
      const due = new Date(startDate)
      due.setDate(due.getDate() - t.dueOffsetDays)
      return {
        tenant_id:        params.tenantId,
        placement_id:     params.placementId,
        task_name:        t.taskName,
        task_description: t.taskDescription,
        task_type:        t.taskType,
        status:           'pending',
        blocks_start:     t.blocksStart,
        due_date:         due.toISOString().split('T')[0],
      }
    })

  if (rows.length === 0) return { created: 0, error: null }

  const { error } = await db.from('x_ffn_onboarding_task').insert(rows)
  if (error) return { created: 0, error: error.message }

  return { created: rows.length, error: null }
}
