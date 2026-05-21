import { NextRequest, NextResponse } from 'next/server'
import { getPersonaCode, getUser } from '@/lib/auth/session'

const VALID_QUEUES = [
  'score_submission','parse_vms_email','cws_fetch','contract_end_alert',
  'sla_monitor','bench_refresh','send_notification','docusign_webhook',
  'timesheet_reminder','invoice_overdue_check','audit_log_cleanup',
  'credly_verify','market_rate_refresh','engagement_alert','export_tenant_data',
] as const

type ValidQueue = (typeof VALID_QUEUES)[number]

export async function POST(req: NextRequest) {
  const [persona, user] = await Promise.all([getPersonaCode(), getUser()])
  if (persona !== 'flex_admin' || !user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { queueName?: string }
  const queueName = body.queueName as ValidQueue | undefined

  if (!queueName || !VALID_QUEUES.includes(queueName)) {
    return NextResponse.json({ error: `Invalid queue: ${queueName ?? ''}` }, { status: 400 })
  }

  // Dynamic import to avoid Upstash client at build time
  const { Queue } = await import('bullmq')
  const { Redis } = await import('@upstash/redis')

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })

  const queue = new Queue(queueName, {
    connection: {
      host:     new URL(process.env.UPSTASH_REDIS_URL!).hostname,
      port:     parseInt(new URL(process.env.UPSTASH_REDIS_URL!).port || '6379'),
      password: process.env.UPSTASH_REDIS_TOKEN!,
    },
  })

  const job = await queue.add(queueName, {
    manual:      true,
    triggeredBy: user.id,
    triggeredAt: new Date().toISOString(),
  })

  await queue.close()
  void redis // suppress unused warning

  return NextResponse.json({ queued: true, jobId: job.id })
}
