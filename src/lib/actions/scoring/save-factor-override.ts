'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { validateGroupWeights, type Factor } from '@/lib/ai/factors'
import { revalidatePath } from 'next/cache'

export async function saveFactorOverride(
  factors: Factor[]
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([getPersonaCode(), getTenantId(), getUser()])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized' }
  if (!['a_recruiting_manager','a_super_admin'].includes(persona)) return { error: 'Forbidden' }

  const tfValid = validateGroupWeights(factors, 'technical_fit')
  const afValid = validateGroupWeights(factors, 'auxiliary_fit')
  if (!tfValid) return { error: 'Technical Fit factor weights must sum to 100' }
  if (!afValid) return { error: 'Auxiliary Fit factor weights must sum to 100' }

  const db = createAdminClient()
  const rows = factors.map(f => ({
    tenant_id:    tenantId,
    factor_code:  f.code,
    factor_group: f.group,
    weight:       f.weight,
    is_enabled:   f.enabled,
  }))

  const { error } = await db
    .from('x_ffn_agency_factor_override')
    .upsert(rows, { onConflict: 'tenant_id,factor_code' })

  if (error) return { error: error.message }

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'factor_override.saved',
    entity_type:  'x_ffn_agency_factor_override',
    entity_id:    null,
    new_values:   { factor_count: rows.length },
  })

  revalidatePath('/agency/scoring-override')
  return { error: null }
}
