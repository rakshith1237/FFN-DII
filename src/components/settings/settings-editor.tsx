'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type ResolvedValue = { value: string; source: 'tenant' | 'platform' }

export function SettingsEditor({
  groups,
  resolved,
  tenantId,
}: {
  groups: { group: string; keys: string[] }[]
  resolved: Record<string, ResolvedValue>
  tenantId: string
}) {
  const [edits, setEdits]       = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState<Record<string, boolean>>({})
  const [saved, setSaved]       = useState<Record<string, boolean>>({})
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [, startTransition]     = useTransition()

  async function saveSetting(key: string) {
    const value = edits[key]
    if (value === undefined) return
    setSaving(p => ({ ...p, [key]: true }))
    setErrors(p => ({ ...p, [key]: '' }))

    const supabase = createClient()
    const { error } = await supabase
      .from('x_ffn_setting')
      .upsert(
        { tier: 2, tenant_id: tenantId, user_id: null, key, value, data_type: 'string' },
        { onConflict: 'tenant_id,user_id,tier,key' }
      )

    setSaving(p => ({ ...p, [key]: false }))
    if (error) { setErrors(p => ({ ...p, [key]: error.message })); return }
    setSaved(p => ({ ...p, [key]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000)
  }

  return (
    <div className="space-y-6">
      {groups.map(g => (
        <div key={g.group} className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">{g.group}</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {g.keys.map(key => {
              const current = edits[key] ?? resolved[key]?.value ?? ''
              const source  = resolved[key]?.source ?? 'platform'
              return (
                <div key={key} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[#374151] font-mono">{key}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        source === 'tenant' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {source}
                      </span>
                    </div>
                  </div>
                  <input
                    value={current}
                    onChange={e => setEdits(p => ({ ...p, [key]: e.target.value }))}
                    className="w-48 h-8 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => startTransition(() => { saveSetting(key) })}
                    disabled={saving[key] || edits[key] === undefined}
                    className="px-3 py-1.5 text-xs bg-[#0F2147] text-white font-semibold rounded hover:bg-[#1a3460] disabled:opacity-40 transition-colors w-16"
                  >
                    {saving[key] ? '...' : saved[key] ? '✓' : 'Save'}
                  </button>
                  {errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
