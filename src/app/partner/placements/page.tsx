import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }             from 'next/navigation'
import Link                     from 'next/link'
import { PlacementsActions }    from '@/components/partner/placements-actions'

const STATUS_STYLE: Record<string, string> = {
  pre_start:  'bg-blue-100 text-blue-700',
  active:     'bg-green-100 text-green-700',
  extended:   'bg-purple-100 text-purple-700',
  concluded:  'bg-gray-100 text-gray-500',
  ended:      'bg-gray-100 text-gray-500',
  terminated: 'bg-red-100 text-red-600',
  on_hold:    'bg-amber-100 text-amber-700',
}

export default async function PlacementsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    redirect('/partner/dashboard')
  }

  const db = createAdminClient()
  const { data: placements } = await db
    .from('x_ffn_placement')
    .select(`
      id, status, start_date, end_date, bill_rate, currency, concluded_at,
      x_ffn_candidate!inner ( first_name, last_name ),
      x_ffn_jd!inner ( title, number ),
      x_ffn_tenant!x_ffn_placement_agency_tenant_id_fkey ( name )
    `)
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })
    .limit(100)

  type PlacementRow = {
    id: string; status: string; start_date: string
    end_date: string | null; bill_rate: number; currency: string
    concluded_at: string | null
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string; number: string }
    x_ffn_tenant: { name: string } | null
  }

  const rows = (placements ?? []) as unknown as PlacementRow[]
  const activeCount = rows.filter(r => r.status === 'active').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F2147]">Placements</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{activeCount} active · {rows.length} total</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No placements yet. Accept an offer to create the first placement.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Contractor','Agency','Role','Start','End','Rate','Status','Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-medium text-[#111827] whitespace-nowrap">
                    {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name}
                  </td>
                  <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">{p.x_ffn_tenant?.name ?? '—'}</td>
                  <td className="py-3 px-4 text-[#374151]">{p.x_ffn_jd.title}</td>
                  <td className="py-3 px-4 text-[#374151] whitespace-nowrap">
                    {new Date(p.start_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-3 px-4 text-[#374151] whitespace-nowrap">
                    {p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[#374151]">
                    {p.currency} {Number(p.bill_rate).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/partner/placements/${p.id}/onboarding`}
                        className="text-xs text-[#0F2147] underline hover:no-underline whitespace-nowrap">
                        Onboarding
                      </Link>
                      {['concluded','ended','terminated'].includes(p.status) && (
                        <Link href={`/partner/placements/${p.id}/conclusion`}
                          className="text-xs text-[#0F2147] underline hover:no-underline whitespace-nowrap">
                          Summary
                        </Link>
                      )}
                      {p.status === 'active' && (
                        <PlacementsActions
                          placementId={p.id}
                          candidateName={`${p.x_ffn_candidate.first_name} ${p.x_ffn_candidate.last_name}`}
                          jdTitle={p.x_ffn_jd.title}
                          endDate={p.end_date}
                          startDate={p.start_date}
                        />
                      )}
                    </div>
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
