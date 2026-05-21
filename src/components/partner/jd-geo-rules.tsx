'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type GeoRule = {
  id: string
  rule_type: 'hard_block' | 'soft_warning'
  geo_scope: 'country' | 'region'
  geo_value: string
  reason: string | null
  is_active: boolean
}

const COUNTRY_OPTIONS = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'PL', name: 'Poland' },
  { code: 'RO', name: 'Romania' },
  { code: 'UA', name: 'Ukraine' },
]

export function JdGeoRules({
  jdId,
  tenantId,
  initialRules,
}: {
  jdId: string
  tenantId: string
  initialRules: GeoRule[]
}) {
  const [rules, setRules]     = useState<GeoRule[]>(initialRules)
  const [isPending, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)
  const [newRule, setNewRule] = useState<{
    rule_type: 'hard_block' | 'soft_warning'
    geo_scope: 'country' | 'region'
    geo_value: string
    reason:    string
  }>({
    rule_type: 'hard_block',
    geo_scope: 'country',
    geo_value: 'GB',
    reason:    '',
  })

  async function addRule() {
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('x_ffn_jd_geo_rule')
      .insert({
        tenant_id: tenantId,
        jd_id:     jdId,
        rule_type: newRule.rule_type,
        geo_scope: newRule.geo_scope,
        geo_value: newRule.geo_value,
        reason:    newRule.reason || null,
        is_active: true,
      })
      .select('id, rule_type, geo_scope, geo_value, reason, is_active')
      .single()
    if (err) { setError(err.message); return }
    if (data) setRules(prev => [...prev, data as GeoRule])
  }

  async function removeRule(id: string) {
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('x_ffn_jd_geo_rule')
      .delete()
      .eq('id', id)
    if (err) { setError(err.message); return }
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const RULE_LABELS = {
    hard_block:   { label: 'Hard Block',   color: 'bg-red-100 text-red-700 border-red-200' },
    soft_warning: { label: 'Soft Warning', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  }

  return (
    <div className="space-y-4">
      {rules.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No geo rules configured. All locations permitted.</p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-lg bg-white">
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${RULE_LABELS[rule.rule_type].color}`}>
                {RULE_LABELS[rule.rule_type].label}
              </span>
              <span className="text-sm text-[#374151]">
                {COUNTRY_OPTIONS.find(c => c.code === rule.geo_value)?.name ?? rule.geo_value}
                {rule.reason && <span className="text-[#6B7280] ml-1">— {rule.reason}</span>}
              </span>
              <button onClick={() => startTransition(() => { removeRule(rule.id) })}
                className="ml-auto text-[#9CA3AF] hover:text-red-500 transition-colors text-sm">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border border-[#E5E7EB] rounded-lg p-4 bg-[#F9FAFB] space-y-3">
        <p className="text-xs font-semibold text-[#6B7280] uppercase">Add Rule</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Rule Type</label>
            <select value={newRule.rule_type}
              onChange={e => setNewRule(p => ({ ...p, rule_type: e.target.value as 'hard_block' | 'soft_warning' }))}
              className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
              <option value="hard_block">Hard Block (blocks submission)</option>
              <option value="soft_warning">Soft Warning (flags submission)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Country</label>
            <select value={newRule.geo_value}
              onChange={e => setNewRule(p => ({ ...p, geo_value: e.target.value }))}
              className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">Reason (optional)</label>
          <input value={newRule.reason}
            onChange={e => setNewRule(p => ({ ...p, reason: e.target.value }))}
            placeholder="e.g. Right-to-work requirement"
            className="w-full h-9 px-3 text-sm border border-[#D1D5DB] rounded bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={() => startTransition(() => { addRule() })} disabled={isPending}
          className="px-4 py-2 text-sm bg-[#0F2147] text-white font-semibold rounded hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
          {isPending ? 'Adding...' : '+ Add Rule'}
        </button>
      </div>
    </div>
  )
}
