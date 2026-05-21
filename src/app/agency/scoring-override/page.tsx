'use client'
import { useState } from 'react'
import { ALL_FACTORS, validateGroupWeights, type Factor } from '@/lib/ai/factors'
import { saveFactorOverride } from '@/lib/actions/scoring/save-factor-override'

function FactorCard({
  factor,
  onChange,
}: {
  factor: Factor
  onChange: (updated: Factor) => void
}) {
  return (
    <div className={`p-3 rounded-lg border ${factor.enabled ? 'border-[#E5E7EB] bg-white' : 'border-[#F3F4F6] bg-[#F9FAFB] opacity-60'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#374151]">{factor.label}</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={factor.enabled}
            onChange={e => onChange({ ...factor, enabled: e.target.checked })}
            className="w-3.5 h-3.5 rounded accent-[#0F2147]" />
          <span className="text-xs text-[#6B7280]">{factor.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={100} step={1}
          value={factor.weight} disabled={!factor.enabled}
          onChange={e => onChange({ ...factor, weight: parseInt(e.target.value) })}
          className="flex-1 accent-[#0F2147]" />
        <input type="number" min={0} max={100}
          value={factor.weight} disabled={!factor.enabled}
          onChange={e => onChange({ ...factor, weight: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
          className="w-14 h-7 px-2 text-xs border border-[#D1D5DB] rounded text-center" />
        <span className="text-xs text-[#6B7280]">%</span>
      </div>
    </div>
  )
}

export default function ScoringOverridePage() {
  const [factors, setFactors] = useState<Factor[]>(ALL_FACTORS.map(f => ({ ...f })))
  const [isPending, setIsPending] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)

  const tfFactors = factors.filter(f => f.group === 'technical_fit')
  const afFactors = factors.filter(f => f.group === 'auxiliary_fit')
  const tfSum = tfFactors.filter(f => f.enabled).reduce((s, f) => s + f.weight, 0)
  const afSum = afFactors.filter(f => f.enabled).reduce((s, f) => s + f.weight, 0)

  function updateFactor(updated: Factor) {
    setFactors(prev => prev.map(f => f.code === updated.code ? updated : f))
    setSaved(false)
  }

  async function handleSave() {
    setError(null)
    if (Math.round(tfSum) !== 100) { setError('Technical Fit weights must sum to 100'); return }
    if (Math.round(afSum) !== 100) { setError('Auxiliary Fit weights must sum to 100'); return }
    setIsPending(true)
    const result = await saveFactorOverride(factors)
    setIsPending(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
  }

  const sumBadge = (sum: number) => (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Math.round(sum) === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {Math.round(sum)} / 100
    </span>
  )

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-[#0F2147] mb-1">Scoring Factor Override</h1>
      <p className="text-sm text-[#6B7280] mb-6">Customise IntelliMatch factor weights for your agency. Each group must sum to 100.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Technical Fit</h2>
            {sumBadge(tfSum)}
          </div>
          <div className="space-y-2">
            {tfFactors.map(f => <FactorCard key={f.code} factor={f} onChange={updateFactor} />)}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Auxiliary Fit</h2>
            {sumBadge(afSum)}
          </div>
          <div className="space-y-2">
            {afFactors.map(f => <FactorCard key={f.code} factor={f} onChange={updateFactor} />)}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">{error}</div>
      )}
      {saved && (
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded text-sm text-green-700">Factor overrides saved successfully.</div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="px-6 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-md hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
          {isPending ? 'Saving...' : 'Save Overrides'}
        </button>
        <button onClick={() => { setFactors(ALL_FACTORS.map(f => ({ ...f }))); setSaved(false) }}
          className="px-4 py-2.5 text-sm border border-[#D1D5DB] rounded-md hover:bg-[#F9FAFB] transition-colors">
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
