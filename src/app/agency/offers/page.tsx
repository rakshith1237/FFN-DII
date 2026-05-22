import { createAdminClient }         from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }                    from 'next/navigation'
import Link                            from 'next/link'

const STATUS_STYLE: Record<string, string> = {
  draft:            'bg-gray-100 text-gray-500',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved:         'bg-green-100 text-green-700',
  rejected:         'bg-red-100 text-red-600',
  accepted:         'bg-blue-100 text-blue-700',
  declined:         'bg-gray-100 text-gray-500',
  withdrawn:        'bg-gray-100 text-gray-400',
  counter:          'bg-purple-100 text-purple-700',
}

export default async function AgencyOffersPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['a_recruiting_manager','a_super_admin'].includes(persona)) redirect('/agency/dashboard')

  const db = createAdminClient()
  const { data: offers } = await db
    .from('x_ffn_offer')
    .select(`
      id, bill_rate, currency, rate_model, start_date, status, created_at,
      x_ffn_jd!inner ( title, number ),
      x_ffn_candidate!inner ( first_name, last_name )
    `)
    .eq('agency_tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Offers</h1>
      {!offers?.length ? (
        <p className="text-sm text-[#6B7280]">No offers received yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Candidate','JD','Bill Rate','Start Date','Status',''].map((h, i) => (
                  <th key={i} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(offers as unknown as Array<{
                id: string; bill_rate: number; currency: string; rate_model: string;
                start_date: string; status: string;
                x_ffn_jd: { title: string; number: string };
                x_ffn_candidate: { first_name: string; last_name: string };
              }>).map(offer => (
                <tr key={offer.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-medium text-[#111827]">
                    {offer.x_ffn_candidate.first_name} {offer.x_ffn_candidate.last_name}
                  </td>
                  <td className="py-3 px-4 text-[#374151]">{offer.x_ffn_jd.title}</td>
                  <td className="py-3 px-4 text-[#374151]">
                    {offer.currency} {Number(offer.bill_rate).toLocaleString()}/{offer.rate_model.charAt(0)}
                  </td>
                  <td className="py-3 px-4 text-[#374151]">
                    {new Date(offer.start_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[offer.status] ?? ''}`}>
                      {offer.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {offer.status === 'approved' && (
                      <Link href={`/agency/offers/${offer.id}`}
                        className="text-xs font-medium text-[#0F2147] hover:underline">
                        Review →
                      </Link>
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
