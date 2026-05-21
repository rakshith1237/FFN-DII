'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'

export async function exportAuditLogCsv(filters: {
  tenantId?:  string
  startDate?: string
  endDate?:   string
  actionType?: string
}): Promise<{ csv: string | null; error: string | null }> {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') return { csv: null, error: 'Forbidden' }

  const db = createAdminClient()
  let query = db
    .from('x_ffn_audit_log')
    .select('id, tenant_id, actor_id, persona_code, action, entity_type, entity_id, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (filters.tenantId)  query = query.eq('tenant_id', filters.tenantId)
  if (filters.startDate) query = query.gte('created_at', filters.startDate)
  if (filters.endDate)   query = query.lte('created_at', filters.endDate)
  if (filters.actionType) query = query.ilike('action', `%${filters.actionType}%`)

  const { data, error } = await query
  if (error) return { csv: null, error: error.message }

  const headers = ['id','tenant_id','actor_id','persona_code','action','entity_type','entity_id','ip_address','created_at']
  const rows = (data ?? []).map(row =>
    headers.map(h => {
      const val = String(row[h as keyof typeof row] ?? '')
      return val.includes(',') ? `"${val}"` : val
    }).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  return { csv, error: null }
}
