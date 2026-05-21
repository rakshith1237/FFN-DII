import { NextRequest, NextResponse } from 'next/server'
import { getPersonaCode } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

const EXPORTABLE_TABLES = [
  'x_ffn_tenant','x_ffn_setting','x_ffn_user_profile','x_ffn_jd',
  'x_ffn_jd_factor_config','x_ffn_jd_broadcast','x_ffn_job_description',
  'x_ffn_candidate','x_ffn_candidate_skill','x_ffn_candidate_cert',
  'x_ffn_candidate_experience','x_ffn_bench_index','x_ffn_rtr',
  'x_ffn_rtr_template','x_ffn_submission','x_ffn_override_request',
  'x_ffn_score_audit','x_ffn_interview','x_ffn_interview_score',
  'x_ffn_offer','x_ffn_offer_approval','x_ffn_offer_approval_config',
  'x_ffn_placement','x_ffn_onboarding_task','x_ffn_offboarding_task',
  'x_ffn_timesheet','x_ffn_invoice','x_ffn_contract_extension',
  'x_ffn_engagement_alert','x_ffn_tenure_summary','x_ffn_conclusion_summary',
  'x_ffn_tier_config','x_ffn_jd_assignment','x_ffn_vms_inbox',
  'x_ffn_headcount_approval','x_ffn_audit_log',
] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tenantId } = await params
  if (!tenantId || tenantId.length < 10) {
    return NextResponse.json({ error: 'Invalid tenantId' }, { status: 400 })
  }

  const db = createAdminClient()
  const export_: Record<string, unknown[]> = {}

  for (const table of EXPORTABLE_TABLES) {
    try {
      const { data } = await db
        .from(table)
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(50000)
      export_[table] = data ?? []
    } catch {
      export_[table] = []
    }
  }

  const json = JSON.stringify({ tenantId, exportedAt: new Date().toISOString(), tables: export_ }, null, 2)

  return new NextResponse(json, {
    status:  200,
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="tenant-${tenantId}-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
