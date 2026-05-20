'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle,
  Plus, Trash2, ExternalLink, User, Briefcase, Award, FileText, Wrench,
} from 'lucide-react'
import {
  saveCandidate,
  type ProfileInput,
  type SkillInput,
  type CertInput,
  type ExperienceInput,
} from '@/lib/actions/candidates/save-candidate'
import { uploadResume } from '@/lib/actions/candidates/upload-resume'
import { parseResume }  from '@/lib/actions/candidates/parse-resume'

interface CandidateProfileClientProps {
  candidate:  Record<string, unknown>
  skills:     Record<string, unknown>[]
  certs:      Record<string, unknown>[]
  experience: Record<string, unknown>[]
}

type TabId = 'profile' | 'skills' | 'certifications' | 'experience' | 'documents'

type LocalSkill = {
  _key:        string
  skillId:     string
  skillName:   string
  proficiency: string
  years:       string
  isPrimary:   boolean
}

type LocalCert = {
  _key:               string
  certName:           string
  certIssuer:         string
  certId:             string
  issuedDate:         string
  expiryDate:         string
  credlyBadgeId:      string
  verificationStatus: 'self_attested' | 'credly_verified' | 'expired' | 'revoked'
  isVerifying:        boolean
}

type LocalExp = {
  _key:        string
  employer:    string
  role:        string
  startDate:   string
  endDate:     string
  isCurrent:   boolean
  description: string
}

function initProfile(c: Record<string, unknown>): ProfileInput {
  return {
    firstName:         String(c['first_name']         ?? ''),
    lastName:          String(c['last_name']          ?? ''),
    email:             String(c['email']              ?? ''),
    phone:             c['phone']               ? String(c['phone'])               : null,
    locationCity:      c['location_city']       ? String(c['location_city'])       : null,
    availabilityDate:  c['availability_date']   ? String(c['availability_date'])   : null,
    workAuthorization: c['work_authorization']  ? String(c['work_authorization'])  : null,
    yearsExperience:   typeof c['years_experience']   === 'number' ? c['years_experience']   : null,
    currentTitle:      c['current_title']       ? String(c['current_title'])       : null,
    currentEmployer:   c['current_employer']    ? String(c['current_employer'])    : null,
    rateMin:           typeof c['rate_expectation_min'] === 'number' ? c['rate_expectation_min'] : null,
    rateMax:           typeof c['rate_expectation_max'] === 'number' ? c['rate_expectation_max'] : null,
    rateModel:         c['rate_model']          ? String(c['rate_model'])          : null,
    benchStatus:       (c['bench_status'] as 'on_bench' | 'not_on_bench' | 'engaged') ?? 'on_bench',
  }
}

function initSkills(raw: Record<string, unknown>[]): LocalSkill[] {
  return raw.map(s => ({
    _key:        String(s['id'] ?? crypto.randomUUID()),
    skillId:     String((s['x_ffn_skill_taxonomy'] as Record<string, unknown> | null)?.['id'] ?? s['skill_id'] ?? ''),
    skillName:   String((s['x_ffn_skill_taxonomy'] as Record<string, unknown> | null)?.['name'] ?? ''),
    proficiency: String(s['proficiency'] ?? ''),
    years:       s['years'] != null ? String(s['years']) : '',
    isPrimary:   Boolean(s['is_primary']),
  }))
}

function initCerts(raw: Record<string, unknown>[]): LocalCert[] {
  return raw.map(c => ({
    _key:               String(c['id'] ?? crypto.randomUUID()),
    certName:           String(c['cert_name']        ?? ''),
    certIssuer:         String(c['cert_issuer']      ?? ''),
    certId:             String(c['cert_id']          ?? ''),
    issuedDate:         c['issued_date']  ? String(c['issued_date'])  : '',
    expiryDate:         c['expiry_date']  ? String(c['expiry_date'])  : '',
    credlyBadgeId:      String(c['credly_badge_id']  ?? ''),
    verificationStatus: (c['verification_status'] as LocalCert['verificationStatus']) ?? 'self_attested',
    isVerifying:        false,
  }))
}

function initExperience(raw: Record<string, unknown>[]): LocalExp[] {
  return raw.map(e => ({
    _key:        String(e['id'] ?? crypto.randomUUID()),
    employer:    String(e['employer']    ?? ''),
    role:        String(e['role']        ?? ''),
    startDate:   e['start_date'] ? String(e['start_date']) : '',
    endDate:     e['end_date']   ? String(e['end_date'])   : '',
    isCurrent:   Boolean(e['is_current']),
    description: String(e['description'] ?? ''),
  }))
}

export default function CandidateProfileClient({
  candidate,
  skills,
  certs,
  experience,
}: CandidateProfileClientProps) {
  const router      = useRouter()
  const fileRef     = useRef<HTMLInputElement>(null)
  const candidateId = String(candidate['id'] ?? '')

  const [activeTab,    setActiveTab]    = useState<TabId>('profile')
  const [profile,      setProfile]      = useState<ProfileInput>(initProfile(candidate))
  const [localSkills,  setLocalSkills]  = useState<LocalSkill[]>(initSkills(skills))
  const [localCerts,   setLocalCerts]   = useState<LocalCert[]>(initCerts(certs))
  const [localExp,     setLocalExp]     = useState<LocalExp[]>(initExperience(experience))
  const [skillInput,   setSkillInput]   = useState('')
  const [isSaving,     setIsSaving]     = useState(false)
  const [isParsing,    setIsParsing]    = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string>(
    candidate['resume_storage_path'] ? String(candidate['resume_storage_path']) : ''
  )
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  void router

  const inputCls   = 'w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent'
  const labelCls   = 'block text-[13px] font-bold text-[#374151] mb-1.5'
  const selectCls  = inputCls + ' cursor-pointer'
  const sectionCls = 'space-y-5'

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── SKILLS ──────────────────────────────────────────────────────
  function addSkillTag() {
    const name = skillInput.trim()
    if (!name) return
    setLocalSkills(prev => [...prev, {
      _key:        crypto.randomUUID(),
      skillId:     '',
      skillName:   name,
      proficiency: '',
      years:       '',
      isPrimary:   prev.length === 0,
    }])
    setSkillInput('')
  }
  function removeSkill(key: string) {
    setLocalSkills(prev => prev.filter(s => s._key !== key))
  }

  // ── CERTS ────────────────────────────────────────────────────────
  function addCert() {
    setLocalCerts(prev => [...prev, {
      _key: crypto.randomUUID(),
      certName: '', certIssuer: '', certId: '',
      issuedDate: '', expiryDate: '', credlyBadgeId: '',
      verificationStatus: 'self_attested', isVerifying: false,
    }])
  }
  function updateCert(key: string, field: keyof Omit<LocalCert, '_key' | 'isVerifying'>, value: string) {
    setLocalCerts(prev => prev.map(c => c._key === key ? { ...c, [field]: value } as LocalCert : c))
  }
  function removeCert(key: string) {
    setLocalCerts(prev => prev.filter(c => c._key !== key))
  }

  async function verifyCredy(key: string) {
    const cert = localCerts.find(c => c._key === key)
    if (!cert?.credlyBadgeId) return
    setLocalCerts(prev => prev.map(c => c._key === key ? { ...c, isVerifying: true } : c))
    try {
      const res  = await fetch('/api/credly/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ badgeUrl: cert.credlyBadgeId }),
      })
      const data = await res.json() as { status: LocalCert['verificationStatus'] }
      setLocalCerts(prev => prev.map(c =>
        c._key === key ? { ...c, verificationStatus: data.status, isVerifying: false } : c
      ))
    } catch {
      setLocalCerts(prev => prev.map(c => c._key === key ? { ...c, isVerifying: false } : c))
    }
  }

  // ── EXPERIENCE ───────────────────────────────────────────────────
  function addExp() {
    setLocalExp(prev => [...prev, {
      _key: crypto.randomUUID(),
      employer: '', role: '', startDate: '', endDate: '', isCurrent: false, description: '',
    }])
  }
  function updateExp(key: string, field: keyof Omit<LocalExp, '_key'>, value: string | boolean) {
    setLocalExp(prev => prev.map(e => e._key === key ? { ...e, [field]: value } as LocalExp : e))
  }
  function removeExp(key: string) {
    setLocalExp(prev => prev.filter(e => e._key !== key))
  }

  // ── FILE UPLOAD + PARSE ──────────────────────────────────────────
  const handleFileChange = useCallback(async (file: File) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      showToast('Only PDF and DOCX files are accepted.', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be under 10 MB.', 'error')
      return
    }

    setIsParsing(true)

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '')
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

    const uploadResult = await uploadResume(candidateId, file.name, file.type, base64)
    if (uploadResult.error) {
      setIsParsing(false)
      showToast(uploadResult.error, 'error')
      return
    }
    setUploadedPath(uploadResult.storagePath ?? '')

    const parseResult = await parseResume(uploadResult.storagePath ?? '', candidateId)
    setIsParsing(false)

    if (parseResult.error) {
      showToast(`Upload saved but parsing failed: ${parseResult.error}`, 'error')
      return
    }

    const d = parseResult.data!

    if (d.full_name) {
      const parts = d.full_name.split(' ')
      setProfile(prev => ({
        ...prev,
        firstName: parts[0] ?? prev.firstName,
        lastName:  parts.slice(1).join(' ') || prev.lastName,
        email:     d.email ?? prev.email,
        phone:     d.phone ?? prev.phone,
      }))
    }

    if (d.skills.length > 0) {
      setLocalSkills(d.skills.map((name, idx) => ({
        _key:        crypto.randomUUID(),
        skillId:     '',
        skillName:   name,
        proficiency: '',
        years:       '',
        isPrimary:   idx === 0,
      })))
    }

    if (d.certifications.length > 0) {
      setLocalCerts(d.certifications.map(c => ({
        _key:               crypto.randomUUID(),
        certName:           c.name,
        certIssuer:         c.issuer ?? '',
        certId:             '',
        issuedDate:         '',
        expiryDate:         '',
        credlyBadgeId:      '',
        verificationStatus: 'self_attested' as const,
        isVerifying:        false,
      })))
    }

    if (d.experience.length > 0) {
      setLocalExp(d.experience.map(e => ({
        _key:        crypto.randomUUID(),
        employer:    e.employer,
        role:        e.role,
        startDate:   e.start_date  ?? '',
        endDate:     e.end_date    ?? '',
        isCurrent:   !e.end_date,
        description: e.description ?? '',
      })))
    }

    showToast('Resume parsed — review and save each tab.', 'success')
    setActiveTab('profile')
  }, [candidateId])

  // ── SAVE ─────────────────────────────────────────────────────────
  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)

    const skillInputs: SkillInput[] = localSkills.map(s => ({
      skillId:     s.skillId,
      skillName:   s.skillName,
      proficiency: s.proficiency || null,
      years:       s.years ? parseFloat(s.years) : null,
      isPrimary:   s.isPrimary,
    }))

    const certInputs: CertInput[] = localCerts.map(c => ({
      certName:           c.certName,
      certIssuer:         c.certIssuer     || null,
      certId:             c.certId         || null,
      issuedDate:         c.issuedDate     || null,
      expiryDate:         c.expiryDate     || null,
      credlyBadgeId:      c.credlyBadgeId  || null,
      verificationStatus: c.verificationStatus,
    }))

    const expInputs: ExperienceInput[] = localExp.map(e => ({
      employer:    e.employer,
      role:        e.role,
      startDate:   e.startDate              || null,
      endDate:     e.isCurrent ? null : (e.endDate || null),
      isCurrent:   e.isCurrent,
      description: e.description            || null,
    }))

    const result = await saveCandidate(candidateId, profile, skillInputs, certInputs, expInputs)
    setIsSaving(false)

    if (result.error) {
      setSaveError(result.error)
      return
    }
    showToast('Profile saved. Bench index updated.', 'success')
  }

  // ── TAB CONFIG ────────────────────────────────────────────────────
  const TABS: Array<{ id: TabId; label: string; Icon: React.ElementType }> = [
    { id: 'profile',        label: 'Profile',        Icon: User      },
    { id: 'skills',         label: 'Skills',         Icon: Wrench    },
    { id: 'certifications', label: 'Certifications', Icon: Award     },
    { id: 'experience',     label: 'Experience',     Icon: Briefcase },
    { id: 'documents',      label: 'Documents',      Icon: FileText  },
  ]

  return (
    <div className="max-w-[960px] mx-auto pb-28">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[8px] shadow-lg text-white text-[13px] font-medium ${toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/agency/requirements"
          className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151]">
          <ArrowLeft size={14} /> Requirements
        </Link>
        <div>
          <h1 className="text-[22px] font-bold text-[#0F2147]">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            {profile.currentTitle ?? 'Candidate Profile'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === id
                ? 'border-b-2 border-[#0F2147] text-[#0F2147]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className={sectionCls}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-[#DC2626]">*</span></label>
              <input value={profile.firstName}
                onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-[#DC2626]">*</span></label>
              <input value={profile.lastName}
                onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email <span className="text-[#DC2626]">*</span></label>
              <input type="email" value={profile.email}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={profile.phone ?? ''}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value || null }))}
                className={inputCls} placeholder="+44 7700 900000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location City</label>
              <input value={profile.locationCity ?? ''}
                onChange={e => setProfile(p => ({ ...p, locationCity: e.target.value || null }))}
                className={inputCls} placeholder="London" />
            </div>
            <div>
              <label className={labelCls}>Availability Date</label>
              <input type="date" value={profile.availabilityDate ?? ''}
                onChange={e => setProfile(p => ({ ...p, availabilityDate: e.target.value || null }))}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Work Authorisation</label>
            <div className="flex gap-4">
              {['Citizen', 'Visa', 'Right to Work'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px] text-[#374151]">
                  <input type="radio" name="workAuth" value={opt}
                    checked={profile.workAuthorization === opt}
                    onChange={() => setProfile(p => ({ ...p, workAuthorization: opt }))}
                    className="accent-[#0F2147]" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Years Experience</label>
              <input type="number" min={0} max={50}
                value={profile.yearsExperience ?? ''}
                onChange={e => setProfile(p => ({ ...p, yearsExperience: e.target.value ? parseInt(e.target.value, 10) : null }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Current Title</label>
              <input value={profile.currentTitle ?? ''}
                onChange={e => setProfile(p => ({ ...p, currentTitle: e.target.value || null }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bench Status</label>
              <select value={profile.benchStatus}
                onChange={e => setProfile(p => ({ ...p, benchStatus: e.target.value as ProfileInput['benchStatus'] }))}
                className={selectCls}>
                <option value="on_bench">On Bench</option>
                <option value="not_on_bench">Not on Bench</option>
                <option value="engaged">Engaged</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Rate Min (daily)</label>
              <input type="number" min={0} value={profile.rateMin ?? ''}
                onChange={e => setProfile(p => ({ ...p, rateMin: e.target.value ? parseFloat(e.target.value) : null }))}
                className={inputCls} placeholder="350" />
            </div>
            <div>
              <label className={labelCls}>Rate Max (daily)</label>
              <input type="number" min={0} value={profile.rateMax ?? ''}
                onChange={e => setProfile(p => ({ ...p, rateMax: e.target.value ? parseFloat(e.target.value) : null }))}
                className={inputCls} placeholder="700" />
            </div>
            <div>
              <label className={labelCls}>Rate Model</label>
              <select value={profile.rateModel ?? ''}
                onChange={e => setProfile(p => ({ ...p, rateModel: e.target.value || null }))}
                className={selectCls}>
                <option value="">Select</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── SKILLS TAB ── */}
      {activeTab === 'skills' && (
        <div className={sectionCls}>
          <div className="flex flex-wrap gap-1.5 min-h-[36px]">
            {localSkills.map(s => (
              <span key={s._key}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-[12px] font-medium">
                {s.skillName}
                {s.isPrimary && <span className="text-[10px] opacity-60 ml-0.5">★</span>}
                <button type="button" onClick={() => removeSkill(s._key)}
                  aria-label={`Remove ${s.skillName}`}
                  className="hover:text-[#DC2626] ml-0.5">×</button>
              </span>
            ))}
            {localSkills.length === 0 && (
              <p className="text-[13px] text-[#9CA3AF] italic">No skills added yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <input value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkillTag() } }}
              placeholder="Type a skill and press Enter"
              aria-label="Add skill"
              className={`${inputCls} flex-1`} />
            <button type="button" onClick={addSkillTag}
              className="px-4 h-10 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] shrink-0">
              Add
            </button>
          </div>
          <p className="text-[11px] text-[#9CA3AF]">
            ★ = primary skill. Press Enter or comma to add. Skill taxonomy updated on Save.
          </p>
        </div>
      )}

      {/* ── CERTIFICATIONS TAB ── */}
      {activeTab === 'certifications' && (
        <div className={sectionCls}>
          {localCerts.map(cert => (
            <div key={cert._key} className="bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  cert.verificationStatus === 'credly_verified'
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : cert.verificationStatus === 'expired' || cert.verificationStatus === 'revoked'
                      ? 'bg-[#FEE2E2] text-[#991B1B]'
                      : 'bg-[#FEF3C7] text-[#92400E]'
                }`}>
                  {cert.verificationStatus === 'credly_verified' ? '✓ Credly Verified'
                    : cert.verificationStatus === 'expired'       ? 'Expired'
                    : cert.verificationStatus === 'revoked'       ? 'Revoked'
                    : 'Self-Attested'}
                </span>
                <button type="button" onClick={() => removeCert(cert._key)}
                  className="text-[#DC2626] hover:bg-[#FEE2E2] p-1 rounded">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Certification Name <span className="text-[#DC2626]">*</span></label>
                  <input value={cert.certName}
                    onChange={e => updateCert(cert._key, 'certName', e.target.value)}
                    className={inputCls} placeholder="e.g. CIS-ITSM" />
                </div>
                <div>
                  <label className={labelCls}>Issuer</label>
                  <input value={cert.certIssuer}
                    onChange={e => updateCert(cert._key, 'certIssuer', e.target.value)}
                    className={inputCls} placeholder="e.g. ServiceNow" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Issue Date</label>
                  <input type="date" value={cert.issuedDate}
                    onChange={e => updateCert(cert._key, 'issuedDate', e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" value={cert.expiryDate}
                    onChange={e => updateCert(cert._key, 'expiryDate', e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Credly Badge URL (optional)</label>
                <div className="flex gap-2">
                  <input value={cert.credlyBadgeId}
                    onChange={e => updateCert(cert._key, 'credlyBadgeId', e.target.value)}
                    placeholder="https://www.credly.com/badges/..."
                    className={`${inputCls} flex-1`} />
                  <button type="button" onClick={() => void verifyCredy(cert._key)}
                    disabled={!cert.credlyBadgeId || cert.isVerifying}
                    className="px-3 h-10 text-[12px] font-semibold text-white bg-[#0F2147] rounded-[6px] disabled:opacity-40 shrink-0 flex items-center gap-1.5">
                    {cert.isVerifying && <Loader2 size={12} className="animate-spin" />}
                    Verify
                  </button>
                  {cert.credlyBadgeId && (
                    <a href={cert.credlyBadgeId} target="_blank" rel="noopener noreferrer"
                      className="h-10 w-10 flex items-center justify-center border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB]">
                      <ExternalLink size={13} className="text-[#6B7280]" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addCert}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[#0F2147] border border-[#0F2147] rounded-[6px] hover:bg-[#EFF6FF]">
            <Plus size={14} /> Add Certification
          </button>
        </div>
      )}

      {/* ── EXPERIENCE TAB ── */}
      {activeTab === 'experience' && (
        <div className={sectionCls}>
          {localExp.map(exp => (
            <div key={exp._key} className="bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] p-4 space-y-3">
              <div className="flex justify-end">
                <button type="button" onClick={() => removeExp(exp._key)}
                  className="text-[#DC2626] hover:bg-[#FEE2E2] p-1 rounded">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Employer <span className="text-[#DC2626]">*</span></label>
                  <input value={exp.employer}
                    onChange={e => updateExp(exp._key, 'employer', e.target.value)}
                    className={inputCls} placeholder="e.g. DivIHN Integration Inc." />
                </div>
                <div>
                  <label className={labelCls}>Role <span className="text-[#DC2626]">*</span></label>
                  <input value={exp.role}
                    onChange={e => updateExp(exp._key, 'role', e.target.value)}
                    className={inputCls} placeholder="e.g. ServiceNow Developer" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="month" value={exp.startDate}
                    onChange={e => updateExp(exp._key, 'startDate', e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date</label>
                  <input type="month" value={exp.endDate}
                    onChange={e => updateExp(exp._key, 'endDate', e.target.value)}
                    disabled={exp.isCurrent}
                    className={`${inputCls} disabled:opacity-40`} />
                </div>
                <div className="flex items-center gap-2 h-10">
                  <input type="checkbox" id={`current-${exp._key}`}
                    checked={exp.isCurrent}
                    onChange={e => updateExp(exp._key, 'isCurrent', e.target.checked)}
                    className="accent-[#0F2147] w-4 h-4" />
                  <label htmlFor={`current-${exp._key}`}
                    className="text-[13px] text-[#374151] cursor-pointer">
                    Current role
                  </label>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={exp.description}
                  onChange={e => updateExp(exp._key, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-[14px] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
                  placeholder="Key responsibilities and achievements..." />
              </div>
            </div>
          ))}
          <button type="button" onClick={addExp}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[#0F2147] border border-[#0F2147] rounded-[6px] hover:bg-[#EFF6FF]">
            <Plus size={14} /> Add Experience
          </button>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {activeTab === 'documents' && (
        <div className={sectionCls}>
          {isParsing && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="text-[#0F2147] animate-spin" />
              <p className="text-[14px] font-medium text-[#374151]">Parsing resume…</p>
              <p className="text-[13px] text-[#6B7280]">
                Claude is extracting profile data. This takes about 10 seconds.
              </p>
            </div>
          )}

          {!isParsing && (
            <>
              <div
                className="border-2 border-dashed border-[#D1D5DB] rounded-[8px] p-10 text-center cursor-pointer hover:border-[#0F2147] hover:bg-[#F9FAFB] transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) void handleFileChange(file)
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload resume — click or drag and drop"
                onKeyDown={e => { if (e.key === 'Enter') fileRef.current?.click() }}
              >
                <Upload size={32} className="text-[#9CA3AF] mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-[#374151]">
                  Drop your resume here or click to upload
                </p>
                <p className="text-[13px] text-[#9CA3AF] mt-1">
                  PDF or DOCX · Max 10 MB · Claude will auto-populate all tabs
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) void handleFileChange(file)
                  }}
                />
              </div>

              {uploadedPath && (
                <div className="flex items-center gap-3 p-3.5 bg-[#DCFCE7] rounded-[6px] border border-[#BBF7D0]">
                  <CheckCircle2 size={16} className="text-[#16A34A] shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#166534]">Resume uploaded</p>
                    <p className="text-[11px] text-[#166534] opacity-70 truncate">{uploadedPath}</p>
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="text-[12px] text-[#16A34A] font-semibold hover:underline shrink-0">
                    Replace
                  </button>
                </div>
              )}

              {candidate['resume_parsed_at'] && (
                <p className="text-[12px] text-[#9CA3AF]">
                  Last parsed: {new Date(String(candidate['resume_parsed_at'])).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div role="alert" className="mt-4 flex items-start gap-3 p-3.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
          <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#991B1B]">{saveError}</p>
        </div>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] z-40 px-6 py-4 flex items-center justify-between">
        <Link href="/agency/requirements"
          className="text-[13px] text-[#6B7280] hover:text-[#374151]">
          ← Back
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isParsing}
          className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] disabled:opacity-40 transition-colors"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isSaving ? 'Saving…' : 'Save All & Update Bench'}
        </button>
      </div>

    </div>
  )
}
