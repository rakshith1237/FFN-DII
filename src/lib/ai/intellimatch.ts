import Anthropic             from '@anthropic-ai/sdk'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ALL_FACTORS, getDefaultFactorMap } from '@/lib/ai/factors'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Types ──────────────────────────────────────────────────────────
export type FactorScore = {
  code:   string
  label:  string
  score:  number   // 0–1
  weight: number   // 0–100
  group:  'tf' | 'af'
}

export type IntelliMatchResult = {
  composite:      number
  tf_score:       number
  af_score:       number
  factors:        FactorScore[]
  explanation:    string
  skipped:        boolean
  skip_reason?:   string
}

// ── Helpers ────────────────────────────────────────────────────────
function tokenize(text: string | null): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .split(/[\s,;/|•\-–()[\]]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
}

function skillOverlap(jdReqs: string, candidateSkillNames: string[]): number {
  const jdTokens   = new Set(tokenize(jdReqs))
  const candTokens = new Set(candidateSkillNames.flatMap(s => tokenize(s)))
  if (jdTokens.size === 0) return 0.5
  let matches = 0
  for (const token of jdTokens) {
    if (candTokens.has(token)) matches++
  }
  return Math.min(matches / jdTokens.size, 1)
}

function snDepth(jdReqs: string, candidateSkillNames: string[]): number {
  const snKeywords = ['servicenow', 'service-now', 'itsm', 'itom', 'hrsd', 'csm',
    'secops', 'itbm', 'spm', 'atf', 'flow designer', 'glide', 'mid server', 'cmdb',
    'discovery', 'virtual agent', 'scoped application', 'ui builder']
  const jdSn   = tokenize(jdReqs).filter(t => snKeywords.some(k => k.includes(t) || t.includes(k))).length
  const candSn = candidateSkillNames.flatMap(n => tokenize(n))
    .filter(t => snKeywords.some(k => k.includes(t) || t.includes(k))).length
  if (jdSn === 0) return 0.5
  return Math.min(candSn / jdSn, 1)
}

function seniorityScore(yearsExp: number | null, jdReqs: string): number {
  const yrs = yearsExp ?? 0
  const jdLower = jdReqs.toLowerCase()
  const needsSenior = /senior|lead|principal|architect|10\+|8\+/i.test(jdLower)
  const needsMid    = /mid|intermediate|3\+|4\+|5\+/i.test(jdLower)
  if (needsSenior) return yrs >= 7 ? 1 : yrs >= 4 ? 0.6 : 0.3
  if (needsMid)    return yrs >= 3 ? 1 : yrs >= 1 ? 0.7 : 0.4
  return yrs >= 1 ? 0.9 : 0.6
}

function availabilityScore(
  benchFrom: string | null,
  availDate: string | null,
  targetStart: string | null
): number {
  const avail = benchFrom ?? availDate
  if (!avail || !targetStart) return 0.5
  const availMs  = new Date(avail).getTime()
  const targetMs = new Date(targetStart).getTime()
  if (isNaN(availMs) || isNaN(targetMs)) return 0.5
  if (availMs <= targetMs) return 1
  const daysLate = (availMs - targetMs) / 86400000
  return Math.max(0, 1 - daysLate / 30)
}

function rateFitScore(
  candRateMax: number | null,
  jdBillMax:   number | null
): number {
  if (!candRateMax || !jdBillMax) return 0.5
  if (candRateMax <= jdBillMax) return 1
  return Math.max(0, jdBillMax / candRateMax)
}

function locationScore(
  jdLocationType: string,
  candCity: string | null,
  jdCity:   string | null
): number {
  const lt = jdLocationType.toLowerCase()
  if (lt === 'remote') return 1
  if (!candCity || !jdCity) return 0.5
  const match = candCity.toLowerCase().includes(jdCity.toLowerCase()) ||
                jdCity.toLowerCase().includes(candCity.toLowerCase())
  return match ? 1 : 0.5
}

function workTypeScore(
  jdLocationType: string,
  candWorkAuth:   string | null
): number {
  const lt = jdLocationType.toLowerCase()
  if (!candWorkAuth) return 0.7
  const auth = candWorkAuth.toLowerCase()
  if (lt === 'remote') return 1
  if (lt === 'onsite' && (auth.includes('citizen') || auth.includes('right'))) return 1
  if (lt === 'hybrid') return 0.85
  return 0.7
}

// ── Agency factor override loader ──────────────────────────────────
async function getFactorsForAgency(
  agencyTenantId: string
): Promise<Record<string, { weight: number; enabled: boolean }>> {
  const { data: overrides } = await supabaseAdmin
    .from('x_ffn_agency_factor_override')
    .select('factor_code, weight, is_enabled')
    .eq('tenant_id', agencyTenantId)

  const defaults = getDefaultFactorMap()
  const result: Record<string, { weight: number; enabled: boolean }> = {}

  for (const factor of Object.values(defaults)) {
    const override = overrides?.find(o => o.factor_code === factor.code)
    result[factor.code] = {
      weight:  override ? Number(override.weight) : factor.weight,
      enabled: override ? override.is_enabled     : factor.enabled,
    }
  }
  return result
}

// ── Main export ────────────────────────────────────────────────────
export async function computeIntelliMatch(
  submissionId: string
): Promise<IntelliMatchResult> {

  const { data: sub } = await supabaseAdmin
    .from('x_ffn_submission')
    .select('id, jd_id, candidate_id, tenant_id, scored_at, partner_tenant_id')
    .eq('id', submissionId)
    .single()

  if (!sub) return { composite: 0, tf_score: 0, af_score: 0,
    factors: [], explanation: '', skipped: true, skip_reason: 'Submission not found' }

  // Immutability guard — FRD §52.5
  if (sub.scored_at) {
    return { composite: 0, tf_score: 0, af_score: 0,
      factors: [], explanation: '', skipped: true,
      skip_reason: `Already scored at ${String(sub.scored_at)}` }
  }

  // Load agency-specific factor weights (with overrides)
  const factorWeights = await getFactorsForAgency(sub.tenant_id ?? '')

  const [jdRes, candRes, skillsRes, certsRes, settingsRes] = await Promise.all([
    supabaseAdmin.from('x_ffn_jd')
      .select('title, requirements, location_city, location_type, bill_rate_max, target_start_date, intellimatch_threshold, tenant_id')
      .eq('id', String(sub.jd_id)).single(),

    supabaseAdmin.from('x_ffn_candidate')
      .select('years_experience, rate_expectation_min, rate_expectation_max, bench_available_from, availability_date, location_city, work_authorization')
      .eq('id', String(sub.candidate_id)).single(),

    supabaseAdmin.from('x_ffn_candidate_skill')
      .select('x_ffn_skill_taxonomy(name)')
      .eq('candidate_id', String(sub.candidate_id))
      .eq('tenant_id', String(sub.tenant_id)),

    supabaseAdmin.from('x_ffn_candidate_cert')
      .select('cert_name, verification_status')
      .eq('candidate_id', String(sub.candidate_id))
      .eq('tenant_id', String(sub.tenant_id)),

    supabaseAdmin.from('x_ffn_setting')
      .select('key, value')
      .eq('tenant_id', String(sub.partner_tenant_id))
      .in('key', ['technical_fit_dimension_weight_default', 'auxiliary_fit_dimension_weight_default']),
  ])

  const jd      = jdRes.data
  const cand    = candRes.data
  const skills  = (skillsRes.data ?? []) as unknown as Array<{ x_ffn_skill_taxonomy: { name: string } | null }>
  const certs   = certsRes.data ?? []

  if (!jd || !cand) {
    return { composite: 0, tf_score: 0, af_score: 0,
      factors: [], explanation: '', skipped: true,
      skip_reason: 'JD or candidate not found' }
  }

  const skillNames = skills
    .map(s => s.x_ffn_skill_taxonomy?.name ?? '')
    .filter(Boolean)

  const jdReqs = String(jd.requirements ?? jd.title ?? '')

  const settings = settingsRes.data ?? []
  const tfWeight = parseInt(settings.find(s => s.key === 'technical_fit_dimension_weight_default')?.value ?? '60', 10)
  const afWeight = parseInt(settings.find(s => s.key === 'auxiliary_fit_dimension_weight_default')?.value ?? '40', 10)

  // Heuristic signals — passed to AI as context
  const heuristicSignals = {
    skill_overlap:  Math.round(skillOverlap(jdReqs, skillNames) * 100),
    seniority:      Math.round(seniorityScore(cand.years_experience, jdReqs) * 100),
    platform_depth: Math.round(snDepth(jdReqs, skillNames) * 100),
    location:       Math.round(locationScore(String(jd.location_type ?? ''), cand.location_city, jd.location_city) * 100),
    availability:   Math.round(availabilityScore(cand.bench_available_from, cand.availability_date, jd.target_start_date) * 100),
    rate_fit:       Math.round(rateFitScore(cand.rate_expectation_max, jd.bill_rate_max) * 100),
    work_type:      Math.round(workTypeScore(String(jd.location_type ?? ''), cand.work_authorization) * 100),
    cert_count:     certs.length,
  }

  // 22-factor context for AI prompt
  const factorContext = ALL_FACTORS.map(f => ({
    code:    f.code,
    label:   f.label,
    group:   f.group,
    weight:  factorWeights[f.code]?.weight  ?? f.weight,
    enabled: factorWeights[f.code]?.enabled ?? f.enabled,
  }))

  // ── AI Scoring: 22 factors + explanation ─────────────────────────
  const aiFactorScores: Record<string, number> = {}
  let explanation = `Candidate evaluated for "${String(jd.title)}" — composite score computed from ${ALL_FACTORS.length} IntelliMatch factors.`

  try {
    const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
    const response  = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are an IntelliMatch scoring engine. Score a candidate against a job description on the following ${ALL_FACTORS.length} factors.
Return ONLY valid JSON with two keys:
- "factors": an object mapping each factor code to a score between 0.0 and 1.0
- "explanation": a 2-sentence professional summary for Hiring Managers

Factor definitions (code, label, group, weight, enabled):
${JSON.stringify(factorContext, null, 2)}

Rules: score disabled factors (enabled=false) as 0. Clamp all scores to [0.0, 1.0]. No extra keys.`,
      messages: [{
        role: 'user',
        content: `Score this candidate for JD "${String(jd.title)}":

Candidate:
- Skills: ${skillNames.join(', ') || 'none listed'}
- Years of experience: ${cand.years_experience ?? 'unknown'}
- Certifications: ${certs.map(c => c.cert_name).join(', ') || 'none'}
- Location: ${cand.location_city ?? 'unknown'}
- Rate expectation max: ${cand.rate_expectation_max ?? 'unknown'}
- Work authorization: ${cand.work_authorization ?? 'unknown'}
- Available from: ${cand.bench_available_from ?? cand.availability_date ?? 'unknown'}

Job Description:
- Requirements: ${jdReqs.slice(0, 500)}
- Location: ${jd.location_city ?? 'unknown'} (${jd.location_type ?? 'unknown'})
- Bill rate max: ${jd.bill_rate_max ?? 'unknown'}
- Target start: ${jd.target_start_date ?? 'unknown'}

Pre-computed heuristic signals (0–100): ${JSON.stringify(heuristicSignals)}
Dimension weights: technical_fit=${tfWeight}% auxiliary_fit=${afWeight}%

Return ONLY valid JSON.`,
      }],
    })
    const block = response.content.find(b => b.type === 'text')
    if (block && block.type === 'text') {
      const parsed = JSON.parse(block.text.trim()) as { factors?: Record<string, number>; explanation?: string }
      if (parsed.factors && typeof parsed.factors === 'object') {
        Object.assign(aiFactorScores, parsed.factors)
      }
      if (parsed.explanation && typeof parsed.explanation === 'string') {
        explanation = parsed.explanation.trim()
      }
    }
  } catch (err) {
    console.error('[FFN][intellimatch] AI scoring failed:', (err as Error).message)
  }

  // ── Build 22-factor score array ───────────────────────────────────
  function weightedAvg(factorList: FactorScore[]): number {
    const totalWeight = factorList.reduce((s, f) => s + f.weight, 0)
    if (totalWeight === 0) return 0
    return factorList.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight
  }

  const allFactors: FactorScore[] = ALL_FACTORS.map(f => {
    const fw      = factorWeights[f.code]
    const enabled = fw?.enabled ?? f.enabled
    const weight  = fw?.weight  ?? f.weight
    const raw     = enabled ? (aiFactorScores[f.code] ?? 0.5) : 0
    return {
      code:   f.code,
      label:  f.label,
      group:  f.group === 'technical_fit' ? 'tf' as const : 'af' as const,
      score:  Math.min(1, Math.max(0, raw)),
      weight,
    }
  })

  const tfFactors = allFactors.filter(f => f.group === 'tf' && (factorWeights[f.code]?.enabled ?? true))
  const afFactors = allFactors.filter(f => f.group === 'af' && (factorWeights[f.code]?.enabled ?? true))

  const tfRaw   = weightedAvg(tfFactors)
  const afRaw   = weightedAvg(afFactors)
  const tfScore  = Math.round(tfRaw * 100)
  const afScore  = Math.round(afRaw * 100)
  const composite = Math.round(tfRaw * (tfWeight / 100) * 100 + afRaw * (afWeight / 100) * 100)

  const snapshot = {
    tf_weight:     tfWeight,
    af_weight:     afWeight,
    tf_score:      tfScore,
    af_score:      afScore,
    composite,
    factors:       allFactors.map(f => ({
      code:   f.code,
      label:  f.label,
      group:  f.group,
      score:  Math.round(f.score * 100),
      weight: f.weight,
    })),
    scored_at:     new Date().toISOString(),
    model_version: 'intellimatch-v0.2',
  }

  // UPDATE submission — only if not already scored (double-guard)
  const { error: updateError } = await supabaseAdmin
    .from('x_ffn_submission')
    .update({
      intellimatch_score:    composite,
      technical_fit_score:   tfScore,
      auxiliary_fit_score:   afScore,
      score_factor_snapshot: snapshot,
      score_explanation:     explanation,
      scored_at:             new Date().toISOString(),
    })
    .eq('id', submissionId)
    .is('scored_at', null)

  if (updateError) {
    console.error('[FFN][intellimatch] Update failed:', updateError.message)
  }

  console.info(`[FFN][intellimatch] Scored submission ${submissionId}: composite=${composite} tf=${tfScore} af=${afScore}`)

  return { composite, tf_score: tfScore, af_score: afScore,
    factors: allFactors, explanation, skipped: false }
}
