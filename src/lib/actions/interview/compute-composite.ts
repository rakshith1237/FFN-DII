import { createAdminClient } from '@/lib/supabase/admin'

export async function computeCompositeScore(
  interviewId: string,
  jdId:        string,
  tenantId:    string
): Promise<void> {
  const db = createAdminClient()

  // Fetch all submitted scores
  const { data: allScores } = await db
    .from('x_ffn_interview_score')
    .select('panelist_id, scores')
    .eq('interview_id', interviewId)
    .eq('is_submitted', true)

  if (!allScores?.length) return

  // Fetch criteria + weights
  const { data: criteria } = await db
    .from('x_ffn_jd_interview_criterion')
    .select('id, weight')
    .eq('jd_id', jdId)
    .eq('is_active', true)

  const criteriaMap: Record<string, number> = {}
  for (const c of criteria ?? []) criteriaMap[c.id] = Number(c.weight)
  const totalWeight = Object.values(criteriaMap).reduce((s, w) => s + w, 0)

  // Per panelist composite: sum(score × weight) / totalWeight
  const panelistComposites: number[] = []
  for (const row of allScores) {
    const scores = row.scores as Record<string, number>
    let weighted = 0
    let usedWeight = 0
    for (const [criterionId, score] of Object.entries(scores)) {
      const w = criteriaMap[criterionId] ?? 1
      weighted   += score * w
      usedWeight += w
    }
    // Normalise to 0-100
    const composite = usedWeight > 0
      ? (weighted / usedWeight) * 10
      : 0
    panelistComposites.push(composite)
  }

  // Average all panelist composites
  const compositeScore = panelistComposites.length > 0
    ? panelistComposites.reduce((s, v) => s + v, 0) / panelistComposites.length
    : 0

  const recommendation: 'strong_recommend'|'recommend'|'borderline'|'do_not_recommend' =
    compositeScore >= 80 ? 'strong_recommend'
    : compositeScore >= 65 ? 'recommend'
    : compositeScore >= 40 ? 'borderline'
    : 'do_not_recommend'

  await db.from('x_ffn_interview').update({
    composite_interview_score: Math.round(compositeScore * 100) / 100,
    offer_recommendation:      recommendation,
    score_computed_at:         new Date().toISOString(),
    status:                    'scored',
  }).eq('id', interviewId)

  console.log(`[computeComposite] interviewId=${interviewId} composite=${compositeScore.toFixed(1)} band=${recommendation}`)
}
