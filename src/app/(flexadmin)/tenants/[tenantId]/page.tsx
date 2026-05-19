import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

type TenantRow = {
  id: string
  name: string
  type: string
  status: string
  primary_domain: string | null
  country: string | null
  currency: string | null
  primary_contact_email: string | null
  subscription_plan: string | null
  timezone: string
  created_at: string
  suspended_at: string | null
  suspension_reason: string | null
}

type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  persona_code: string
  is_active: boolean
  created_at: string
}

type AuditRow = {
  id: string
  action: string
  persona_code: string
  new_values: Record<string, unknown> | null
  created_at: string
}

function typeChip(type: string): string {
  switch (type) {
    case 'partner': return 'bg-[#EFF6FF] text-[#1D4ED8]'
    case 'agency':  return 'bg-[#DCFCE7] text-[#166534]'
    default:        return 'bg-[#F3F4F6] text-[#374151]'
  }
}

function statusChip(status: string): string {
  switch (status) {
    case 'active':      return 'bg-[#DCFCE7] text-[#166534]'
    case 'suspended':   return 'bg-[#FEE2E2] text-[#991B1B]'
    case 'deactivated': return 'bg-[#F3F4F6] text-[#6B7280]'
    default:            return 'bg-[#F3F4F6] text-[#374151]'
  }
}

function personaLabel(code: string): string {
  const map: Record<string, string> = {
    p_super_admin:        'P-SA',
    p_hiring_manager:     'P-HM',
    p_recruiter:          'P-Rec',
    a_super_admin:        'A-SA',
    a_recruiting_manager: 'A-RM',
    a_recruiter:          'A-Rec',
  }
  return map[code] ?? code
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params

  const supabaseAdmin = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  )

  const { data: tenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#6B7280] mb-4">Tenant not found.</p>
        <Link href="/flexadmin/tenants" className="text-sm text-[#3B82F6] hover:underline">
          ← Back to Tenant Management
        </Link>
      </div>
    )
  }

  const t = tenant as TenantRow

  const [{ data: usersData }, { data: auditData }] = await Promise.all([
    supabaseAdmin
      .from('x_ffn_user_profile')
      .select('id, full_name, email, persona_code, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at'),
    supabaseAdmin
      .from('x_ffn_audit_log')
      .select('id, action, persona_code, new_values, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const users = (usersData ?? []) as UserRow[]
  const auditLogs = (auditData ?? []) as AuditRow[]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
        <Link href="/flexadmin/tenants" className="hover:text-[#374151]">
          Tenant Management
        </Link>
        <span>/</span>
        <span className="text-[#374151] font-medium">{t.name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0F2147]">{t.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${typeChip(t.type)}`}>
                {t.type === 'partner' ? 'Partner' : 'Agency'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusChip(t.status)}`}>
                {t.status}
              </span>
              {t.primary_domain && (
                <span className="text-sm text-[#6B7280]">{t.primary_domain}</span>
              )}
            </div>
            {t.suspension_reason && (
              <p className="text-xs text-[#6B7280] mt-1">Reason: {t.suspension_reason}</p>
            )}
          </div>

          <div className="flex gap-3">
            {t.status === 'active' && (
              <Link
                href={`/flexadmin/tenants/${t.id}/suspend`}
                className="px-4 py-2 text-sm font-medium text-[#DC2626] border border-[#DC2626] rounded-md hover:bg-[#FEE2E2] transition-colors"
              >
                Suspend Tenant
              </Link>
            )}
            {t.status === 'suspended' && (
              <Link
                href={`/flexadmin/tenants/${t.id}/reactivate`}
                className="px-4 py-2 text-sm font-medium text-[#16A34A] border border-[#16A34A] rounded-md hover:bg-[#DCFCE7] transition-colors"
              >
                Reactivate Tenant
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          {[
            { label: 'Admin Email', value: t.primary_contact_email ?? '—' },
            { label: 'Country', value: t.country ?? '—' },
            { label: 'Timezone', value: t.timezone },
            { label: 'Currency', value: t.currency ?? '—' },
            { label: 'Plan', value: t.subscription_plan ?? 'Standard' },
            {
              label: 'Provisioned Date',
              value: new Date(t.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
            },
          ].map(field => (
            <div key={field.label}>
              <p className="text-xs text-[#6B7280] uppercase tracking-wide">{field.label}</p>
              <p className="text-sm font-medium text-[#374151] mt-0.5">{field.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Users */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
            <span className="text-sm font-semibold text-[#374151]">Users</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#6B7280]">
              {users.length}
            </span>
          </div>

          {users.length === 0 ? (
            <p className="text-center text-sm text-[#6B7280] py-8">No users in this tenant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  {['Name', 'Email', 'Persona', 'Status', 'Joined'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[#374151] font-medium">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                        {personaLabel(u.persona_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.is_active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
            <span className="text-sm font-semibold text-[#374151]">Recent Audit Events</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#6B7280]">
              {auditLogs.length}
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-center text-sm text-[#6B7280] py-8">No audit events recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  {['Timestamp', 'Event', 'Actor'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[#6B7280] text-xs">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#374151]">{log.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#F3F4F6] text-[#374151]">
                        {log.persona_code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
