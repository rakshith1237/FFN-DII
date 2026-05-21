'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'

type MarketRate = {
  role: string
  location: string
  rate_min: number
  rate_p50: number
  rate_p75: number
  rate_max: number
  rate_model: string
  currency: string
  sample_size: number
  effective_date: string
}

export function MarketRateWidget({ role, location }: { role: string; location: string }) {
  const [open, setOpen]         = useState(false)
  const [rate, setRate]         = useState<MarketRate | null>(null)
  const [loading, setLoading]   = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetch_ = useCallback(() => {
    if (!role.trim()) return
    setLoading(true)
    setNotFound(false)
    fetch(`/api/market-rate?role=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}`)
      .then(r => r.json())
      .then(j => {
        setRate(j.data ?? null)
        setNotFound(!j.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [role, location])

  useEffect(() => { if (open) fetch_() }, [open, fetch_])

  return (
    <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-[#374151]">
          <TrendingUp size={15} className="text-[#6B7280]" />
          Market Rate Benchmark
          {role && <span className="text-[#6B7280] font-normal">— {role}</span>}
        </span>
        {open ? <ChevronUp size={15} className="text-[#6B7280]" /> : <ChevronDown size={15} className="text-[#6B7280]" />}
      </button>

      {open && (
        <div className="px-4 py-4">
          {loading && <p className="text-xs text-[#6B7280]">Loading rates...</p>}
          {notFound && <p className="text-xs text-[#6B7280]">No benchmark data available for this role/location.</p>}
          {rate && (
            <div>
              <p className="text-xs text-[#6B7280] mb-3">
                {rate.location} · {rate.rate_model} · {rate.sample_size} data points · Updated {new Date(rate.effective_date).toLocaleDateString('en-GB')}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Min',  value: rate.rate_min, color: 'text-[#374151]' },
                  { label: 'P50',  value: rate.rate_p50, color: 'text-[#0F2147] font-bold' },
                  { label: 'P75',  value: rate.rate_p75, color: 'text-[#374151]' },
                  { label: 'Max',  value: rate.rate_max, color: 'text-[#374151]' },
                ].map(col => (
                  <div key={col.label} className="text-center bg-[#F9FAFB] rounded p-2">
                    <p className="text-xs text-[#6B7280]">{col.label}</p>
                    <p className={`text-sm mt-0.5 ${col.color}`}>
                      {rate.currency} {Number(col.value).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 bg-[#E5E7EB] rounded-full relative">
                <div className="absolute h-full bg-[#3B82F6] rounded-full"
                  style={{ left: '0%', width: `${((rate.rate_p50 - rate.rate_min) / (rate.rate_max - rate.rate_min)) * 100}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0F2147] rounded-full border-2 border-white"
                  style={{ left: `${((rate.rate_p50 - rate.rate_min) / (rate.rate_max - rate.rate_min)) * 100}%` }} />
              </div>
              <p className="text-xs text-[#6B7280] mt-1 text-center">P50 marker shown on range</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
