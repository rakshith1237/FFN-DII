import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { approveBudgetRequest } from '@/lib/actions/workforce/approve-budget-request'

const STATUS_STYLES: Record<string, string> = {
  draft:        'bg-gray-100 text-gray-600',
  submitted:    'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved:     'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-600',
  cancelled:    'bg-gray-100 text-gray-500',
}

export default async function BudgetRequestListPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: requests } = await db
    .from('x_ffn_budget_request')
    .select('id, role, headcount_count, department, status, submitted_at, budget_amount, currency, target_start_date, justification')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const canApprove = persona === 'p_super_admin'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Budget Requests</h1>
        {['p_hiring_manager','p_super_admin'].includes(persona) && (
          <Link href="/partner/workforce/budget-request/new"
            className="px-4 py-2 bg-[#0F2147] text-white text-sm font-semibold rounded-md hover:bg-[#1a3460] transition-colors">
            + New Request
          </Link>
        )}
      </div>

      {!requests?.length ? (
        <p className="text-sm text-[#6B7280]">No budget requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Role','Headcount','Department','Budget','Start Date','Status','Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-medium text-[#111827]">{r.role}</td>
                  <td className="py-3 px-4 text-[#374151]">{r.headcount_count}</td>
                  <td className="py-3 px-4 text-[#374151]">{r.department ?? '—'}</td>
                  <td className="py-3 px-4 text-[#374151]">
                    {r.budget_amount ? `${r.currency} ${Number(r.budget_amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#374151]">
                    {r.target_start_date ? new Date(r.target_start_date).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] ?? ''}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {canApprove && r.status === 'submitted' && (
                      <div className="flex gap-2">
                        <form action={async () => {
                          'use server'
                          await approveBudgetRequest(r.id, 'approved')
                        }}>
                          <button className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                        </form>
                        <form action={async () => {
                          'use server'
                          await approveBudgetRequest(r.id, 'rejected')
                        }}>
                          <button className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Reject</button>
                        </form>
                      </div>
                    )}
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
