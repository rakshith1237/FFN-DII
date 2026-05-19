import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

type Tenant = {
  id: string
  name: string
  type: string
  status: 'active' | 'suspended' | 'deactivated'
  primary_domain: string | null
  country: string | null
  primary_contact_email: string | null
  created_at: string
  subscription_plan: string | null
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

function shortRef(id: string, type: string): string {
  const prefix = type === 'partner' ? 'FFN-PT' : 'FFN-AG'
  return `${prefix}-${id.slice(-3).toUpperCase()}`
}

export default async function TenantsPage() {
  const supabaseAdmin = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  )

  const { data: tenants } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id, name, type, status, primary_domain, country, primary_contact_email, created_at, subscription_plan')
    .order('created_at', { ascending: false })

  const rows = (tenants ?? []) as Tenant[]
  const activeCount = rows.filter(t => t.status === 'active').length
  const suspendedCount = rows.filter(t => t.status === 'suspended').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0F2147]">Tenant Management</h1>
        <Link
          href="/flexadmin/tenants/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2147] text-white text-sm font-medium rounded-md hover:bg-[#1a3366] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-colors"
        >
          + Create New Tenant
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tenants', value: rows.length },
          { label: 'Active', value: activeCount },
          { label: 'Suspended', value: suspendedCount },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-[#0F2147] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#374151]">All Tenants</span>
          <span className="text-xs text-[#6B7280]">{rows.length} organisations</span>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#6B7280] mb-4">No tenants provisioned yet.</p>
            <Link
              href="/flexadmin/tenants/create"
              className="text-sm text-[#3B82F6] hover:underline"
            >
              Create your first tenant →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                {['Ref', 'Organisation', 'Type', 'Domain', 'Country', 'Created', 'Admin Email', 'Status', 'Actions'].map(h => (
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
              {rows.map(t => (
                <tr key={t.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">{shortRef(t.id, t.type)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/flexadmin/tenants/${t.id}`} className="text-[#3B82F6] hover:underline font-medium">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${typeChip(t.type)}`}>
                      {t.type === 'partner' ? 'Partner' : 'Agency'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{t.primary_domain ?? '—'}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{t.country ?? '—'}</td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">{t.primary_contact_email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusChip(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/flexadmin/tenants/${t.id}`} className="text-xs text-[#3B82F6] hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
