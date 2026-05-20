import Anthropic             from '@anthropic-ai/sdk'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

  const [jdRes, candRes, skillsRes, certsRes, factorRes, settingsRes] = await Promise.all([
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

    supabaseAdmin.from('x_ffn_jd_factor_config')
      .select('factor_code, weight')
      .eq('jd_id', String(sub.jd_id))
      .eq('is_active', true),

    supabaseAdmin.from('x_ffn_setting')
      .select('key, value')
      .eq('tenant_id', String(sub.partner_tenant_id))
      .in('key', ['technical_fit_dimension_weight_default', 'auxiliary_fit_dimension_weight_default']),
  ])

  const jd      = jdRes.data
  const cand    = candRes.data
  const skills  = (skillsRes.data ?? []) as unknown as Array<{ x_ffn_skill_taxonomy: { name: string } | null }>
  const certs   = certsRes.data ?? []
  const factors = factorRes.data ?? []

  if (!jd || !cand) {
    return { composite: 0, tf_score: 0, af_score: 0,
      factors: [], explanation: '', skipped: true,
      skip_reason: 'JD or candidate not found' }
  }

  const skillNames = skills
    .map(s => s.x_ffn_skill_taxonomy?.name ?? '')
    .filter(Boolean)

  const jdReqs = String(jd.requirements ?? jd.title ?? '')

  function getWeight(code: string, defaultVal: number): number {
    const f = factors.find(x => x.factor_code === code)
    return f ? Number(f.weight) : defaultVal
  }

  // ── Technical Fit ─────────────────────────────────────────────
  const tfFactors: FactorScore[] = [
    {
      code: 'skills_match', label: 'Skills Match', group: 'tf',
      score: skillOverlap(jdReqs, skillNames),
      weight: getWeight('skills_match', 20),
    },
    {
      code: 'cert_match', label: 'Certification Match', group: 'tf',
      score: certs.length > 0 ? Math.min(certs.length / 2, 1) : 0.3,
      weight: getWeight('cert_match', 20),
    },
    {
      code: 'seniority', label: 'Seniority Level', group: 'tf',
      score: seniorityScore(cand.years_experience, jdReqs),
      weight: getWeight('seniority', 20),
    },
    {
      code: 'platform_depth', label: 'Platform Depth', group: 'tf',
      score: snDepth(jdReqs, skillNames),
      weight: getWeight('platform_depth', 20),
    },
    {
      code: 'xp_relevance', label: 'Experience Relevance', group: 'tf',
      score: Math.min((cand.years_experience ?? 0) / 15, 1),
      weight: getWeight('xp_relevance', 20),
    },
  ]

  // ── Auxiliary Fit ─────────────────────────────────────────────
  const afFactors: FactorScore[] = [
    {
      code: 'location', label: 'Location Fit', group: 'af',
      score: locationScore(String(jd.location_type), cand.location_city, jd.location_city),
      weight: getWeight('location', 20),
    },
    {
      code: 'availability', label: 'Availability', group: 'af',
      score: availabilityScore(cand.bench_available_from, cand.availability_date, jd.target_start_date),
      weight: getWeight('availability', 20),
    },
    {
      code: 'rate_fit', label: 'Rate Fit', group: 'af',
      score: rateFitScore(cand.rate_expectation_max, jd.bill_rate_max),
      weight: getWeight('rate_fit', 20),
    },
    {
      code: 'work_type', label: 'Work Type Match', group: 'af',
      score: workTypeScore(String(jd.location_type), cand.work_authorization),
      weight: getWeight('work_type', 20),
    },
    {
      code: 'references', label: 'References', group: 'af',
      score: 0.5,
      weight: getWeight('references', 20),
    },
  ]

  function weightedAvg(factorList: FactorScore[]): number {
    const totalWeight = factorList.reduce((s, f) => s + f.weight, 0)
    if (totalWeight === 0) return 0
    return factorList.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight
  }

  const tfRaw = weightedAvg(tfFactors)
  const afRaw = weightedAvg(afFactors)

  const settings = settingsRes.data ?? []
  const tfWeight = parseInt(settings.find(s => s.key === 'technical_fit_dimension_weight_default')?.value ?? '60', 10)
  const afWeight = parseInt(settings.find(s => s.key === 'auxiliary_fit_dimension_weight_default')?.value ?? '40', 10)

  const tfScore    = Math.round(tfRaw * 100)
  const afScore    = Math.round(afRaw * 100)
  const composite  = Math.round(tfRaw * (tfWeight / 100) * 100 + afRaw * (afWeight / 100) * 100)
  const allFactors = [...tfFactors, ...afFactors]

  const topTF = [...tfFactors].sort((a, b) => (b.score * b.weight) - (a.score * a.weight)).slice(0, 2)
  const topAF = [...afFactors].sort((a, b) => (b.score * b.weight) - (a.score * a.weight)).slice(0, 2)

  const tfDesc = topTF.map(f => `${f.label}: ${Math.round(f.score * 100)}%`).join(', ')
  const afDesc = topAF.map(f => `${f.label}: ${Math.round(f.score * 100)}%`).join(', ')

  let explanation = `Technical Fit ${tfScore}/100 driven by ${tfDesc}. Auxiliary Fit ${afScore}/100 driven by ${afDesc}.`
  try {
    const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
    const response  = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 150,
      system:     'You write 2-sentence IntelliMatch score explanations for Hiring Managers. Be concise, professional, and insight-driven. No bullet points.',
      messages: [{
        role: 'user',
        content: `Explain this IntelliMatch score for JD "${String(jd.title)}": Technical Fit ${tfScore}/100 (${tfDesc}). Auxiliary Fit ${afScore}/100 (${afDesc}). Composite ${composite}/100.`,
      }],
    })
    const block = response.content.find(b => b.type === 'text')
    if (block && block.type === 'text') explanation = block.text.trim()
  } catch (err) {
    console.error('[FFN][intellimatch] Claude explanation failed:', (err as Error).message)
  }

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
    model_version: 'intellimatch-v0.1',
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
