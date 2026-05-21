import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { AuditLogClient } from '@/components/flexadmin/audit-log-client'

export default async function AuditLogPage() {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  const db = createAdminClient()
  const { data: tenants } = await db
    .from('x_ffn_tenant')
    .select('id, name, type')
    .order('name')

  const { data: initialRows } = await db
    .from('x_ffn_audit_log')
    .select('id, tenant_id, persona_code, action, entity_type, entity_id, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-2">Audit Log</h1>
      <p className="text-sm text-[#6B7280] mb-6">Read-only append-only audit trail. No delete capability.</p>
      <AuditLogClient
        tenants={tenants ?? []}
        initialRows={initialRows ?? []}
      />
    </div>
  )
}
