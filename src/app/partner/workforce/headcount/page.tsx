import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type HeadcountRow = {
  id: string
  role: string
  department: string | null
  business_unit: string | null
  headcount_count: number
  filled_count: number
  target_start_date: string | null
  budget_approved: number | null
  currency: string
  approved_at: string
}

export default async function HeadcountTrackerPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()

  const { data: headcounts } = await db
    .from('x_ffn_approved_headcount')
    .select('id, role, department, business_unit, headcount_count, filled_count, target_start_date, budget_approved, currency, approved_at')
    .eq('tenant_id', tenantId)
    .order('approved_at', { ascending: false })

  const rows = (headcounts ?? []) as HeadcountRow[]
  const totalApproved  = rows.reduce((s, r) => s + r.headcount_count, 0)
  const totalFilled    = rows.reduce((s, r) => s + r.filled_count, 0)
  const totalOpen      = totalApproved - totalFilled

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Headcount Tracker</h1>
        <Link href="/partner/workforce/budget-request/new"
          className="px-4 py-2 bg-[#0F2147] text-white text-sm font-semibold rounded-md hover:bg-[#1a3460] transition-colors">
          + Request Headcount
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Approved', value: totalApproved, color: 'text-[#0F2147]' },
          { label: 'Filled',         value: totalFilled,   color: 'text-green-600' },
          { label: 'Open',           value: totalOpen,     color: 'text-amber-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {!rows.length ? (
        <p className="text-sm text-[#6B7280]">No approved headcount yet. Submit a budget request to get started.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Role','Dept','Approved','Filled','Open','Start Date','Budget',''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const open = r.headcount_count - r.filled_count
                return (
                  <tr key={r.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4 font-medium text-[#111827]">{r.role}</td>
                    <td className="py-3 px-4 text-[#374151]">{r.department ?? '—'}</td>
                    <td className="py-3 px-4 text-[#374151] font-semibold">{r.headcount_count}</td>
                    <td className="py-3 px-4 text-green-600 font-semibold">{r.filled_count}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${open > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{open}</span>
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {r.target_start_date ? new Date(r.target_start_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {r.budget_approved ? `${r.currency} ${Number(r.budget_approved).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/partner/jd/new?headcount_id=${r.id}`}
                        className="px-3 py-1 text-xs bg-[#EEF2FF] text-[#4F46E5] rounded hover:bg-[#E0E7FF] font-medium transition-colors">
                        Create JD
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
