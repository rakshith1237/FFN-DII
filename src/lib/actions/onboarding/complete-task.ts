'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }       from 'next/cache'

export async function completeTask(
  taskId: string,
  notes?: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    return { error: 'Forbidden' }
  }

  const db = createAdminClient()
  const { data: task } = await db
    .from('x_ffn_onboarding_task')
    .select('id, task_type, placement_id, tenant_id, status')
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!task) return { error: 'Task not found' }
  if (task.status === 'completed') return { error: 'Task already completed' }

  // For document-required tasks: check a document exists
  if (['work_authorization','background_check'].includes(task.task_type)) {
    const { data: docs } = await db
      .from('x_ffn_onboarding_document')
      .select('id')
      .eq('task_id', taskId)
      .limit(1)
    if (!docs?.length) {
      return { error: `Please upload a supporting document before completing this task` }
    }
  }

  const { error } = await db
    .from('x_ffn_onboarding_task')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'onboarding_task.completed',
    entity_type:  'x_ffn_onboarding_task',
    entity_id:    taskId,
    new_values:   { task_type: task.task_type, notes: notes ?? null },
  })

  revalidatePath(`/partner/placements/${task.placement_id}/onboarding`)
  revalidatePath('/partner/pre-start-readiness')
  return { error: null }
}

export async function waivedTask(
  taskId: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (persona !== 'p_super_admin') return { error: 'Only Super Admins can waive tasks' }

  const db = createAdminClient()
  const { data: task } = await db
    .from('x_ffn_onboarding_task')
    .select('id, placement_id')
    .eq('id', taskId).eq('tenant_id', tenantId).maybeSingle()

  if (!task) return { error: 'Task not found' }

  await db.from('x_ffn_onboarding_task').update({ status: 'waived' }).eq('id', taskId)
  revalidatePath(`/partner/placements/${task.placement_id}/onboarding`)
  revalidatePath('/partner/pre-start-readiness')
  return { error: null }
}
