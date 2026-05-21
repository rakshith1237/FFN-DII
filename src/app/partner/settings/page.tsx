import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { SettingsEditor } from '@/components/settings/settings-editor'
import { ManageBillingButton } from '@/components/billing/manage-billing-button'

const SETTINGS_GROUPS = [
  { group: 'Auth',        keys: ['session_timeout_minutes','max_concurrent_sessions','invite_link_expiry_hours'] },
  { group: 'Audit',       keys: ['audit_retention_days'] },
  { group: 'VMS',         keys: ['mode_d_threshold'] },
  { group: 'Agency',      keys: ['agency_sla_hours','tier_hold_window_hours_default'] },
  { group: 'Headcount',   keys: ['ha_approval_required','ha_approver_role'] },
  { group: 'Override',    keys: ['override_allowed'] },
  { group: 'Scoring',     keys: ['technical_fit_dimension_weight_default','auxiliary_fit_dimension_weight_default','offer_rec_strong_threshold_default','offer_rec_recommend_threshold_default','offer_rec_borderline_threshold_default'] },
  { group: 'Interview',   keys: ['anonymous_panel_mode_default','scorecard_deadline_hours'] },
  { group: 'Bench',       keys: ['bench_first_enforcement'] },
  { group: 'Market Rate', keys: ['market_rate_enabled','market_rate_min_records'] },
  { group: 'Submission',  keys: ['max_submission_quota_per_recruiter','default_submission_quota'] },
  { group: 'RTR',         keys: ['default_rtr_expiry_days'] },
  { group: 'Finance',     keys: ['payment_terms_default'] },
  { group: 'TTF',         keys: ['ttf_benchmark_days_stage_1','ttf_benchmark_days_stage_2','ttf_benchmark_days_stage_3','ttf_benchmark_days_stage_4','ttf_benchmark_days_stage_5'] },
  { group: 'Compliance',  keys: ['co_employment_alert_threshold_days'] },
  { group: 'Placement',   keys: ['auto_rebench_on_conclusion'] },
  { group: 'Timesheet',   keys: ['timesheet_overdue_reminder_days'] },
  { group: 'Notifications', keys: ['sla_breach_notification_hours'] },
  { group: 'Calendar',    keys: ['calendar_gap_threshold_days'] },
  { group: 'Analytics',   keys: ['analytics_export_anonymize_agencies'] },
  { group: 'Onboarding',  keys: ['onboarding_task_template_version','offboarding_task_template_version'] },
]

export default async function PartnerSettingsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (persona !== 'p_super_admin') redirect('/partner/dashboard')

  const db = createAdminClient()
  const allKeys = SETTINGS_GROUPS.flatMap(g => g.keys)

  const { data: tenantRows } = await db
    .from('x_ffn_setting')
    .select('key, value, data_type')
    .eq('tier', 2)
    .eq('tenant_id', tenantId)
    .in('key', allKeys)

  const { data: platformRows } = await db
    .from('x_ffn_setting')
    .select('key, value, data_type')
    .eq('tier', 3)
    .in('key', allKeys)

  const tenantMap   = Object.fromEntries((tenantRows  ?? []).map(r => [r.key, { value: r.value, source: 'tenant'   as const }]))
  const platformMap = Object.fromEntries((platformRows ?? []).map(r => [r.key, { value: r.value, source: 'platform' as const }]))

  const resolved = Object.fromEntries(allKeys.map(k => [
    k,
    tenantMap[k] ?? platformMap[k] ?? { value: '', source: 'platform' as const },
  ]))

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold text-[#0F2147] mb-1">Organisation Settings</h1>
      <p className="text-sm text-[#6B7280] mb-6">Configure platform behaviour for your organisation. Changes take effect immediately.</p>
      <SettingsEditor
        groups={SETTINGS_GROUPS}
        resolved={resolved}
        tenantId={tenantId}
      />
      <ManageBillingButton />
    </div>
  )
}
