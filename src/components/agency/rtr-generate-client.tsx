'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, FileText, AlertCircle, CheckCircle2, Loader2,
  User, Briefcase, Building2, Shield,
} from 'lucide-react'
import { createAndSendRtr } from '@/lib/actions/rtr/create-send-rtr'
import { type DedupResult } from '@/lib/actions/rtr/check-rtr-dedup'

interface CandidateContext {
  id:            string
  full_name:     string
  email:         string
  current_title: string | null
  bench_status:  string
}

interface JdContext {
  id:              string
  title:           string
  status:          string
  location_city:   string | null
  required_skills: string | null
}

interface RtrGenerateClientProps {
  candidate:   CandidateContext
  jd:          JdContext
  partnerName: string
  agencyName:  string
  dedup:       DedupResult
}

export default function RtrGenerateClient({
  candidate, jd, partnerName, agencyName, dedup,
}: RtrGenerateClientProps) {
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent]           = useState(false)
  const [rtrNumber, setRtrNumber] = useState('')
  const [error, setError]         = useState<string | null>(null)

  const expiryDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  async function handleSend() {
    setIsSending(true)
    setError(null)
    const result = await createAndSendRtr(candidate.id, jd.id)
    setIsSending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setRtrNumber(result.rtrNumber ?? '')
    setSent(true)
  }

  // ── DEDUP BLOCKED ───────────────────────────────────────────────
  if (dedup.isDuplicate) {
    return (
      <div className="max-w-[680px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/agency/requirements"
            className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151]">
            <ArrowLeft size={14} /> Requirements
          </Link>
        </div>
        <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-[8px] p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#D97706] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-[16px] font-bold text-[#92400E] mb-1">
                BR-RTR-001: Duplicate RTR Blocked
              </h2>
              <p className="text-[14px] text-[#92400E]">
                An RTR for <strong>{candidate.full_name}</strong> and this Job Description
                already exists within the last 4 months.
              </p>

              <p className="text-[13px] text-[#92400E] mt-2">
                You must wait 4 months from the original RTR date before submitting again.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/agency/requirements"
            className="px-5 py-2.5 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
            ← Back to Requirements
          </Link>
          <Link href="/agency/rtr-inbox"
            className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460]">
            View RTR Inbox →
          </Link>
        </div>
      </div>
    )
  }

  // ── SUCCESS STATE ────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="max-w-[680px] mx-auto text-center py-16">
        <CheckCircle2 size={56} className="text-[#16A34A] mx-auto mb-4" />
        <h2 className="text-[22px] font-bold text-[#0F2147] mb-2">
          RTR Sent for E-Signing
        </h2>
        <p className="text-[14px] text-[#6B7280] mb-1">
          <strong>{candidate.full_name}</strong> will receive a DocuSign email shortly.
        </p>
        {rtrNumber && (
          <p className="text-[13px] text-[#9CA3AF] mb-6">RTR Reference: {rtrNumber}</p>
        )}
        <div className="flex justify-center gap-3">
          <Link href="/agency/requirements"
            className="px-5 py-2.5 text-[13px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
            Back to Requirements
          </Link>
          <Link href="/agency/rtr-inbox"
            className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460]">
            RTR Inbox →
          </Link>
        </div>
      </div>
    )
  }

  // ── JD STATUS GUARD ──────────────────────────────────────────────
  if (jd.status !== 'open') {
    return (
      <div className="max-w-[680px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/agency/requirements"
            className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151]">
            <ArrowLeft size={14} /> Requirements
          </Link>
        </div>
        <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-[8px] p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#DC2626] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-[16px] font-bold text-[#991B1B] mb-1">
                BR-RTR-002: Job Description Not Open
              </h2>
              <p className="text-[14px] text-[#991B1B]">
                This Job Description has status <strong>{jd.status}</strong>.
                RTRs can only be generated for open positions.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN RTR PREVIEW ─────────────────────────────────────────────
  return (
    <div className="max-w-[680px] mx-auto pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-6">
        <Link href="/agency/requirements"
          className="flex items-center gap-1 hover:text-[#374151]">
          <ArrowLeft size={14} /> Requirements
        </Link>
        <span>/</span>
        <span className="text-[#374151] font-medium">Generate RTR</span>
      </div>

      <div className="border-l-4 border-l-[#0F2147] pl-4 mb-8">
        <h1 className="text-[24px] font-bold text-[#0F2147]">Right to Represent</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Review the details below before sending for e-signing via DocuSign.
        </p>
      </div>

      {/* Preview card */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden mb-6">
        {/* Header band */}
        <div className="bg-[#0F2147] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-white opacity-80" />
              <span className="text-white font-semibold text-[15px]">Right to Represent</span>
            </div>
            <span className="text-[#9CA3AF] text-[12px]">
              Valid 4 months from signing
            </span>
          </div>
        </div>

        {/* Details grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <User size={16} className="text-[#6B7280] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">
                  Candidate
                </p>
                <p className="text-[14px] font-semibold text-[#0F2147]">{candidate.full_name}</p>
                {candidate.current_title && (
                  <p className="text-[12px] text-[#6B7280]">{candidate.current_title}</p>
                )}
                <p className="text-[12px] text-[#9CA3AF]">{candidate.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase size={16} className="text-[#6B7280] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">
                  Position
                </p>
                <p className="text-[14px] font-semibold text-[#0F2147]">{jd.title}</p>
                {jd.location_city && (
                  <p className="text-[12px] text-[#6B7280]">📍 {jd.location_city}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#F3F4F6]">
            <div className="flex items-start gap-3">
              <Building2 size={16} className="text-[#6B7280] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">
                  End Client / Partner
                </p>
                <p className="text-[14px] font-semibold text-[#374151]">{partnerName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 size={16} className="text-[#6B7280] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">
                  Representing Agency
                </p>
                <p className="text-[14px] font-semibold text-[#374151]">{agencyName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Representation clause excerpt */}
        <div className="mx-6 mb-6 p-4 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={13} className="text-[#6B7280]" />
            <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
              Representation Clause
            </span>
          </div>
          <p className="text-[13px] text-[#374151] leading-relaxed">
            I, <strong>{candidate.full_name}</strong>, hereby authorise{' '}
            <strong>{agencyName}</strong> to represent me exclusively for the position of{' '}
            <strong>{jd.title}</strong> at <strong>{partnerName}</strong>. This authorisation
            is valid for four (4) months from the date of my signature.
          </p>
        </div>

        {/* Expiry note */}
        <div className="px-6 pb-5">
          <p className="text-[12px] text-[#9CA3AF]">
            Signing link expires: <strong>{expiryDate}</strong> ·
            Candidate will receive a DocuSign email to sign electronically.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert"
          className="mb-4 flex items-start gap-3 p-3.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
          <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] z-40 px-6 py-4 flex items-center justify-between">
        <Link href="/agency/requirements"
          className="text-[13px] text-[#6B7280] hover:text-[#374151]">
          ← Cancel
        </Link>
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 transition-colors"
        >
          {isSending
            ? <><Loader2 size={14} className="animate-spin" /> Sending to DocuSign…</>
            : <><FileText size={14} /> Send for E-Signing</>
          }
        </button>
      </div>
    </div>
  )
}
