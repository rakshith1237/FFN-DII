'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }       from 'next/cache'

export async function activatePlacement(
  placementId: string
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_hiring_manager','p_super_admin','a_recruiting_manager','a_super_admin'].includes(persona)) {
    return { error: 'Forbidden' }
  }

  const db = createAdminClient()

  // Check all P1 (blocks_start=true) tasks are complete
  const { data: blockingTasks } = await db
    .from('x_ffn_onboarding_task')
    .select('id, task_name, task_type, status')
    .eq('placement_id', placementId)
    .eq('blocks_start', true)
    .neq('status', 'completed')
    .neq('status', 'waived')
    .neq('status', 'not_applicable')

  if (blockingTasks && blockingTasks.length > 0) {
    const taskNames = blockingTasks.map(t => t.task_name).join(', ')
    return {
      error: `Cannot activate placement. The following tasks must be completed first: ${taskNames}`,
    }
  }

  const { error } = await db
    .from('x_ffn_placement')
    .update({ status: 'active' })
    .eq('id', placementId)

  if (error) return { error: error.message }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'placement.activated',
    entity_type:  'x_ffn_placement',
    entity_id:    placementId,
    new_values:   { status: 'active' },
  })

  revalidatePath('/partner/placements')
  return { error: null }
}
