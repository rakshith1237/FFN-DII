'use server'
import { createAdminClient }                    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }                        from 'next/cache'

export async function actionAlert(
  alertId:    string,
  actionType: 'extension' | 'replacement_jd' | 'none'
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_super_admin', 'p_hiring_manager'].includes(persona)) {
    return { error: 'Only Partner Super Admin or Hiring Manager can action alerts' }
  }

  const db = createAdminClient()

  const { data: alert } = await db
    .from('x_ffn_engagement_alert')
    .select('id, actioned, tenant_id')
    .eq('id', alertId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!alert)          return { error: 'Alert not found' }
  if (alert.actioned)  return { error: 'Alert has already been actioned' }

  const { error } = await db
    .from('x_ffn_engagement_alert')
    .update({
      actioned:     true,
      action_type:  actionType,
      actioned_at:  new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) return { error: error.message }

  revalidatePath('/partner/alerts')
  revalidatePath('/partner/engagement')
  return { error: null }
}