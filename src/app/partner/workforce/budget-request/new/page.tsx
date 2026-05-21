'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitBudgetRequest } from '@/lib/actions/workforce/submit-budget-request'

const SKILL_OPTIONS = [
  'ServiceNow','ITSM','Java','Python','SQL','Agile','AWS','React','Project Management','ITIL'
]

export default function NewBudgetRequestPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [form, setForm] = useState({
    role: '', headcount_count: 1, department: '', business_unit: '',
    justification: '', budget_amount: '', currency: 'GBP', target_start_date: ''
  })

  function toggleSkill(skill: string) {
    setSkills(prev => {
      const next = { ...prev }
      if (next[skill]) { delete next[skill] } else { next[skill] = 1 }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const result = await submitBudgetRequest({
      role:              form.role,
      headcount_count:   form.headcount_count,
      department:        form.department,
      business_unit:     form.business_unit,
      justification:     form.justification,
      required_skills:   skills,
      budget_amount:     form.budget_amount ? parseFloat(form.budget_amount) : null,
      currency:          form.currency,
      target_start_date: form.target_start_date || null,
    })
    setIsPending(false)
    if (result.error) { setError(result.error); return }
    router.push('/partner/workforce/budget-request')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">New Budget Request</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#374151] mb-1">Role *</label>
          <input required value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
            className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
            placeholder="e.g. Senior ServiceNow Developer" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1">Headcount *</label>
            <input type="number" min={1} required value={form.headcount_count}
              onChange={e => setForm(p => ({...p, headcount_count: parseInt(e.target.value) || 1}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1">Currency</label>
            <select value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
              <option>GBP</option><option>USD</option><option>EUR</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1">Department</label>
            <input value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
              placeholder="e.g. Technology" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1">Business Unit</label>
            <input value={form.business_unit} onChange={e => setForm(p => ({...p, business_unit: e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
              placeholder="e.g. Digital Transformation" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#374151] mb-1">Required Skills</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(skill => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  skills[skill] ? 'bg-[#0F2147] text-white border-[#0F2147]' : 'bg-white text-[#374151] border-[#D1D5DB]'
                }`}>
                {skill}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1">Budget Amount</label>
            <input type="number" min={0} step={0.01} value={form.budget_amount}
              onChange={e => setForm(p => ({...p, budget_amount: e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
              placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1">Target Start Date</label>
            <input type="date" value={form.target_start_date}
              onChange={e => setForm(p => ({...p, target_start_date: e.target.value}))}
              className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#374151] mb-1">Justification * (min 20 chars)</label>
          <textarea required rows={4} value={form.justification}
            onChange={e => setForm(p => ({...p, justification: e.target.value}))}
            className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none"
            placeholder="Explain the business need for this headcount..." />
        </div>
        {error && (
          <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isPending}
            className="px-6 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-md hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
            {isPending ? 'Submitting...' : 'Submit Request'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border border-[#D1D5DB] text-sm font-semibold rounded-md hover:bg-[#F9FAFB] transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
