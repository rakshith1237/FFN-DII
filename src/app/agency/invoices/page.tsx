import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }             from 'next/navigation'

export default async function AgencyInvoicesPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['a_super_admin','a_recruiting_manager'].includes(persona)) redirect('/agency/dashboard')

  const db = createAdminClient()
  const { data: invoices } = await db
    .from('x_ffn_invoice')
    .select(`
      id, number, amount, currency, total_amount, due_date, status, period_start, period_end, created_at,
      x_ffn_placement!inner(
        x_ffn_candidate!inner(first_name, last_name),
        x_ffn_jd!inner(title)
      )
    `)
    .eq('agency_tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  type InvoiceRow = {
    id: string; number: string; amount: number; currency: string
    total_amount: number; due_date: string; status: string
    period_start: string; period_end: string
    x_ffn_placement: {
      x_ffn_candidate: { first_name: string; last_name: string }
      x_ffn_jd: { title: string }
    }
  }

  const rows = (invoices ?? []) as unknown as InvoiceRow[]
  const STATUS_STYLE: Record<string, string> = {
    draft:'bg-gray-100 text-gray-500', sent:'bg-blue-100 text-blue-700',
    paid:'bg-green-100 text-green-700', overdue:'bg-red-100 text-red-600',
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Invoices</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No invoices yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Invoice #','Contractor','Role','Period','Amount','Due','Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(inv => (
                <tr key={inv.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-mono text-xs text-[#374151]">{inv.number}</td>
                  <td className="py-3 px-4 font-medium text-[#111827]">
                    {inv.x_ffn_placement.x_ffn_candidate.first_name} {inv.x_ffn_placement.x_ffn_candidate.last_name}
                  </td>
                  <td className="py-3 px-4 text-[#374151]">{inv.x_ffn_placement.x_ffn_jd.title}</td>
                  <td className="py-3 px-4 text-xs text-[#6B7280]">
                    {new Date(inv.period_start).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                    {' – '}
                    {new Date(inv.period_end).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#374151]">
                    {inv.currency} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-[#374151]">{new Date(inv.due_date).toLocaleDateString('en-GB')}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
