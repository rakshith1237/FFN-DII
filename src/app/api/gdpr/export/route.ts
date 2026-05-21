import { NextRequest, NextResponse } from 'next/server'
import { getPersonaCode, getUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

const EXPORTABLE_USER_TABLES: Array<{ table: string; userCol: string }> = [
  { table: 'x_ffn_user_profile',          userCol: 'user_id' },
  { table: 'x_ffn_audit_log',             userCol: 'actor_id' },
  { table: 'x_ffn_notification',          userCol: 'user_id' },
  { table: 'x_ffn_interview_score',       userCol: 'panelist_id' },
  { table: 'x_ffn_offer_approval',        userCol: 'approver_id' },
]

const EXPORTABLE_CANDIDATE_TABLES: Array<{ table: string }> = [
  { table: 'x_ffn_candidate' },
  { table: 'x_ffn_candidate_skill' },
  { table: 'x_ffn_candidate_cert' },
  { table: 'x_ffn_candidate_experience' },
  { table: 'x_ffn_bench_index' },
  { table: 'x_ffn_rtr' },
  { table: 'x_ffn_submission' },
  { table: 'x_ffn_score_audit' },
  { table: 'x_ffn_override_request' },
  { table: 'x_ffn_tenure_summary' },
  { table: 'x_ffn_conclusion_summary' },
]

export async function GET(req: NextRequest) {
  const [persona, requestingUser] = await Promise.all([getPersonaCode(), getUser()])
  if (persona !== 'flex_admin' || !requestingUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const db = createAdminClient()
  const export_: Record<string, unknown[]> = {}

  // User-scoped tables
  for (const { table, userCol } of EXPORTABLE_USER_TABLES) {
    try {
      const { data } = await db.from(table).select('*').eq(userCol, userId)
      export_[table] = data ?? []
    } catch { export_[table] = [] }
  }

  // Candidate tables (look up candidate_id from user_id link)
  const { data: candidateLinks } = await db
    .from('x_ffn_candidate')
    .select('id')
    .eq('user_id', userId)

  const candidateIds = (candidateLinks ?? []).map(c => c.id)

  if (candidateIds.length > 0) {
    for (const { table } of EXPORTABLE_CANDIDATE_TABLES) {
      try {
        const { data } = await db.from(table).select('*').in('candidate_id', candidateIds)
        export_[table] = data ?? []
      } catch { export_[table] = [] }
    }
  }

  // Update last export timestamp
  await db
    .from('x_ffn_user_profile')
    .update({ gdpr_export_last_at: new Date().toISOString() })
    .eq('user_id', userId)

  await db.from('x_ffn_audit_log').insert({
    tenant_id:    null,
    actor_id:     requestingUser.id,
    persona_code: 'flex_admin',
    action:       'gdpr.export.generated',
    entity_type:  'x_ffn_user_profile',
    entity_id:    null,
    new_values:   { targetUserId: userId },
  })

  const json = JSON.stringify({
    exportedAt:  new Date().toISOString(),
    userId,
    requestedBy: requestingUser.id,
    tables:      export_,
  }, null, 2)

  return new NextResponse(json, {
    status:  200,
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="gdpr-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
