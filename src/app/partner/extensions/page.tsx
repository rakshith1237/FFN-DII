import { createAdminClient }          from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }                   from 'next/navigation'
import ExtensionActions               from '@/components/partner/extension-actions'

type ExtRow = {
  id: string
  status: string
  current_end_date: string
  proposed_end_date: string
  proposed_bill_rate: number | null
  extension_reason: string
  created_at: string
  x_ffn_placement: {
    id: string
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string }
  }
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  withdrawn:'bg-gray-100 text-gray-500',
}

export default async function PartnerExtensionsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_super_admin', 'p_hiring_manager'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: extensions } = await db
    .from('x_ffn_contract_extension')
    .select(`
      id, status, current_end_date, proposed_end_date,
      proposed_bill_rate, extension_reason, created_at,
      x_ffn_placement!inner(
        id,
        x_ffn_candidate!inner(first_name, last_name),
        x_ffn_jd!inner(title)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (extensions ?? []) as unknown as ExtRow[]
  const pending = rows.filter((r) => r.status === 'pending')
  const reviewed = rows.filter((r) => r.status !== 'pending')

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-bold text-[#0F2147]">Contract Extensions</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            Pending Review ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((ext) => (
              <div
                key={ext.id}
                className="bg-white rounded-lg border-l-4 border-[#D97706] border border-[#E5E7EB] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-[#0F2147]">
                      {ext.x_ffn_placement.x_ffn_candidate.first_name}{' '}
                      {ext.x_ffn_placement.x_ffn_candidate.last_name}
                      <span className="ml-2 text-sm font-normal text-[#6B7280]">
                        {ext.x_ffn_placement.x_ffn_jd.title}
                      </span>
                    </p>
                    <div className="flex gap-6 text-sm text-[#374151]">
                      <span>
                        Current end:{' '}
                        <strong>
                          {new Date(ext.current_end_date).toLocaleDateString('en-GB')}
                        </strong>
                      </span>
                      <span>
                        Proposed end:{' '}
                        <strong className="text-[#E8531E]">
                          {new Date(ext.proposed_end_date).toLocaleDateString('en-GB')}
                        </strong>
                      </span>
                      {ext.proposed_bill_rate && (
                        <span>
                          New rate: <strong>{ext.proposed_bill_rate}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] italic max-w-xl">{ext.extension_reason}</p>
                  </div>
                  {persona === 'p_super_admin' && (
                    <ExtensionActions extensionId={ext.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            History
          </h2>
          <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Contractor', 'Role', 'Proposed End', 'Status', 'Requested'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewed.map((ext) => (
                  <tr key={ext.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4 font-medium text-[#111827]">
                      {ext.x_ffn_placement.x_ffn_candidate.first_name}{' '}
                      {ext.x_ffn_placement.x_ffn_candidate.last_name}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {ext.x_ffn_placement.x_ffn_jd.title}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {new Date(ext.proposed_end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          STATUS_STYLE[ext.status] ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {ext.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6B7280]">
                      {new Date(ext.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <p className="text-sm text-[#6B7280]">No extension requests yet.</p>
      )}
    </div>
  )
}