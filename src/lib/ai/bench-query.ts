import { createClient as createAdminClient } from '@supabase/supabase-js'
import { embedText, vectorToSql } from './embed'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type BenchCandidate = {
  candidate_id:      string
  full_name:         string
  email:             string
  location_city:     string | null
  current_title:     string | null
  years_experience:  number | null
  rate_min:          number | null
  rate_max:          number | null
  bench_status:      string
  availability_date: string | null
  skill_text:        string
  similarity:        number
}

export async function benchQuery(
  jdId:     string,
  tenantId: string,
  limit     = 20
): Promise<BenchCandidate[]> {
  const { data: jd, error: jdError } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('required_skills, title')
    .eq('id', jdId)
    .single()

  if (jdError || !jd) {
    console.error('[FFN][bench-query] JD not found:', jdId)
    return []
  }

  const skillText = jd.required_skills?.trim() ?? jd.title ?? ''
  if (!skillText) {
    console.warn('[FFN][bench-query] JD has no skills text — returning empty bench')
    return []
  }

  let vector: number[]
  try {
    vector = await embedText(skillText)
  } catch (err) {
    console.error('[FFN][bench-query] Embedding failed:', (err as Error).message)
    return []
  }

  const { data, error } = await supabaseAdmin.rpc('bench_query', {
    p_tenant_id: tenantId,
    p_embedding: vectorToSql(vector),
    p_limit:     limit,
  })

  if (error) {
    console.error('[FFN][bench-query] RPC error:', error.message)
    return []
  }

  return (data ?? []) as BenchCandidate[]
}

export async function updateBenchIndex(
  candidateId: string,
  tenantId:    string,
  skillText:   string
): Promise<void> {
  if (!skillText.trim()) {
    console.warn('[FFN][bench-query] Empty skill text for candidate:', candidateId)
    return
  }

  let vector: number[]
  try {
    vector = await embedText(skillText)
  } catch (err) {
    console.error('[FFN][bench-query] Embedding failed:', (err as Error).message)
    return
  }

  await supabaseAdmin
    .from('x_ffn_bench_index')
    .update({ is_current: false })
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)

  const { error } = await supabaseAdmin
    .from('x_ffn_bench_index')
    .insert({
      tenant_id:       tenantId,
      candidate_id:    candidateId,
      skill_text:      skillText.trim(),
      embedding_model: 'text-embedding-3-small',
      embedded_at:     new Date().toISOString(),
      is_current:      true,
      skill_vector:    vectorToSql(vector),
    })

  if (error) {
    console.error('[FFN][bench-query] updateBenchIndex insert error:', error.message)
  }
}
