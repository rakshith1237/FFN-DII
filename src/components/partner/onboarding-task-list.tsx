'use client'
import { useState, useTransition, useRef } from 'react'
import { completeTask, waivedTask }         from '@/lib/actions/onboarding/complete-task'
import { uploadTaskDocument }               from '@/lib/actions/onboarding/upload-task-document'
import { activatePlacement }                from '@/lib/actions/compliance/activate-placement'
import { useRouter }                        from 'next/navigation'
import { CheckCircle, Clock, Upload, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react'

type Task = {
  id: string; task_name: string; task_description: string
  task_type: string; status: string; blocks_start: boolean
  due_date: string | null; completed_at: string | null
}
type Doc = {
  id: string; task_id: string; document_type: string
  original_name: string | null; expiry_date: string | null; verified_at: string | null
}

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  pending:        { icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  in_progress:    { icon: Clock,         color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200'   },
  completed:      { icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  waived:         { icon: CheckCircle,   color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200'   },
  not_applicable: { icon: CheckCircle,   color: 'text-gray-400',  bg: 'bg-gray-50 border-gray-100'   },
}

const DOC_TYPES = [
  { value: 'passport',        label: 'Passport' },
  { value: 'visa',            label: 'Visa' },
  { value: 'share_code',      label: 'Share Code' },
  { value: 'biometric_card',  label: 'Biometric Residence Permit' },
  { value: 'dbs_certificate', label: 'DBS Certificate' },
  { value: 'right_to_work',   label: 'Right to Work Letter' },
  { value: 'other',           label: 'Other' },
]

function TaskRow({
  task, docs, placementId, persona,
}: {
  task: Task; docs: Doc[]; placementId: string; persona: string
}) {
  const [expanded,     setExpanded]    = useState(task.status === 'pending' && task.blocks_start)
  const [error,        setError]       = useState<string | null>(null)
  const [docType,      setDocType]     = useState('passport')
  const [expiryDate,   setExpiryDate]  = useState('')
  const [isPending, startTransition]   = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const taskDocs  = docs.filter(d => d.task_id === task.id)
  const isDone    = ['completed','waived','not_applicable'].includes(task.status)
  const s         = STATUS_STYLE[task.status] ?? { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
  const Icon      = s.icon
  const needsDoc  = ['work_authorization','background_check'].includes(task.task_type)

  function handleComplete() {
    setError(null)
    startTransition(async () => {
      const result = await completeTask(task.id)
      if (result.error) { setError(result.error); return }
    })
  }

  function handleWaive() {
    if (!confirm(`Waive task "${task.task_name}"? This action is audited.`)) return
    setError(null)
    startTransition(async () => {
      const result = await waivedTask(task.id)
      if (result.error) { setError(result.error); return }
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.set('file', file)
    fd.set('taskId', task.id)
    fd.set('placementId', placementId)
    fd.set('documentType', docType)
    fd.set('expiryDate', expiryDate)
    startTransition(async () => {
      const result = await uploadTaskDocument(fd)
      if (result.error) { setError(result.error) }
    })
  }

  return (
    <div className={`rounded-lg border ${s.bg} overflow-hidden mb-2`}>
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={16} className={`flex-shrink-0 ${s.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#374151]">{task.task_name}</p>
            {task.blocks_start && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-bold">P1</span>
            )}
            <span className={`text-xs ${s.color}`}>{task.status.replace('_',' ')}</span>
          </div>
          {task.due_date && !isDone && (
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Due: {new Date(task.due_date).toLocaleDateString('en-GB')}
            </p>
          )}
        </div>
        {expanded ? <ChevronDown size={14} className="text-[#9CA3AF]" /> : <ChevronRight size={14} className="text-[#9CA3AF]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-3 space-y-3">
          <p className="text-sm text-[#6B7280]">{task.task_description}</p>

          {/* Existing documents */}
          {taskDocs.length > 0 && (
            <div className="space-y-1">
              {taskDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 text-xs text-[#374151] bg-white rounded px-3 py-1.5 border border-[#E5E7EB]">
                  <Upload size={12} className="text-[#9CA3AF]" />
                  <span>{doc.original_name ?? doc.document_type}</span>
                  {doc.expiry_date && <span className="text-[#9CA3AF]">· expires {new Date(doc.expiry_date).toLocaleDateString('en-GB')}</span>}
                  {doc.verified_at && <span className="text-green-600 ml-auto">✓ Verified</span>}
                </div>
              ))}
            </div>
          )}

          {/* Upload section for document-required tasks */}
          {needsDoc && !isDone && (
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-3 space-y-2">
              <p className="text-xs font-semibold text-[#374151]">Upload Document</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="h-8 px-2 text-xs border border-[#D1D5DB] rounded bg-white">
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  placeholder="Expiry date (optional)"
                  className="h-8 px-2 text-xs border border-[#D1D5DB] rounded" />
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleUpload} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={isPending}
                className="w-full py-1.5 border border-[#D1D5DB] text-xs font-medium rounded hover:bg-[#F9FAFB] disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
                <Upload size={12} /> {isPending ? 'Uploading...' : 'Choose File'}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-2 bg-[#FEE2E2] rounded text-xs text-[#991B1B]">
              <ShieldAlert size={12} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Action buttons */}
          {!isDone && (
            <div className="flex gap-2">
              <button type="button" onClick={handleComplete} disabled={isPending}
                className="flex-1 py-2 bg-[#0F2147] text-white text-xs font-semibold rounded hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
                {isPending ? '...' : 'Mark Complete'}
              </button>
              {persona === 'p_super_admin' && (
                <button type="button" onClick={handleWaive} disabled={isPending}
                  className="px-3 py-2 border border-[#D1D5DB] text-xs text-[#6B7280] rounded hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors">
                  Waive
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function OnboardingTaskList({
  placementId, p1Tasks, p2Tasks, documents, canActivate, isAlreadyActive, persona,
}: {
  placementId:    string
  p1Tasks:        Task[]
  p2Tasks:        Task[]
  documents:      Doc[]
  canActivate:    boolean
  isAlreadyActive: boolean
  persona:        string
}) {
  const router = useRouter()
  const [activateError, setActivateError] = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  function handleActivate() {
    setActivateError(null)
    startTransition(async () => {
      const result = await activatePlacement(placementId)
      if (result.error) { setActivateError(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* P1 Tasks */}
      <div>
        <h2 className="text-sm font-bold text-[#374151] mb-3 flex items-center gap-2">
          Mandatory Tasks
          <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-bold">P1 — blocks activation</span>
        </h2>
        {p1Tasks.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No mandatory tasks configured.</p>
        ) : (
          p1Tasks.map(t => (
            <TaskRow key={t.id} task={t} docs={documents} placementId={placementId} persona={persona} />
          ))
        )}
      </div>

      {/* P2 Tasks */}
      {p2Tasks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[#374151] mb-3">
            Optional Tasks <span className="text-[#9CA3AF] font-normal">(P2 — does not block activation)</span>
          </h2>
          {p2Tasks.map(t => (
            <TaskRow key={t.id} task={t} docs={documents} placementId={placementId} persona={persona} />
          ))}
        </div>
      )}

      {/* Activate Placement */}
      <div className="pt-4 border-t border-[#E5E7EB]">
        {isAlreadyActive ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm text-green-700 font-medium">Placement is active.</p>
          </div>
        ) : (
          <>
            {activateError && (
              <div className="mb-3 p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">
                {activateError}
              </div>
            )}
            <button
              type="button"
              onClick={handleActivate}
              disabled={!canActivate || isPending}
              className={`w-full py-3 text-sm font-semibold rounded-lg transition-colors ${
                canActivate
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
              } disabled:opacity-60`}
            >
              {isPending ? 'Activating...' : canActivate ? 'Activate Placement' : 'Complete all P1 tasks to activate'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
