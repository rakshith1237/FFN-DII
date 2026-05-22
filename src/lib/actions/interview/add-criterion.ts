'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }    from 'next/cache'

export async function addInterviewCriterion(input: {
  jdId:          string
  criterionText: string
  weight:        number
  sortOrder:     number
}): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) return { error: 'Forbidden' }
  if (input.criterionText.trim().length < 5) return { error: 'Criterion must be at least 5 characters' }

  const db = createAdminClient()
  const { error } = await db.from('x_ffn_jd_interview_criterion').insert({
    tenant_id:      tenantId,
    jd_id:          input.jdId,
    criterion_text: input.criterionText.trim(),
    weight:         input.weight,
    sort_order:     input.sortOrder,
  })
  if (error) return { error: error.message }
  revalidatePath(`/partner/jd/${input.jdId}/decision-vault`)
  return { error: null }
}
