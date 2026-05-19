import type { ElementType } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Plus, Building2, Users, AlertCircle } from 'lucide-react'

type TenantRow = {
  id:                    string
  name:                  string
  type:                  string
  status:                string
  primary_domain:        string | null
  country:               string | null
  primary_contact_email: string | null
  created_at:            string
  subscription_plan:     string | null
}

function shortRef(id: string, type: string): string {
  const prefix = type === 'partner' ? 'PT' : 'AG'
  return `FFN-${prefix}-${id.slice(-4).toUpperCase()}`
}

function typeChipClass(type: string): string {
  return type === 'partner' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#DCFCE7] text-[#166534]'
}

function statusChipClass(status: string): string {
  return status === 'active'    ? 'bg-[#DCFCE7] text-[#166534]'
       : status === 'suspended' ? 'bg-[#FEE2E2] text-[#991B1B]'
       : 'bg-[#F3F4F6] text-[#374151]'
}

type StatCard = { label: string; value: number; icon: ElementType; color: string }

export default async function TenantsPage() {
  const supabaseAdmin = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: tenants } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id, name, type, status, primary_domain, country, primary_contact_email, created_at, subscription_plan')
    .order('created_at', { ascending: false })

  const rows: TenantRow[] = tenants ?? []
  const activeCount    = rows.filter(t => t.status === 'active').length
  const suspendedCount = rows.filter(t => t.status === 'suspended').length

  const STATS: StatCard[] = [
    { label: 'Total Tenants', value: rows.length,    icon: Building2,   color: 'bg-[#EFF6FF] text-[#3B82F6]' },
    { label: 'Active',        value: activeCount,    icon: Users,       color: 'bg-[#DCFCE7] text-[#16A34A]' },
    { label: 'Suspended',     value: suspendedCount, icon: AlertCircle, color: 'bg-[#FEE2E2] text-[#DC2626]' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F2147]">Tenant Management</h1>
          <p className="text-[14px] text-[#6B7280] mt-0.5">
            Manage all Partner and Agency organisations on the platform
          </p>
        </div>
        <Link
          href="/flexadmin/tenants/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F2147] text-white text-[14px] font-semibold rounded-[6px] hover:bg-[#1a3460] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          Create New Tenant
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {STATS.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-[8px] ${stat.color} flex items-center justify-center shrink-0`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-[13px] text-[#6B7280]">{stat.label}</p>
                <p className="text-[24px] font-bold text-[#0F2147] leading-tight">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#374151]">All Tenants</h2>
          <span className="text-[12px] text-[#9CA3AF]">{rows.length} organisation{rows.length !== 1 ? 's' : ''}</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 size={40} className="text-[#D1D5DB] mb-3" />
            <p className="text-[15px] font-semibold text-[#374151]">No tenants provisioned yet</p>
            <p className="text-[13px] text-[#6B7280] mt-1 mb-5">Create your first Partner or Agency organisation</p>
            <Link
              href="/flexadmin/tenants/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2147] text-white text-[13px] font-semibold rounded-[6px] hover:bg-[#1a3460] transition-colors"
            >
              <Plus size={14} /> Create your first tenant →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {['Ref', 'Organisation', 'Type', 'Domain', 'Country', 'Provisioned', 'Admin Email', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {rows.map(t => (
                  <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[12px] text-[#6B7280] whitespace-nowrap">
                      {shortRef(t.id, t.type)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/flexadmin/tenants/${t.id}`} className="text-[#3B82F6] hover:underline font-semibold text-[13px]">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-semibold ${typeChipClass(t.type)}`}>
                        {t.type === 'partner' ? 'Partner' : 'Agency'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6B7280]">{t.primary_domain ?? '—'}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6B7280]">{t.country ?? '—'}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6B7280] whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-[#6B7280] max-w-[180px] truncate">
                      {t.primary_contact_email ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusChipClass(t.status)}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/flexadmin/tenants/${t.id}`} className="text-[12px] font-medium text-[#3B82F6] hover:underline whitespace-nowrap">
                        View →
                      </Link>
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
