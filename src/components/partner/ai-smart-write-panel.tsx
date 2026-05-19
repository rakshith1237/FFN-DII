'use client'

import { useState } from 'react'
import { Sparkles, X, Check, Loader2 } from 'lucide-react'

type SmartWriteAction = 'improve' | 'add_keywords' | 'tighten'

interface AiSmartWritePanelProps {
  currentHtml: string
  onApply:     (html: string) => void
  onClose:     () => void
}

const ACTIONS: { value: SmartWriteAction; label: string; desc: string }[] = [
  { value: 'improve',      label: 'Improve Writing',  desc: 'Make it compelling and professional' },
  { value: 'add_keywords', label: 'Add ATS Keywords', desc: 'Optimise for applicant tracking systems' },
  { value: 'tighten',      label: 'Tighten',          desc: 'Remove redundancy, improve clarity' },
]

export default function AiSmartWritePanel({ currentHtml, onApply, onClose }: AiSmartWritePanelProps) {
  const [selectedAction, setSelectedAction] = useState<SmartWriteAction>('improve')
  const [preview, setPreview]               = useState<string>('')
  const [isLoading, setIsLoading]           = useState(false)
  const [error, setError]                   = useState<string>('')

  async function handleGenerate() {
    setIsLoading(true)
    setError('')
    setPreview('')
    try {
      const res = await fetch('/api/jd/smart-write', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: selectedAction, content: currentHtml }),
      })
      const data = await res.json() as { result?: string; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'AI service error')
        return
      }
      setPreview(data.result ?? '')
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-l border-[#E5E7EB] bg-[#F9FAFB]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#D97706]" />
          <span className="text-[14px] font-semibold text-[#0F2147]">AI Smart Write</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
          aria-label="Close AI panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="p-4 flex flex-col gap-2 shrink-0">
        <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Choose action</p>
        {ACTIONS.map(a => (
          <button
            key={a.value}
            onClick={() => setSelectedAction(a.value)}
            className={`w-full text-left px-3 py-2.5 rounded-[6px] border transition-colors ${
              selectedAction === a.value
                ? 'border-[#D97706] bg-[#FEF3C7]'
                : 'border-[#E5E7EB] bg-white hover:border-[#D97706] hover:bg-[#FFFBEB]'
            }`}
          >
            <p className="text-[13px] font-semibold text-[#0F2147]">{a.label}</p>
            <p className="text-[12px] text-[#6B7280]">{a.desc}</p>
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 shrink-0">
        <button
          onClick={handleGenerate}
          disabled={isLoading || !currentHtml.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <><Loader2 size={14} className="animate-spin" />Generating…</>
          ) : (
            <><Sparkles size={14} />Generate</>
          )}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-[6px] bg-[#FEE2E2] text-[#991B1B] text-[12px] shrink-0">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="flex-1 flex flex-col overflow-hidden mx-4 mb-4 min-h-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Preview</p>
            <button
              onClick={() => { onApply(preview); setPreview('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#16A34A] rounded-[6px] hover:bg-[#15803d] transition-colors"
            >
              <Check size={12} />
              Apply
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-3 bg-white border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#374151] prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}
    </div>
  )
}
