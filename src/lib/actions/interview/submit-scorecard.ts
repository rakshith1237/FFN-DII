'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { computeCompositeScore } from './compute-composite'
import { revalidatePath }       from 'next/cache'

export type ScorecardInput = {
  interviewId: string
  scores:      Record<string, number>  // { criterionId: 0-10 }
  notes:       string | null
}

export async function submitScorecard(
  input: ScorecardInput
): Promise<{ error: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!tenantId || !user) return { error: 'Unauthorized' }

  // Scores must be 0-10
  for (const [key, val] of Object.entries(input.scores)) {
    if (typeof val !== 'number' || val < 0 || val > 10) {
      return { error: `Score for ${key} must be between 0 and 10` }
    }
  }

  const db = createAdminClient()

  // Fetch interview and verify panelist membership
  const { data: interview } = await db
    .from('x_ffn_interview')
    .select('id, tenant_id, jd_id, panelists, panelists_total_count, panelists_submitted_count, anonymous_panel_mode, status')
    .eq('id', input.interviewId)
    .maybeSingle()

  if (!interview) return { error: 'Interview not found' }
  if (interview.status === 'scored') return { error: 'Interview already scored' }

  // Verify panelist is in the panelists JSONB array
  const panelists = (interview.panelists ?? []) as { userId: string; name: string; email: string }[]
  const isPanelist = panelists.some(p => p.userId === user.id)
  if (!isPanelist && persona !== 'flex_admin') {
    return { error: 'You are not listed as a panelist for this interview' }
  }

  // Check if already submitted
  const { data: existing } = await db
    .from('x_ffn_interview_score')
    .select('id, is_submitted')
    .eq('interview_id', input.interviewId)
    .eq('panelist_id', user.id)
    .maybeSingle()

  if (existing?.is_submitted) return { error: 'You have already submitted your scorecard' }

  // Map recommendation from average score
  const scoreValues = Object.values(input.scores)
  const avgScore = scoreValues.length > 0
    ? scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length * 10
    : 0

  const recommendation: 'strong_recommend'|'recommend'|'borderline'|'do_not_recommend' =
    avgScore >= 80 ? 'strong_recommend'
    : avgScore >= 65 ? 'recommend'
    : avgScore >= 40 ? 'borderline'
    : 'do_not_recommend'

  if (existing) {
    await db.from('x_ffn_interview_score').update({
      scores:       input.scores,
      notes:        input.notes,
      recommendation,
      is_submitted: true,
      submitted_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await db.from('x_ffn_interview_score').insert({
      tenant_id:    interview.tenant_id,
      interview_id: input.interviewId,
      panelist_id:  user.id,
      scores:       input.scores,
      notes:        input.notes,
      recommendation,
      is_submitted: true,
      submitted_at: new Date().toISOString(),
    })
  }

  // Increment submitted count
  const newSubmittedCount = (interview.panelists_submitted_count ?? 0) + 1
  await db.from('x_ffn_interview').update({
    panelists_submitted_count: newSubmittedCount,
  }).eq('id', input.interviewId)

  // Notify P-HM
  await fireNotification('INTERVIEW_SCORECARD_SUBMITTED', interview.tenant_id, {
    candidateName: '',
    interviewId:   input.interviewId,
  })

  // Compute composite if all submitted
  if (newSubmittedCount >= (interview.panelists_total_count ?? 1)) {
    await computeCompositeScore(input.interviewId, interview.jd_id, interview.tenant_id)
  }

  revalidatePath(`/agency/interviews/${input.interviewId}/scorecard`)
  return { error: null }
}
