// Pure computation — no API calls. Safe to import in client components.

export const TF_FACTORS = [
  'skills_match',
  'cert_match',
  'seniority',
  'platform_depth',
  'xp_relevance',
] as const

export const AF_FACTORS = [
  'location',
  'availability',
  'rate_fit',
  'work_type',
  'references',
] as const

export type TfFactor = typeof TF_FACTORS[number]
export type AfFactor = typeof AF_FACTORS[number]
export type FactorKey = TfFactor | AfFactor

export type FactorValues = Record<FactorKey, number>  // each 0–100

export type XYScore = {
  tf_score:  number   // 0–100
  af_score:  number   // 0–100
  composite: number   // 0–100  (TF×60% + AF×40% per ADR-004)
}

export function defaultFactors(similarityScore: number): FactorValues {
  // Seed TF factors from similarity (bench-first signal), AF neutral at 50
  const tfSeed = Math.round(Math.min(100, similarityScore * 100))
  return {
    skills_match:   tfSeed,
    cert_match:     tfSeed,
    seniority:      50,
    platform_depth: tfSeed,
    xp_relevance:   tfSeed,
    location:       50,
    availability:   50,
    rate_fit:       50,
    work_type:      50,
    references:     50,
  }
}

export function computeXYScore(factors: FactorValues): XYScore {
  const tf = TF_FACTORS.reduce((sum, k) => sum + factors[k], 0) / TF_FACTORS.length
  const af = AF_FACTORS.reduce((sum, k) => sum + factors[k], 0) / AF_FACTORS.length
  return {
    tf_score:  Math.round(tf),
    af_score:  Math.round(af),
    composite: Math.round(tf * 0.6 + af * 0.4),
  }
}

export type ScoredCandidate = {
  candidate_id: string
  full_name:    string
  similarity:   number
  factors:      FactorValues
  score:        XYScore
}

export function buildScoredCandidates(
  benchCandidates: Array<{ candidate_id: string; full_name: string; similarity: number }>
): ScoredCandidate[] {
  return benchCandidates.map(c => {
    const factors = defaultFactors(c.similarity)
    return {
      candidate_id: c.candidate_id,
      full_name:    c.full_name,
      similarity:   c.similarity,
      factors,
      score:        computeXYScore(factors),
    }
  })
}
