'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { CheckCircle2, AlertCircle, Loader2, GripVertical, Building2 } from 'lucide-react'
import { updateTierConfig, type TierConfigInput } from '@/lib/actions/tier/update-tier-config'
import { type AgencyTenant, type TierConfig } from '@/lib/types/broadcast'

interface TierConfigClientProps {
  agencies:      AgencyTenant[]
  currentConfig: TierConfig[]
  tenantId:      string
}

type BucketId = 'unassigned' | '1' | '2' | '3'

type AgencyWithTier = AgencyTenant & { bucketId: BucketId }

function TierBucket({
  id, label, color, holdHours, onHoldChange, children,
}: {
  id:           BucketId
  label:        string
  color:        string
  holdHours:    number | null
  onHoldChange: (val: number | null) => void
  children:     ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[180px] rounded-[8px] border-2 border-dashed transition-colors p-4 ${
        isOver ? 'border-[#0F2147] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-[#F9FAFB]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold ${color}`}>{label}</span>
        {id !== 'unassigned' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#6B7280]">Hold window:</span>
            <input
              type="number"
              min={1}
              max={168}
              value={holdHours ?? ''}
              onChange={e => onHoldChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              placeholder="hrs"
              className="w-16 h-7 px-2 text-[12px] border border-[#D1D5DB] rounded-[4px] text-center focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              aria-label={`${label} hold window hours`}
            />
            <span className="text-[11px] text-[#6B7280]">hrs</span>
          </div>
        )}
      </div>
      <div className="space-y-2 min-h-[80px]">
        {children}
      </div>
      {id === 'unassigned' && (
        <p className="text-[11px] text-[#9CA3AF] mt-2 italic">
          Drag agencies here to remove from tiers
        </p>
      )}
    </div>
  )
}

function AgencyCard({ agency }: { agency: AgencyWithTier }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: agency.id,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2.5 bg-white rounded-[6px] border border-[#E5E7EB] cursor-grab select-none transition-opacity ${
        isDragging ? 'opacity-40' : 'hover:border-[#0F2147] hover:shadow-sm'
      }`}
    >
      <GripVertical size={14} className="text-[#D1D5DB] shrink-0" />
      <Building2 size={13} className="text-[#6B7280] shrink-0" />
      <span className="text-[13px] font-medium text-[#374151] truncate">{agency.name}</span>
    </div>
  )
}

const BUCKETS: { id: BucketId; label: string; color: string }[] = [
  { id: 'unassigned', label: 'Unassigned', color: 'bg-[#F3F4F6] text-[#6B7280]' },
  { id: '1',          label: 'Tier 1',     color: 'bg-[#0F2147] text-white' },
  { id: '2',          label: 'Tier 2',     color: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  { id: '3',          label: 'Tier 3',     color: 'bg-[#CCFBF1] text-[#0F766E]' },
]

export default function TierConfigClient({ agencies, currentConfig }: TierConfigClientProps) {
  function initAgencies(): AgencyWithTier[] {
    return agencies.map(a => {
      const config = currentConfig.find(c => c.agency_tenant_id === a.id)
      return { ...a, bucketId: config ? (String(config.tier_number) as BucketId) : 'unassigned' }
    })
  }

  const [items, setItems]             = useState<AgencyWithTier[]>(initAgencies)
  const [holdHours, setHoldHours]     = useState<Record<string, number | null>>({
    '1': currentConfig.find(c => c.tier_number === 1)?.hold_window_hours ?? 24,
    '2': currentConfig.find(c => c.tier_number === 2)?.hold_window_hours ?? 24,
    '3': null,
  })
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [isSaving, setIsSaving]       = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeAgency = items.find(i => i.id === activeId)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const overBucket = String(over.id) as BucketId
    setItems(prev => prev.map(item =>
      item.id === String(active.id) ? { ...item, bucketId: overBucket } : item
    ))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const configs: TierConfigInput = items
      .filter(i => i.bucketId !== 'unassigned')
      .map(i => {
        const hh = holdHours[i.bucketId]
        return {
          tier_number:       parseInt(i.bucketId, 10) as 1 | 2 | 3,
          agency_tenant_id:  i.id,
          hold_window_hours: i.bucketId === '3' ? null : (hh ?? null),
        }
      })

    const result = await updateTierConfig(configs)
    setIsSaving(false)
    if (result.error) { setSaveError(result.error); return }
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-24">
      {/* Page header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-2 mb-8">
        <h1 className="text-[24px] font-bold text-[#0F2147]">Agency Tier Configuration</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Drag agencies into tiers. Tier 1 receives JDs first.
          Set hold windows (hours) before the next tier is notified.
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {BUCKETS.map(bucket => {
            const bucketHH = holdHours[bucket.id]
            return (
              <TierBucket
                key={bucket.id}
                id={bucket.id}
                label={bucket.label}
                color={bucket.color}
                holdHours={bucket.id === 'unassigned' ? null : (bucketHH ?? null)}
                onHoldChange={val => setHoldHours(prev => ({ ...prev, [bucket.id]: val }))}
              >
                {items
                  .filter(i => i.bucketId === bucket.id)
                  .map(agency => (
                    <AgencyCard key={agency.id} agency={agency} />
                  ))
                }
                {items.filter(i => i.bucketId === bucket.id).length === 0 && (
                  <p className="text-[12px] text-[#D1D5DB] text-center py-6">
                    Drop agencies here
                  </p>
                )}
              </TierBucket>
            )
          })}
        </div>

        <DragOverlay>
          {activeAgency && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-[6px] border border-[#0F2147] shadow-lg cursor-grabbing">
              <GripVertical size={14} className="text-[#D1D5DB]" />
              <Building2 size={13} className="text-[#6B7280]" />
              <span className="text-[13px] font-medium text-[#374151]">{activeAgency.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Errors and success */}
      {saveError && (
        <div role="alert" className="mt-6 flex items-start gap-3 p-3.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
          <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#991B1B]">{saveError}</p>
        </div>
      )}
      {saveSuccess && (
        <div role="status" className="mt-6 flex items-center gap-2 p-3.5 bg-[#DCFCE7] border-l-4 border-[#16A34A] rounded-[6px]">
          <CheckCircle2 size={16} className="text-[#16A34A]" />
          <p className="text-[13px] font-semibold text-[#166534]">Tier configuration saved.</p>
        </div>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] z-40 px-6 py-4 flex items-center justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isSaving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
