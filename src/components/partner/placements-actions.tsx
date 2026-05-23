'use client'
import { useState } from 'react'
import { ConcludePlacementModal } from './conclude-placement-modal'
import Link from 'next/link'

export function PlacementsActions({
  placementId, candidateName, jdTitle, endDate, startDate,
}: {
  placementId:   string
  candidateName: string
  jdTitle:       string
  endDate:       string | null
  startDate:     string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Link href="/partner/extensions" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors whitespace-nowrap">Extend</Link>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors whitespace-nowrap"
      >
        Conclude
      </button>
      <ConcludePlacementModal
        open={open}
        onClose={() => setOpen(false)}
        placementId={placementId}
        candidateName={candidateName}
        jdTitle={jdTitle}
        endDate={endDate}
        startDate={startDate}
      />
    </>
  )
}
