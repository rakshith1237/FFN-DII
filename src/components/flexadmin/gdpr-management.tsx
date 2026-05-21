'use client'
import { useState } from 'react'
import { Trash2, Download, AlertTriangle } from 'lucide-react'

type Result = { message?: string; error?: string; queued?: boolean; sla?: string }

export function GdprManagement() {
  const [userId,  setUserId]  = useState('')
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState<'erase' | 'export' | null>(null)
  const [result,  setResult]  = useState<Result | null>(null)

  async function handleErase() {
    if (!confirm(`IRREVERSIBLE: Erase all PII for user ${userId}? This cannot be undone.`)) return
    setLoading('erase')
    setResult(null)
    const res  = await fetch('/api/gdpr/erasure', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: userId.trim(), reason: reason.trim() || 'GDPR Art. 17 request' }),
    })
    const data = await res.json() as Result
    setResult(data)
    setLoading(null)
  }

  async function handleExport() {
    setLoading('export')
    setResult(null)
    const res = await fetch(`/api/gdpr/export?userId=${encodeURIComponent(userId.trim())}`)
    if (!res.ok) {
      const data = await res.json() as Result
      setResult(data)
      setLoading(null)
      return
    }
    // Trigger file download
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `gdpr-export-${userId.trim()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setResult({ message: 'Export downloaded successfully.' })
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg p-4 flex gap-3">
        <AlertTriangle size={18} className="text-[#C2410C] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#92400E]">
          Erasure is permanent and irreversible. All PII fields will be set to GDPR_ERASED.
          Audit logs, scores, and financial records are retained for legal compliance per GDPR Art. 17(3).
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#374151] mb-1">
            User ID (auth.users UUID)
          </label>
          <input
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full h-10 px-3 text-sm font-mono border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#374151] mb-1">
            Reason / Request reference
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. DSR-2026-001 — email from data.subject@example.com"
            className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
          />
        </div>

        {result && (
          <div className={`p-3 rounded text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {result.error ?? result.message ?? (result.queued ? `Erasure queued. SLA: ${result.sla ?? '72 hours'}` : JSON.stringify(result))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={!userId.trim() || loading !== null}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#D1D5DB] text-sm font-semibold text-[#374151] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
          >
            <Download size={15} />
            {loading === 'export' ? 'Exporting...' : 'Export Data (Art. 20)'}
          </button>
          <button
            onClick={handleErase}
            disabled={!userId.trim() || loading !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#DC2626] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
          >
            <Trash2 size={15} />
            {loading === 'erase' ? 'Requesting...' : 'Erase PII (Art. 17)'}
          </button>
        </div>
      </div>
    </div>
  )
}
