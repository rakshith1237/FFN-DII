import { NextRequest, NextResponse } from 'next/server'
import { getPersonaCode, getUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const [persona, requestingUser] = await Promise.all([getPersonaCode(), getUser()])
  if (persona !== 'flex_admin' || !requestingUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { userId?: string; reason?: string }
  if (!body.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const db = createAdminClient()

  // Idempotency: check if erasure already requested
  const { data: profile } = await db
    .from('x_ffn_user_profile')
    .select('id, gdpr_erasure_requested_at, tenant_id, email')
    .eq('user_id', body.userId)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (profile.gdpr_erasure_requested_at) {
    return NextResponse.json({
      message: 'Erasure already requested',
      requestedAt: profile.gdpr_erasure_requested_at,
    })
  }

  // Mark erasure requested
  await db
    .from('x_ffn_user_profile')
    .update({ gdpr_erasure_requested_at: new Date().toISOString() })
    .eq('user_id', body.userId)

  // Enqueue BullMQ erasure job
  const { Queue } = await import('bullmq')
  const queue = new Queue('gdpr_erasure', {
    connection: {
      host:     new URL(process.env.UPSTASH_REDIS_URL!).hostname,
      port:     parseInt(new URL(process.env.UPSTASH_REDIS_URL!).port || '6379'),
      password: process.env.UPSTASH_REDIS_TOKEN!,
    },
  })
  await queue.add('gdpr_erasure', {
    userId:          body.userId,
    tenantId:        profile.tenant_id,
    requestedBy:     requestingUser.id,
    reason:          body.reason ?? 'GDPR Art. 17 — Right to Erasure',
    requestedAt:     new Date().toISOString(),
  })
  await queue.close()

  // Audit log
  await db.from('x_ffn_audit_log').insert({
    tenant_id:    profile.tenant_id,
    actor_id:     requestingUser.id,
    persona_code: 'flex_admin',
    action:       'gdpr.erasure.requested',
    entity_type:  'x_ffn_user_profile',
    entity_id:    profile.id,
    new_values:   { userId: body.userId, reason: body.reason },
  })

  return NextResponse.json({ queued: true, userId: body.userId, sla: '72 hours' })
}
