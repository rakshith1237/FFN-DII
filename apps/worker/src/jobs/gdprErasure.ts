import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// All tables + PII fields to nullify per user
const USER_PII_ERASURES: Array<{ table: string; userCol: string; piiFields: Record<string, string> }> = [
  {
    table:   'x_ffn_user_profile',
    userCol: 'user_id',
    piiFields: { full_name: 'GDPR_ERASED', email: 'gdpr-erased@deleted.invalid' },
  },
  {
    table:   'x_ffn_audit_log',
    userCol: 'actor_id',
    piiFields: { ip_address: null as unknown as string, user_agent: 'GDPR_ERASED' },
  },
]

const CANDIDATE_PII_ERASURES: Array<{ table: string; piiFields: Record<string, string | null> }> = [
  {
    table: 'x_ffn_candidate',
    piiFields: {
      first_name:    'GDPR_ERASED',
      last_name:     'GDPR_ERASED',
      email:         'gdpr-erased@deleted.invalid',
      phone:         null,
      linkedin_url:  null,
      resume_storage_path: null,
      current_employer:    'GDPR_ERASED',
      work_authorization:  null,
    },
  },
  {
    table:     'x_ffn_candidate_experience',
    piiFields: { employer: 'GDPR_ERASED', description: null },
  },
]

export async function runGdprErasure(data: {
  userId:      string
  tenantId:    string | null
  requestedBy: string
  reason:      string
  requestedAt: string
}): Promise<{ erased: number; errors: string[] }> {
  const supabase = db()
  let erased = 0
  const errors: string[] = []

  // Erase user-scoped PII
  for (const { table, userCol, piiFields } of USER_PII_ERASURES) {
    try {
      const { error } = await supabase
        .from(table)
        .update(piiFields)
        .eq(userCol, data.userId)
      if (error) errors.push(`${table}: ${error.message}`)
      else erased++
    } catch (err) {
      errors.push(`${table}: ${String(err)}`)
    }
  }

  // Find candidate records linked to this user
  const { data: candidates } = await supabase
    .from('x_ffn_candidate')
    .select('id')
    .eq('user_id', data.userId)

  const candidateIds = (candidates ?? []).map(c => c.id as string)

  if (candidateIds.length > 0) {
    for (const { table, piiFields } of CANDIDATE_PII_ERASURES) {
      try {
        const { error } = await supabase
          .from(table)
          .update(piiFields)
          .in('candidate_id', candidateIds)
        if (error) errors.push(`${table}: ${error.message}`)
        else erased++
      } catch (err) {
        errors.push(`${table}: ${String(err)}`)
      }
    }

    // Mark resume deleted in storage (nullified in candidate table above)
    // Erase bench_index skill_text (may contain PII)
    try {
      await supabase
        .from('x_ffn_bench_index')
        .update({ skill_text: 'GDPR_ERASED', skill_vector: null })
        .in('candidate_id', candidateIds)
      erased++
    } catch (err) {
      errors.push(`x_ffn_bench_index: ${String(err)}`)
    }
  }

  // Mark erasure complete
  await supabase
    .from('x_ffn_user_profile')
    .update({ gdpr_erasure_completed_at: new Date().toISOString() })
    .eq('user_id', data.userId)

  // Audit log
  await supabase.from('x_ffn_audit_log').insert({
    tenant_id:    data.tenantId,
    actor_id:     data.requestedBy,
    persona_code: 'flex_admin',
    action:       'gdpr.erasure.completed',
    entity_type:  'x_ffn_user_profile',
    entity_id:    null,
    new_values:   { userId: data.userId, tablesErased: erased, errors },
  })

  console.log(`[gdprErasure] userId=${data.userId} erased=${erased} errors=${errors.length}`)
  return { erased, errors }
}
