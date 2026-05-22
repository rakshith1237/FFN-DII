import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { approveOrRejectOffer } from '@/lib/actions/offer/submit-approve-reject-offer'

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

export default async function PartnerOffersPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: offers } = await db
    .from('x_ffn_offer')
    .select(`
      id, bill_rate, currency, rate_model, start_date, status, created_at,
      x_ffn_jd!inner ( title, number ),
      x_ffn_candidate!inner ( first_name, last_name )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const canApprove = persona === 'p_super_admin'

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Offers</h1>
      {!offers?.length ? (
        <p className="text-sm text-[#6B7280]">No offers created yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Candidate','JD','Bill Rate','Start Date','Status','Actions'].map(h=>(
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
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
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[offer.status]??''}`}>
                      {offer.status.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {canApprove && offer.status === 'pending_approval' && (
                      <div className="flex gap-2">
                        <form action={async()=>{'use server'; await approveOrRejectOffer(offer.id,'approved')}}>
                          <button className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                        </form>
                        <form action={async()=>{'use server'; await approveOrRejectOffer(offer.id,'rejected')}}>
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
