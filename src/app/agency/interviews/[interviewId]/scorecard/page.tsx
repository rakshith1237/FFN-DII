import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { ScorecardForm }       from '@/components/agency/scorecard-form'

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ interviewId: string }>
}) {
  const { interviewId } = await params
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!tenantId || !user) redirect('/auth/login')

  const db = createAdminClient()

  const { data: interview } = await db
    .from('x_ffn_interview')
    .select(`
      id, status, scheduled_at, duration_minutes, interview_format,
      panelists, panelists_total_count, panelists_submitted_count,
      anonymous_panel_mode, composite_interview_score, offer_recommendation,
      jd_id,
      x_ffn_jd!inner ( title, number ),
      x_ffn_candidate!inner ( first_name, last_name )
    `)
    .eq('id', interviewId)
    .maybeSingle()

  if (!interview) redirect('/agency/dashboard')

  // Verify current user is a panelist
  const panelists = (interview.panelists ?? []) as { userId: string; name: string; email: string }[]
  const isPanelist = panelists.some(p => p.userId === user.id)
  if (!isPanelist && persona !== 'flex_admin') redirect('/agency/dashboard')

  // Fetch criteria for this JD
  const { data: criteria } = await db
    .from('x_ffn_jd_interview_criterion')
    .select('id, criterion_text, weight, sort_order')
    .eq('jd_id', interview.jd_id)
    .eq('is_active', true)
    .order('sort_order')

  // Fetch own existing scores
  const { data: myScore } = await db
    .from('x_ffn_interview_score')
    .select('scores, notes, is_submitted, recommendation')
    .eq('interview_id', interviewId)
    .eq('panelist_id', user.id)
    .maybeSingle()

  // Fetch all scores (only if anonymous mode off OR all submitted)
  const allSubmitted = (interview.panelists_submitted_count ?? 0) >= (interview.panelists_total_count ?? 1)
  let allScores: { panelistName: string; scores: Record<string, number>; recommendation: string }[] = []

  if (!interview.anonymous_panel_mode || allSubmitted) {
    const { data: submitted } = await db
      .from('x_ffn_interview_score')
      .select('panelist_id, scores, recommendation')
      .eq('interview_id', interviewId)
      .eq('is_submitted', true)

    allScores = (submitted ?? []).map(s => {
      const panelist = panelists.find(p => p.userId === s.panelist_id)
      return {
        panelistName: panelist?.name ?? 'Panelist',
        scores:       (s.scores ?? {}) as Record<string, number>,
        recommendation: s.recommendation ?? '',
      }
    })
  }

  const jd        = interview.x_ffn_jd as unknown as { title: string; number: string }
  const candidate = interview.x_ffn_candidate as unknown as { first_name: string; last_name: string }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Interview Scorecard</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {candidate.first_name} {candidate.last_name} · {jd.title} ({jd.number})
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-[#6B7280]">
            {new Date(interview.scheduled_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          <span className="text-xs text-[#9CA3AF]">·</span>
          <span className="text-xs text-[#6B7280]">
            {interview.panelists_submitted_count}/{interview.panelists_total_count} submitted
          </span>
          {interview.anonymous_panel_mode && !allSubmitted && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              Anonymous until all submit
            </span>
          )}
        </div>
      </div>

      {interview.status === 'scored' && interview.composite_interview_score !== null && (
        <div className="mb-6 p-4 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg">
          <p className="text-sm font-semibold text-[#4F46E5]">
            Composite Score: {Number(interview.composite_interview_score).toFixed(1)} / 100
          </p>
          <p className="text-xs text-[#6366F1] mt-0.5 capitalize">
            Recommendation: {interview.offer_recommendation?.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      <ScorecardForm
        interviewId={interviewId}
        criteria={criteria ?? []}
        existingScores={(myScore?.scores ?? {}) as Record<string, number>}
        existingNotes={myScore?.notes ?? ''}
        alreadySubmitted={myScore?.is_submitted ?? false}
        allScores={allScores}
        showAllScores={!interview.anonymous_panel_mode || allSubmitted}
        interviewStatus={interview.status}
      />
    </div>
  )
}
