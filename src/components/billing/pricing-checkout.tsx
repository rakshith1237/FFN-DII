'use client'
import { useState } from 'react'

export function PricingCheckout({
  planType,
  planName,
}: {
  planType: 'partner' | 'agency'
  planName: string
}) {
  const [email,   setEmail]   = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubscribe() {
    setError(null)
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return }
    if (!orgName.trim()) { setError('Enter your organisation name'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/billing/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planType, orgName: orgName.trim(), email: email.trim() }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) { setError(data.error ?? 'Failed to start checkout'); return }
      window.location.href = data.url
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Organisation name"
        value={orgName}
        onChange={e => setOrgName(e.target.value)}
        className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0F2147] focus:outline-none"
      />
      <input
        type="email"
        placeholder="Work email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0F2147] focus:outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full py-3 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors"
      >
        {loading ? 'Redirecting to checkout...' : `Start with ${planName}`}
      </button>
      <p className="text-xs text-center text-[#9CA3AF]">
        Secured by Stripe · 14-day free trial · Cancel anytime
      </p>
    </div>
  )
}
