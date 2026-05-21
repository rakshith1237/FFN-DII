'use client'
import { useState } from 'react'

type QueueDef = {
  name:  string
  label: string
  type:  string
}

type TriggerState = {
  loading: boolean
  result:  string | null
  error:   string | null
}

const TYPE_BADGE: Record<string, string> = {
  'on-demand':   'bg-blue-50 text-blue-600',
  'daily cron':  'bg-green-50 text-green-600',
  'hourly cron': 'bg-purple-50 text-purple-600',
  'weekly cron': 'bg-amber-50 text-amber-700',
}

export function JobsTable({ queues }: { queues: readonly QueueDef[] }) {
  const [states, setStates] = useState<Record<string, TriggerState>>({})

  async function trigger(queueName: string) {
    setStates(p => ({ ...p, [queueName]: { loading: true, result: null, error: null } }))
    try {
      const res = await fetch('/api/admin/jobs/trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ queueName }),
      })
      const data = await res.json() as { queued?: boolean; jobId?: string; error?: string }
      if (!res.ok) {
        setStates(p => ({ ...p, [queueName]: { loading: false, result: null, error: String(data.error ?? 'Failed') } }))
      } else {
        setStates(p => ({ ...p, [queueName]: { loading: false, result: `Job ${data.jobId ?? ''} queued`, error: null } }))
        setTimeout(() => setStates(p => ({ ...p, [queueName]: { loading: false, result: null, error: null } })), 4000)
      }
    } catch (err) {
      setStates(p => ({ ...p, [queueName]: { loading: false, result: null, error: String(err) } }))
    }
  }

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
            {['Queue','Type','Action','Status'].map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {queues.map(q => {
            const s = states[q.name]
            return (
              <tr key={q.name} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-3 px-4">
                  <p className="font-medium text-[#111827]">{q.label}</p>
                  <p className="text-xs text-[#9CA3AF] font-mono">{q.name}</p>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_BADGE[q.type] ?? 'bg-gray-100 text-gray-500'}`}>
                    {q.type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => trigger(q.name)}
                    disabled={s?.loading}
                    className="px-3 py-1.5 text-xs bg-[#0F2147] text-white font-semibold rounded hover:bg-[#1a3460] disabled:opacity-50 transition-colors"
                  >
                    {s?.loading ? 'Triggering...' : 'Manual Trigger'}
                  </button>
                </td>
                <td className="py-3 px-4 text-xs">
                  {s?.result && <span className="text-green-600">{s.result}</span>}
                  {s?.error  && <span className="text-red-600">{s.error}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
