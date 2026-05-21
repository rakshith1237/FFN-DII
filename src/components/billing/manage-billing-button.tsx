'use client'
import { useState } from 'react'
import { CreditCard } from 'lucide-react'

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) { setError(data.error ?? 'Failed to open billing portal'); return }
      window.location.href = data.url
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
      <h2 className="text-sm font-bold text-[#374151] mb-1">Billing</h2>
      <p className="text-xs text-[#6B7280] mb-3">
        Manage your subscription, update payment method, or download invoices.
      </p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 border border-[#D1D5DB] text-sm font-semibold text-[#374151] rounded-md hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors"
      >
        <CreditCard size={15} />
        {loading ? 'Opening billing portal...' : 'Manage Billing'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
