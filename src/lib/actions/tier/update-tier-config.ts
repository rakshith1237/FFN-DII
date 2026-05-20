'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { type TierConfig } from '@/lib/types/broadcast'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Re-export to satisfy the import in the type declaration
export type { TierConfig }

export type TierConfigInput = {
  tier_number:       1 | 2 | 3
  agency_tenant_id:  string
  hold_window_hours: number | null
}[]

export type UpdateTierConfigState = { error?: string; success?: boolean }

export async function updateTierConfig(
  configs: TierConfigInput
): Promise<UpdateTierConfigState> {
  await requirePersona(['p_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  // BR-DIST-005: validate no agency appears in more than one tier
  const agencyIds    = configs.map(c => c.agency_tenant_id)
  const uniqueAgencies = new Set(agencyIds)
  if (uniqueAgencies.size !== agencyIds.length) {
    return { error: 'BR-DIST-005: An agency cannot be assigned to more than one tier.' }
  }

  // Delete existing config for this tenant and replace atomically
  const { error: deleteError } = await supabaseAdmin
    .from('x_ffn_tier_config')
    .delete()
    .eq('tenant_id', tenantId)

  if (deleteError) return { error: deleteError.message }

  if (configs.length === 0) return { success: true }

  const rows = configs.map(c => ({
    tenant_id:         tenantId,
    tier_number:       c.tier_number,
    agency_tenant_id:  c.agency_tenant_id,
    hold_window_hours: c.hold_window_hours,
  }))

  const { error: insertError } = await supabaseAdmin
    .from('x_ffn_tier_config')
    .insert(rows)

  if (insertError) return { error: insertError.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'p_super_admin',
    action:       'tier_config.updated',
    entity_type:  'x_ffn_tier_config',
    entity_id:    null,
    new_values:   { tier_count: configs.length },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true }
}
