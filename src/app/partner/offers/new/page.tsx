'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createOffer }  from '@/lib/actions/offer/create-offer'
import { submitOfferForApproval } from '@/lib/actions/offer/submit-approve-reject-offer'

const PAYMENT_TERMS = ['net_7','net_14','net_30','net_45','net_60']

export default function NewOfferPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submissionId') ?? ''
  const candidateId  = searchParams.get('candidateId')  ?? ''
  const jdId         = searchParams.get('jdId')         ?? ''
  const agencyId     = searchParams.get('agencyId')     ?? ''

  const [form, setForm] = useState({
    billRate:     '', currency: 'GBP', rateModel: 'daily' as 'hourly'|'daily'|'fixed',
    startDate:    '', endDate:  '', paymentTerms: 'net_30', notes: '',
  })
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDraft() {
    setError(null)
    if (!form.billRate || !form.startDate) { setError('Bill rate and start date are required'); return }
    setLoading(true)
    const result = await createOffer({
      submissionId, candidateId, jdId,
      agencyTenantId: agencyId,
      billRate:       parseFloat(form.billRate),
      currency:       form.currency,
      rateModel:      form.rateModel,
      startDate:      form.startDate,
      endDate:        form.endDate || null,
      paymentTerms:   form.paymentTerms,
      notes:          form.notes.trim() || null,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    router.push('/partner/offers')
  }

  async function handleSubmitForApproval() {
    setError(null)
    if (!form.billRate || !form.startDate) { setError('Bill rate and start date are required'); return }
    setLoading(true)
    const createResult = await createOffer({
      submissionId, candidateId, jdId,
      agencyTenantId: agencyId,
      billRate:       parseFloat(form.billRate),
      currency:       form.currency,
      rateModel:      form.rateModel,
      startDate:      form.startDate,
      endDate:        form.endDate || null,
      paymentTerms:   form.paymentTerms,
      notes:          form.notes.trim() || null,
    })
    if (createResult.error || !createResult.offerId) {
      setLoading(false)
      setError(createResult.error ?? 'Failed to create offer')
      return
    }
    await submitOfferForApproval(createResult.offerId)
    setLoading(false)
    router.push('/partner/offers')
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Create Offer</h1>
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[#374151] mb-1">Bill Rate *</label>
            <input type="number" min="0" step="0.01"
              value={form.billRate} onChange={e => setForm(p=>({...p,billRate:e.target.value}))}
              placeholder="e.g. 575" className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Currency</label>
            <select value={form.currency} onChange={e => setForm(p=>({...p,currency:e.target.value}))}
              className="w-full h-10 px-2 text-sm border border-[#D1D5DB] rounded-lg bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
              {['GBP','USD','EUR'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Rate Model</label>
          <div className="grid grid-cols-3 gap-2">
            {(['hourly','daily','fixed'] as const).map(m=>(
              <button key={m} type="button" onClick={()=>setForm(p=>({...p,rateModel:m}))}
                className={`py-2 text-sm rounded-lg border font-medium capitalize transition-colors ${
                  form.rateModel===m?'bg-[#0F2147] text-white border-[#0F2147]':'bg-white text-[#374151] border-[#D1D5DB]'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Start Date *</label>
            <input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Payment Terms</label>
          <select value={form.paymentTerms} onChange={e=>setForm(p=>({...p,paymentTerms:e.target.value}))}
            className="w-full h-10 px-2 text-sm border border-[#D1D5DB] rounded-lg bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
            {PAYMENT_TERMS.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#374151] mb-1">Additional Terms / Notes</label>
          <textarea rows={3} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
            placeholder="Any additional contractual terms..."
            className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
        </div>
        {error && <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>}
        <div className="flex gap-3">
          <button onClick={handleDraft} disabled={loading}
            className="flex-1 py-2.5 border border-[#D1D5DB] text-sm font-semibold text-[#374151] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors">
            Save as Draft
          </button>
          <button onClick={handleSubmitForApproval} disabled={loading}
            className="flex-1 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
            {loading ? 'Creating...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
