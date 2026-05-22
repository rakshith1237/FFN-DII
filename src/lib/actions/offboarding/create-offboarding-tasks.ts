'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export type OffboardingTaskTemplate = {
  taskName:        string
  taskDescription: string
  taskType:        string
  isMandatory:     boolean
  dueDaysAfterEnd: number
}

const OFFBOARDING_TEMPLATES: OffboardingTaskTemplate[] = [
  {
    taskName:        'System Access Revocation',
    taskDescription: 'Revoke all system access, VPN, software licences, and user accounts for the concluded contractor.',
    taskType:        'system_access_revocation',
    isMandatory:     true,
    dueDaysAfterEnd: 0,
  },
  {
    taskName:        'Asset Return',
    taskDescription: 'Confirm return of all company equipment including laptop, access cards, and any other issued assets.',
    taskType:        'asset_return',
    isMandatory:     true,
    dueDaysAfterEnd: 3,
  },
  {
    taskName:        'Knowledge Transfer Sign-Off',
    taskDescription: 'Ensure all work documentation, handover notes, and knowledge transfer activities are complete and signed off.',
    taskType:        'knowledge_transfer',
    isMandatory:     false,
    dueDaysAfterEnd: 5,
  },
  {
    taskName:        'Contractor Performance Rating',
    taskDescription: 'Submit a performance rating (1–5) and optional feedback for the contractor. Used for future engagement decisions.',
    taskType:        'exit_interview',
    isMandatory:     false,
    dueDaysAfterEnd: 7,
  },
  {
    taskName:        'Final Invoice Submission',
    taskDescription: 'Agency Recruiting Manager: submit and reconcile the final timesheet and invoice within 10 days of engagement end.',
    taskType:        'compliance',
    isMandatory:     true,
    dueDaysAfterEnd: 10,
  },
]

export async function createOffboardingTasks(params: {
  placementId: string
  tenantId:    string
  endDate:     string | null
}): Promise<{ created: number; error: string | null }> {
  const db = createAdminClient()

  // Idempotency: check which task types already exist
  const { data: existing } = await db
    .from('x_ffn_offboarding_task')
    .select('task_type')
    .eq('placement_id', params.placementId)

  const existingTypes = new Set((existing ?? []).map(t => t.task_type))

  const baseDate = params.endDate ? new Date(params.endDate) : new Date()
  const rows = OFFBOARDING_TEMPLATES
    .filter(t => !existingTypes.has(t.taskType))
    .map(t => {
      const due = new Date(baseDate)
      due.setDate(due.getDate() + t.dueDaysAfterEnd)
      return {
        tenant_id:        params.tenantId,
        placement_id:     params.placementId,
        task_name:        t.taskName,
        task_description: t.taskDescription,
        task_type:        t.taskType,
        status:           'pending',
        due_date:         due.toISOString().split('T')[0],
        sort_order:       OFFBOARDING_TEMPLATES.indexOf(t),
      }
    })

  if (rows.length === 0) return { created: 0, error: null }

  const { error } = await db.from('x_ffn_offboarding_task').insert(rows)
  if (error) return { created: 0, error: error.message }

  return { created: rows.length, error: null }
}
