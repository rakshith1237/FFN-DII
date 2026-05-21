import { getPersonaCode } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { JobsTable } from '@/components/flexadmin/jobs-table'

const QUEUE_DEFS = [
  { name: 'score_submission',      label: 'Score Submission',      type: 'on-demand' },
  { name: 'parse_vms_email',       label: 'Parse VMS Email',       type: 'on-demand' },
  { name: 'cws_fetch',             label: 'CWS API Fetch',         type: 'on-demand' },
  { name: 'contract_end_alert',    label: 'Contract End Alert',    type: 'daily cron' },
  { name: 'sla_monitor',           label: 'SLA Monitor',           type: 'hourly cron' },
  { name: 'bench_refresh',         label: 'Bench Index Refresh',   type: 'on-demand' },
  { name: 'send_notification',     label: 'Send Notification',     type: 'on-demand' },
  { name: 'docusign_webhook',      label: 'DocuSign Webhook',      type: 'on-demand' },
  { name: 'timesheet_reminder',    label: 'Timesheet Reminder',    type: 'daily cron' },
  { name: 'invoice_overdue_check', label: 'Invoice Overdue Check', type: 'daily cron' },
  { name: 'audit_log_cleanup',     label: 'Audit Log Cleanup',     type: 'weekly cron' },
  { name: 'credly_verify',         label: 'Credly Verify',         type: 'on-demand' },
  { name: 'market_rate_refresh',   label: 'Market Rate Refresh',   type: 'weekly cron' },
  { name: 'engagement_alert',      label: 'Engagement Alert',      type: 'daily cron' },
  { name: 'export_tenant_data',    label: 'Export Tenant Data',    type: 'on-demand' },
] as const

export default async function JobsPage() {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-2">BullMQ Jobs</h1>
      <p className="text-sm text-[#6B7280] mb-6">Monitor and manually trigger background job queues.</p>
      <JobsTable queues={QUEUE_DEFS} />
    </div>
  )
}
