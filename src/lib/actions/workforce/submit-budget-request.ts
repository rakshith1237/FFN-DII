'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { fireNotification } from '@/lib/notifications/fire-notification'

export type BudgetRequestInput = {
  role: string
  headcount_count: number
  department: string
  business_unit: string
  justification: string
  required_skills: Record<string, number>
  budget_amount: number | null
  currency: string
  target_start_date: string | null
}

export async function submitBudgetRequest(input: BudgetRequestInput): Promise<{ error: string | null; id: string | null }> {
  const [persona, tenantId, user] = await Promise.all([getPersonaCode(), getTenantId(), getUser()])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', id: null }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) return { error: 'Forbidden', id: null }
  if (input.justification.length < 20) return { error: 'Justification must be at least 20 characters', id: null }

  const db = createAdminClient()
  const { data, error } = await db
    .from('x_ffn_budget_request')
    .insert({
      tenant_id:          tenantId,
      role:               input.role.trim(),
      headcount_count:    input.headcount_count,
      department:         input.department.trim() || null,
      business_unit:      input.business_unit.trim() || null,
      justification:      input.justification.trim(),
      required_skills:    input.required_skills,
      budget_amount:      input.budget_amount,
      currency:           input.currency,
      target_start_date:  input.target_start_date || null,
      status:             'submitted',
      submitted_by:       user.id,
      submitted_at:       new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:   tenantId,
    actor_id:    user.id,
    persona_code: persona,
    action:      'budget_request.submitted',
    entity_type: 'x_ffn_budget_request',
    entity_id:   data.id,
    new_values:  { role: input.role, headcount_count: input.headcount_count, status: 'submitted' },
  })

  await fireNotification('BUDGET_REQUEST_SUBMITTED', tenantId, { role: input.role, headcount: input.headcount_count })

  revalidatePath('/partner/workforce/budget-request')
  return { error: null, id: data.id }
}
