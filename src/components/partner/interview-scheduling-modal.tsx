'use client'
import { useState, useTransition, useEffect } from 'react'
import { X, Calendar, Video, Users, Clock, FileText, Link } from 'lucide-react'
import { scheduleInterview, type ScheduleInterviewInput } from '@/lib/actions/interview/schedule-interview'
import { getTeamMembers, type TeamMember } from '@/lib/actions/interview/get-team-members'

type Props = {
  open:        boolean
  onClose:     () => void
  submissionId: string
  jdId:        string
  candidateId: string
  candidateName: string
  jdTitle:     string
}

const FORMAT_OPTIONS = [
  { value: 'video',     label: 'Video Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'phone',     label: 'Phone' },
] as const

const PLATFORM_OPTIONS = [
  { value: 'teams',       label: 'Microsoft Teams' },
  { value: 'zoom',        label: 'Zoom' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'other',       label: 'Other' },
] as const

const DURATION_OPTIONS = [30, 45, 60, 90] as const

export function InterviewSchedulingModal({
  open, onClose, submissionId, jdId, candidateId, candidateName, jdTitle,
}: Props) {
  const [format,    setFormat]    = useState<'video'|'in_person'|'phone'>('video')
  const [platform,  setPlatform]  = useState<string>('teams')
  const [meetingUrl,setMeetingUrl]= useState('')
  const [date,      setDate]      = useState('')
  const [time,      setTime]      = useState('')
  const [duration,  setDuration]  = useState<30|45|60|90>(60)
  const [notes,     setNotes]     = useState('')
  const [team,      setTeam]      = useState<TeamMember[]>([])
  const [selected,  setSelected]  = useState<TeamMember[]>([])
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    getTeamMembers().then(setTeam)
  }, [open])

  function togglePanelist(member: TeamMember) {
    setSelected(prev =>
      prev.some(p => p.userId === member.userId)
        ? prev.filter(p => p.userId !== member.userId)
        : [...prev, member]
    )
  }

  function handleSubmit() {
    setError(null)
    if (!date || !time) { setError('Please select a date and time'); return }
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
    if (new Date(scheduledAt) <= new Date()) { setError('Interview must be scheduled in the future'); return }
    if (selected.length === 0) { setError('Add at least one panelist'); return }

    const input: ScheduleInterviewInput = {
      submissionId,
      jdId,
      candidateId,
      interviewFormat: format,
      meetingPlatform: format === 'video' ? platform : null,
      meetingUrl:      format === 'video' && meetingUrl ? meetingUrl : null,
      scheduledAt,
      durationMinutes: duration,
      panelists:       selected,
      notes:           notes.trim() || null,
    }

    startTransition(async () => {
      const result = await scheduleInterview(input)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Schedule Interview"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-[480px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#0F2147]">
          <div>
            <h2 className="text-base font-bold text-white">Schedule Interview</h2>
            <p className="text-xs text-blue-200 mt-0.5">{candidateName} · {jdTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-blue-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Interview Format */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
              <Video size={14} /> Interview Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map(f => (
                <button key={f.value} type="button"
                  onClick={() => setFormat(f.value)}
                  className={`py-2 text-sm rounded-lg border font-medium transition-colors ${
                    format === f.value
                      ? 'bg-[#0F2147] text-white border-[#0F2147]'
                      : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-[#9CA3AF]'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform (video only) */}
          {format === 'video' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded-lg bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
                  {PLATFORM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-[#374151] mb-1">
                  <Link size={11} /> Meeting URL
                </label>
                <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                  placeholder="https://teams.microsoft.com/..."
                  className="w-full h-9 px-2 text-xs border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
              </div>
            </div>
          )}

          {/* Date + Time */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
              <Calendar size={14} /> Date &amp; Time
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
              <Clock size={14} /> Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map(d => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`py-2 text-sm rounded-lg border font-medium transition-colors ${
                    duration === d
                      ? 'bg-[#0F2147] text-white border-[#0F2147]'
                      : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-[#9CA3AF]'
                  }`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* Panelists */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
              <Users size={14} /> Panelists
              {selected.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#0F2147] text-white rounded-full">{selected.length}</span>
              )}
            </label>
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {team.length === 0 ? (
                <p className="p-3 text-xs text-[#9CA3AF] text-center">Loading team members...</p>
              ) : (
                team.map(member => {
                  const isSelected = selected.some(p => p.userId === member.userId)
                  return (
                    <button key={member.userId} type="button"
                      onClick={() => togglePanelist(member)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-[#F3F4F6] last:border-0 text-left transition-colors ${
                        isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F9FAFB]'
                      }`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#0F2147] border-[#0F2147]' : 'border-[#D1D5DB]'
                      }`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#374151]">{member.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{member.persona}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
              <FileText size={14} /> Notes <span className="text-[#9CA3AF] font-normal">(optional)</span>
            </label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any specific areas to focus on, candidate context..."
              className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          {error && (
            <div className="mb-3 p-2.5 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-xs text-[#991B1B]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 p-2.5 bg-green-50 border-l-4 border-green-500 rounded text-xs text-green-700">
              Interview scheduled. Briefing emails sent.
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={isPending || success}
              className="flex-1 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
              {isPending ? 'Scheduling...' : 'Schedule Interview'}
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 border border-[#D1D5DB] text-sm rounded-lg hover:bg-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
