import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Building2 } from 'lucide-react'

type TenantRow = {
  id:                    string
  name:                  string
  type:                  string
  status:                string
  primary_domain:        string | null
  country:               string | null
  currency:              string | null
  timezone:              string | null
  primary_contact_email: string | null
  subscription_plan:     string | null
  created_at:            string
  suspended_at:          string | null
  suspension_reason:     string | null
}

type UserRow = {
  id:           string
  full_name:    string | null
  email:        string | null
  persona_code: string
  is_active:    boolean
  created_at:   string
}

type AuditRow = {
  id:           string
  action:       string
  persona_code: string
  created_at:   string
}

function typeChipClass(type: string): string {
  return type === 'partner' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#DCFCE7] text-[#166534]'
}

function statusChipClass(status: string): string {
  return status === 'active'    ? 'bg-[#DCFCE7] text-[#166534]'
       : status === 'suspended' ? 'bg-[#FEE2E2] text-[#991B1B]'
       : 'bg-[#F3F4F6] text-[#374151]'
}

function personaLabel(code: string): string {
  const MAP: Record<string, string> = {
    p_super_admin:       'P-SA',
    p_hiring_manager:    'P-HM',
    p_recruiter:         'P-Rec',
    a_super_admin:       'A-SA',
    a_recruiting_manager:'A-RM',
    a_recruiter:         'A-Rec',
    flex_admin:          'FlexAdmin',
  }
  return MAP[code] ?? code
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
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [
    { data: tenantRaw },
    { data: usersRaw },
    { data: auditLogsRaw },
  ] = await Promise.all([
    supabaseAdmin.from('x_ffn_tenant').select('*').eq('id', tenantId).single(),
    supabaseAdmin.from('x_ffn_user_profile').select('id, full_name, email, persona_code, is_active, created_at').eq('tenant_id', tenantId).order('created_at'),
    supabaseAdmin.from('x_ffn_audit_log').select('id, action, persona_code, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
  ])

  const tenant    = tenantRaw as TenantRow | null
  const users     = (usersRaw  ?? []) as UserRow[]
  const auditLogs = (auditLogsRaw ?? []) as AuditRow[]

  if (!tenant) {
    return (
      <div className="text-center py-16">
        <Building2 size={48} className="text-[#D1D5DB] mx-auto mb-4" />
        <h2 className="text-[18px] font-bold text-[#374151] mb-2">Tenant not found</h2>
        <Link href="/flexadmin/tenants" className="text-sm text-[#3B82F6] hover:underline">
          ← Back to Tenant Management
        </Link>
      </div>
    )
  }

  const detailFields: [string, string][] = [
    ['Admin Email', tenant.primary_contact_email ?? '—'],
    ['Country',     tenant.country               ?? '—'],
    ['Timezone',    tenant.timezone               ?? '—'],
    ['Currency',    tenant.currency               ?? '—'],
    ['Plan',        tenant.subscription_plan      ?? 'Standard'],
    ['Provisioned', new Date(tenant.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
  ]

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px]" aria-label="Breadcrumb">
        <Link href="/flexadmin/tenants" className="text-[#6B7280] hover:text-[#374151] flex items-center gap-1">
          <ArrowLeft size={13} /> Tenant Management
        </Link>
        <span className="text-[#D1D5DB]">/</span>
        <span className="text-[#374151] font-medium">{tenant.name}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F2147]">{tenant.name}</h1>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-semibold ${typeChipClass(tenant.type)}`}>
                {tenant.type === 'partner' ? 'Partner' : 'Agency'}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusChipClass(tenant.status)}`}>
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
              </span>
              {tenant.primary_domain && (
                <span className="text-[13px] text-[#6B7280]">{tenant.primary_domain}</span>
              )}
            </div>
            {tenant.suspension_reason && (
              <p className="mt-2 text-[12px] text-[#6B7280]">
                <strong>Reason:</strong> {tenant.suspension_reason}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {tenant.status === 'active' ? (
              <Link
                href={`/flexadmin/tenants/${tenant.id}/suspend`}
                className="px-4 py-2 text-[13px] font-semibold text-[#DC2626] border border-[#DC2626] rounded-[6px] hover:bg-[#FEE2E2] transition-colors"
              >
                Suspend Tenant
              </Link>
            ) : (
              <Link
                href={`/flexadmin/tenants/${tenant.id}/reactivate`}
                className="px-4 py-2 text-[13px] font-semibold text-[#16A34A] border border-[#16A34A] rounded-[6px] hover:bg-[#DCFCE7] transition-colors"
              >
                Reactivate Tenant
              </Link>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-[#F3F4F6]">
          {detailFields.map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{label}</p>
              <p className="text-[14px] font-medium text-[#374151] mt-1 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#374151]">Users</h2>
          <span className="text-[12px] text-[#9CA3AF]">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </div>
        {users.length === 0 ? (
          <p className="text-center text-[13px] text-[#6B7280] py-8">No users in this tenant yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {['Name', 'Email', 'Persona', 'Status', 'Joined'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[13px] font-medium text-[#374151]">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-[#6B7280]">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                        {personaLabel(u.persona_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${u.is_active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit log table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#374151]">Audit Log</h2>
          <span className="text-[12px] text-[#9CA3AF]">Last {Math.min(auditLogs.length, 50)} events</span>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-center text-[13px] text-[#6B7280] py-8">No audit events recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {['Timestamp', 'Event', 'Actor'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[12px] text-[#9CA3AF] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-[#374151] bg-[#F9FAFB] px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                        {personaLabel(log.persona_code)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
