'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, Trash2, AlertTriangle } from 'lucide-react'
import TiptapEditor from '@/components/shared/tiptap-editor'
import AiSmartWritePanel from '@/components/partner/ai-smart-write-panel'
import { saveDraftJD, type GeoRule, type ScoringCriterion } from '@/lib/actions/jd/save-draft-jd'
import { publishJD } from '@/lib/actions/jd/publish-jd'
import type { JdRecord, RecruiterUser } from '@/app/partner/jd/[id]/edit/page'

type FormGeoRule    = GeoRule
type FormCriterion  = ScoringCriterion

interface JdEditFormProps {
  jd:         JdRecord
  recruiters: RecruiterUser[]
}

function toGeoRules(raw: unknown): FormGeoRule[] {
  if (!Array.isArray(raw)) return []
  return raw as FormGeoRule[]
}

function toCriteria(raw: unknown): FormCriterion[] {
  if (!Array.isArray(raw)) return []
  return raw as FormCriterion[]
}

export default function JdEditForm({ jd, recruiters }: JdEditFormProps) {
  const router = useRouter()

  const [title,                 setTitle]                = useState(jd.title)
  const [deptCode,              setDeptCode]             = useState(jd.dept_code             ?? '')
  const [engagementType,        setEngagementType]       = useState(jd.engagement_type       ?? '')
  const [startDate,             setStartDate]            = useState(jd.start_date            ?? '')
  const [endDate,               setEndDate]              = useState(jd.end_date              ?? '')
  const [currency,              setCurrency]             = useState(jd.currency              ?? '')
  const [rateModel,             setRateModel]            = useState(jd.rate_model            ?? '')
  const [billRate,              setBillRate]             = useState(jd.bill_rate != null ? String(jd.bill_rate) : '')
  const [skills,                setSkills]               = useState(jd.skills               ?? '')
  const [workType,              setWorkType]             = useState(jd.work_type             ?? '')
  const [locationCity,          setLocationCity]         = useState(jd.location_city         ?? '')
  const [locationState,         setLocationState]        = useState(jd.location_state        ?? '')
  const [locationCountry,       setLocationCountry]      = useState(jd.location_country      ?? '')
  const [intellimatchThreshold, setIntellimatch]         = useState(jd.intellimatch_threshold ?? 0.7)
  const [screeningRequired,     setScreeningRequired]    = useState(jd.screening_required    ?? false)
  const [assignedRecruiterId,   setAssignedRecruiterId]  = useState(jd.assigned_recruiter_id ?? '')
  const [descriptionHtml,       setDescriptionHtml]      = useState(jd.description_html      ?? '')
  const [geoRules,              setGeoRules]             = useState<FormGeoRule[]>(toGeoRules(jd.geo_rules))
  const [scoringCriteria,       setScoringCriteria]      = useState<FormCriterion[]>(toCriteria(jd.scoring_criteria))

  const [showAiPanel,    setShowAiPanel]    = useState(false)
  const [isPendingSave,  setIsPendingSave]  = useState(false)
  const [isPendingPub,   setIsPendingPub]   = useState(false)
  const [saveError,      setSaveError]      = useState('')
  const [publishError,   setPublishError]   = useState('')
  const [flaggedTerms,   setFlaggedTerms]   = useState<string[]>([])
  const [saveSuccess,    setSaveSuccess]    = useState(false)

  function buildInput() {
    return {
      jdId:                  jd.id,
      title:                 title.trim(),
      deptCode,
      engagementType,
      startDate,
      endDate,
      currency,
      rateModel,
      billRate,
      skills,
      workType,
      locationCity,
      locationState,
      locationCountry,
      intellimatchThreshold,
      screeningRequired,
      geoRules:              geoRules        as GeoRule[],
      assignedRecruiterId,
      descriptionHtml,
      scoringCriteria:       scoringCriteria as ScoringCriterion[],
    }
  }

  async function handleSave() {
    setSaveError('')
    setSaveSuccess(false)
    setIsPendingSave(true)
    const result = await saveDraftJD(buildInput())
    setIsPendingSave(false)
    if (result.error) { setSaveError(result.error); return }
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  async function handlePublish() {
    setPublishError('')
    setFlaggedTerms([])
    setIsPendingPub(true)
    const result = await publishJD(buildInput())
    setIsPendingPub(false)
    if (result.error) {
      setPublishError(result.error)
      if (result.flaggedTerms) setFlaggedTerms(result.flaggedTerms)
      return
    }
    router.push('/partner/jd')
  }

  function addGeoRule() {
    const rule: FormGeoRule = { country: '', state: '', city: '', zipRadius: '', enforcementLevel: 'Soft Warning' }
    setGeoRules(prev => [...prev, rule])
  }

  function updateGeoRule(index: number, field: keyof Omit<FormGeoRule, 'enforcementLevel'> | 'enforcementLevel', value: string) {
    setGeoRules(prev => {
      const next = [...prev]
      const row  = next[index]
      if (!row) return prev
      next[index] = { ...row, [field]: value } as FormGeoRule
      return next
    })
  }

  function removeGeoRule(index: number) {
    setGeoRules(prev => prev.filter((_, i) => i !== index))
  }

  function addCriterion() {
    setScoringCriteria(prev => [...prev, { name: '', weight: 1 }])
  }

  function updateCriterion(index: number, field: keyof FormCriterion, value: string | number) {
    setScoringCriteria(prev => {
      const next = [...prev]
      const row  = next[index]
      if (!row) return prev
      next[index] = { ...row, [field]: value } as FormCriterion
      return next
    })
  }

  function removeCriterion(index: number) {
    setScoringCriteria(prev => prev.filter((_, i) => i !== index))
  }

  const isPublished = jd.status === 'published'
  const isPreDraft  = jd.status === 'pre_draft'

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* Page header */}
      <div className="border-l-4 border-l-[#0F2147] pl-4 py-3 flex items-center justify-between shrink-0 mb-4">
        <div>
          <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
            {isPublished ? 'Published' : isPreDraft ? 'Pre-Draft (Mode C)' : 'Draft'}
          </p>
          <h1 className="text-[22px] font-bold text-[#0F2147]">{title || 'Untitled Job'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiPanel(v => !v)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#D97706] border border-[#D97706] rounded-[6px] hover:bg-[#FEF3C7] transition-colors"
          >
            <Sparkles size={14} />
            AI Smart Write
          </button>
          <button
            onClick={handleSave}
            disabled={isPendingSave || isPublished}
            className="px-4 py-2 text-[13px] font-semibold text-[#374151] border border-[#D1D5DB] rounded-[6px] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPendingSave ? 'Saving…' : saveSuccess ? 'Saved ✓' : 'Save Draft'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPendingPub || isPublished || isPreDraft}
            className="px-5 py-2 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPendingPub ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {saveError && (
        <div className="mb-3 px-4 py-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-[6px] text-[13px] text-[#991B1B] shrink-0">
          {saveError}
        </div>
      )}
      {publishError && (
        <div className="mb-3 px-4 py-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-[6px] shrink-0">
          <p className="text-[13px] text-[#991B1B] font-semibold">{publishError}</p>
          {flaggedTerms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {flaggedTerms.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#FCA5A5] text-[#7F1D1D] text-[11px] font-semibold rounded">
                  <AlertTriangle size={10} />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex flex-1 gap-4 overflow-hidden">

        {/* Main form */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">
                Job Title <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isPublished}
                placeholder="e.g. Senior Software Engineer"
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>

            {/* Dept Code */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Department Code</label>
              <input
                type="text"
                value={deptCode}
                onChange={e => setDeptCode(e.target.value)}
                disabled={isPublished}
                placeholder="e.g. ENG-01"
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>

            {/* Engagement Type */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Engagement Type</label>
              <select
                value={engagementType}
                onChange={e => setEngagementType(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60 appearance-none"
              >
                <option value="">Select type</option>
                <option value="contract">Contract</option>
                <option value="contract_to_hire">Contract to Hire</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">
                Start Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60 appearance-none"
              >
                <option value="">Select currency</option>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            {/* Rate Model */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Rate Model</label>
              <select
                value={rateModel}
                onChange={e => setRateModel(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60 appearance-none"
              >
                <option value="">Select model</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>

            {/* Bill Rate */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Bill Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={billRate}
                onChange={e => setBillRate(e.target.value)}
                disabled={isPublished}
                placeholder="0.00"
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>

            {/* Work Type */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Work Type</label>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60 appearance-none"
              >
                <option value="">Select work type</option>
                <option value="on_site">On-site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">City</label>
              <input
                type="text"
                value={locationCity}
                onChange={e => setLocationCity(e.target.value)}
                disabled={isPublished}
                placeholder="City"
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">State</label>
              <input
                type="text"
                value={locationState}
                onChange={e => setLocationState(e.target.value)}
                disabled={isPublished}
                placeholder="State / Province"
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Country</label>
              <input
                type="text"
                value={locationCountry}
                onChange={e => setLocationCountry(e.target.value)}
                disabled={isPublished}
                placeholder="Country"
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60"
              />
            </div>

            {/* Assigned Recruiter */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Assigned Recruiter</label>
              <select
                value={assignedRecruiterId}
                onChange={e => setAssignedRecruiterId(e.target.value)}
                disabled={isPublished}
                className="w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60 appearance-none"
              >
                <option value="">Unassigned</option>
                {recruiters.map(r => (
                  <option key={r.id} value={r.id}>{r.full_name ?? r.email}</option>
                ))}
              </select>
            </div>

            {/* IntelliMatch Threshold */}
            <div>
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">
                IntelliMatch Threshold ({Math.round(intellimatchThreshold * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={intellimatchThreshold}
                onChange={e => setIntellimatch(parseFloat(e.target.value))}
                disabled={isPublished}
                className="w-full accent-[#0F2147] disabled:opacity-60"
              />
            </div>

            {/* Screening Required */}
            <div className="flex items-center gap-3 pt-6">
              <input
                id="screening-required"
                type="checkbox"
                checked={screeningRequired}
                onChange={e => setScreeningRequired(e.target.checked)}
                disabled={isPublished}
                className="w-4 h-4 rounded border-[#D1D5DB] accent-[#0F2147] disabled:opacity-60"
              />
              <label htmlFor="screening-required" className="text-[13px] font-medium text-[#374151]">
                Screening Required
              </label>
            </div>

            {/* Skills */}
            <div className="md:col-span-2">
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Required Skills</label>
              <textarea
                value={skills}
                onChange={e => setSkills(e.target.value)}
                disabled={isPublished}
                rows={3}
                placeholder="e.g. React, TypeScript, Node.js"
                className="w-full px-3 py-2 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:bg-[#F9FAFB] disabled:opacity-60 resize-none"
              />
            </div>

            {/* Job Description */}
            <div className="md:col-span-2">
              <label className="block text-[13px] font-bold text-[#374151] mb-1.5">Job Description</label>
              <TiptapEditor
                content={descriptionHtml}
                onChange={setDescriptionHtml}
                disabled={isPublished}
              />
            </div>

            {/* Geo Rules */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-bold text-[#374151]">Geo Rules</label>
                {!isPublished && (
                  <button
                    type="button"
                    onClick={addGeoRule}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0F2147] hover:text-[#D97706] transition-colors"
                  >
                    <Plus size={14} />Add Rule
                  </button>
                )}
              </div>
              {geoRules.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF]">No geo rules configured.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {geoRules.map((rule, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 p-3 border border-[#E5E7EB] rounded-[6px] bg-[#F9FAFB]">
                      {(['country', 'state', 'city', 'zipRadius'] as const).map(f => (
                        <input
                          key={f}
                          type="text"
                          value={rule[f]}
                          onChange={e => updateGeoRule(i, f, e.target.value)}
                          placeholder={f === 'zipRadius' ? 'Zip / Radius' : f.charAt(0).toUpperCase() + f.slice(1)}
                          disabled={isPublished}
                          className="h-8 px-2 text-[13px] border border-[#D1D5DB] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:bg-[#F9FAFB] disabled:opacity-60"
                        />
                      ))}
                      <select
                        value={rule.enforcementLevel}
                        onChange={e => updateGeoRule(i, 'enforcementLevel', e.target.value)}
                        disabled={isPublished}
                        className="h-8 px-2 text-[12px] border border-[#D1D5DB] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:opacity-60 appearance-none"
                      >
                        <option value="Soft Warning">Soft Warning</option>
                        <option value="Hard Block">Hard Block</option>
                      </select>
                      {!isPublished && (
                        <button
                          type="button"
                          onClick={() => removeGeoRule(i)}
                          className="flex items-center justify-center text-[#DC2626] hover:text-[#b91c1c] transition-colors"
                          aria-label="Remove geo rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scoring Criteria */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-bold text-[#374151]">Scoring Criteria</label>
                {!isPublished && (
                  <button
                    type="button"
                    onClick={addCriterion}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0F2147] hover:text-[#D97706] transition-colors"
                  >
                    <Plus size={14} />Add Criterion
                  </button>
                )}
              </div>
              {scoringCriteria.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF]">No scoring criteria configured.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {scoringCriteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 border border-[#E5E7EB] rounded-[6px] bg-[#F9FAFB]">
                      <input
                        type="text"
                        value={c.name}
                        onChange={e => updateCriterion(i, 'name', e.target.value)}
                        placeholder="Criterion name"
                        disabled={isPublished}
                        className="flex-1 h-8 px-2 text-[13px] border border-[#D1D5DB] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:bg-[#F9FAFB] disabled:opacity-60"
                      />
                      <label className="text-[12px] text-[#6B7280] shrink-0">Weight</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={c.weight}
                        onChange={e => updateCriterion(i, 'weight', parseInt(e.target.value, 10) || 1)}
                        disabled={isPublished}
                        className="w-16 h-8 px-2 text-[13px] border border-[#D1D5DB] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:bg-[#F9FAFB] disabled:opacity-60"
                      />
                      {!isPublished && (
                        <button
                          type="button"
                          onClick={() => removeCriterion(i)}
                          className="text-[#DC2626] hover:text-[#b91c1c] transition-colors"
                          aria-label="Remove criterion"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* AI Smart Write panel */}
        {showAiPanel && (
          <div className="w-[320px] shrink-0 rounded-[8px] border border-[#E5E7EB] overflow-hidden flex flex-col">
            <AiSmartWritePanel
              currentHtml={descriptionHtml}
              onApply={html => { setDescriptionHtml(html); setShowAiPanel(false) }}
              onClose={() => setShowAiPanel(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
