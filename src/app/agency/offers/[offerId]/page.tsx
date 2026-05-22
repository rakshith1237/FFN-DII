import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { AgencyOfferActions }  from '@/components/agency/offer-actions'

export default async function AgencyOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>
}) {
  const { offerId } = await params
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['a_recruiting_manager','a_super_admin'].includes(persona)) redirect('/agency/dashboard')

  const db = createAdminClient()
  const { data: offer } = await db
    .from('x_ffn_offer')
    .select(`
      id, bill_rate, currency, rate_model, start_date, end_date, payment_terms, status, created_at,
      x_ffn_jd!inner ( title, number, location_city ),
      x_ffn_candidate!inner ( first_name, last_name, email, current_title )
    `)
    .eq('id', offerId)
    .eq('agency_tenant_id', tenantId)
    .maybeSingle()

  if (!offer) redirect('/agency/dashboard')

  const offerData = offer as unknown as {
    id: string; bill_rate: number; currency: string; rate_model: string;
    start_date: string; end_date: string | null; payment_terms: string; status: string;
    x_ffn_jd: { title: string; number: string; location_city: string | null };
    x_ffn_candidate: { first_name: string; last_name: string; email: string; current_title: string | null };
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Offer Review</h1>
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Candidate',    `${offerData.x_ffn_candidate.first_name} ${offerData.x_ffn_candidate.last_name}`],
            ['Role',         offerData.x_ffn_jd.title],
            ['JD Reference', offerData.x_ffn_jd.number],
            ['Location',     offerData.x_ffn_jd.location_city ?? '—'],
            ['Bill Rate',    `${offerData.currency} ${Number(offerData.bill_rate).toLocaleString()} / ${offerData.rate_model}`],
            ['Start Date',   new Date(offerData.start_date).toLocaleDateString('en-GB')],
            ['End Date',     offerData.end_date ? new Date(offerData.end_date).toLocaleDateString('en-GB') : 'Open-ended'],
            ['Payment Terms',offerData.payment_terms.replace('_',' ')],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase">{label}</p>
              <p className="text-[#374151] mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
      {offerData.status === 'approved' ? (
        <AgencyOfferActions
          offerId={offerData.id}
          billRate={offerData.bill_rate}
          currency={offerData.currency}
          startDate={offerData.start_date}
        />
      ) : (
        <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] text-center">
          Status: <strong className="text-[#374151]">{offerData.status.replace(/_/g,' ')}</strong>
        </div>
      )}
    </div>
  )
}
