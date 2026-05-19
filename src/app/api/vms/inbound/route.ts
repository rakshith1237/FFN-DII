import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import IORedis from 'ioredis'
import { Queue } from 'bullmq'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Step 1 — Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  // Step 2 — Extract HMAC fields
  const token     = formData.get('token')     as string | null
  const timestamp = formData.get('timestamp') as string | null
  const signature = formData.get('signature') as string | null
  if (!token || !timestamp || !signature) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3 — Verify HMAC with timing-safe compare (BR-VMS-001)
  const signingKey = process.env['MAILGUN_SIGNING_KEY']
  if (!signingKey) {
    console.error('[FFN][vms/inbound] MAILGUN_SIGNING_KEY not configured')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  const expected = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp + token)
    .digest('hex')
  const expectedBuf = Buffer.from(expected,   'hex')
  const receivedBuf = Buffer.from(signature,  'hex')
  const hmacValid =
    expectedBuf.length === receivedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf)

  if (!hmacValid) {
    await supabaseAdmin.from('x_ffn_audit_log').insert({
      tenant_id:    null,
      actor_id:     null,
      persona_code: 'system',
      action:       'vms.webhook_hmac_failure',
      entity_type:  'api',
      entity_id:    null,
      new_values:   { timestamp, sender: formData.get('sender') ?? null },
      ip_address:   request.headers.get('x-forwarded-for') ?? null,
      user_agent:   request.headers.get('user-agent') ?? null,
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 4 — Extract email fields
  const senderEmail  = (formData.get('sender')         as string | null) ?? ''
  const subject      = (formData.get('subject')         as string | null) ?? '(no subject)'
  const rawBody      = (formData.get('body-plain')      as string | null) ?? ''
  const messageId    = (formData.get('Message-Id')      as string | null) ?? null
  const rawHeaderStr = (formData.get('message-headers') as string | null) ?? null

  const domainMatch  = senderEmail.match(/@([a-zA-Z0-9.-]+)/)
  const senderDomain = domainMatch?.[1]?.toLowerCase() ?? ''
  if (!senderDomain) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Step 5 — Domain lookup (BR-VMS-002)
  const { data: domainMap } = await supabaseAdmin
    .from('x_ffn_vms_domain_map')
    .select('tenant_id')
    .eq('vms_domain_raw', senderDomain)
    .eq('is_active', true)
    .single()

  // Step 6 — Insert inbox record
  if (domainMap === null) {
    await supabaseAdmin.from('x_ffn_vms_inbox').insert({
      tenant_id:          null,
      sender_email:       senderEmail,
      sender_domain:      senderDomain,
      subject,
      raw_body:           rawBody,
      raw_headers:        rawHeaderStr ? (JSON.parse(rawHeaderStr) as Record<string, unknown>[]) : null,
      mailgun_message_id: messageId,
      parse_status:       'failed',
      parse_error:        'Sender domain not registered in VMS domain map',
    })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const { data: inboxRecord, error: insertError } = await supabaseAdmin
    .from('x_ffn_vms_inbox')
    .insert({
      tenant_id:          domainMap.tenant_id,
      sender_email:       senderEmail,
      sender_domain:      senderDomain,
      subject,
      raw_body:           rawBody,
      raw_headers:        rawHeaderStr ? (JSON.parse(rawHeaderStr) as Record<string, unknown>[]) : null,
      mailgun_message_id: messageId,
      parse_status:       'pending',
      vms_mode:           'A',
    })
    .select('id')
    .single()

  if (insertError || !inboxRecord) {
    console.error('[FFN][vms/inbound] Insert failed:', insertError?.message)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Step 7 — Enqueue BullMQ job (non-fatal on failure)
  const redisUrl = process.env['UPSTASH_REDIS_URL']
  if (redisUrl) {
    try {
      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck:     false,
        lazyConnect:          false,
      })
      const queue = new Queue('score-compute', { connection })
      await queue.add('parse_vms', {
        inboxId:  inboxRecord.id,
        tenantId: domainMap.tenant_id,
        action:   'parse_vms',
      })
      await queue.close()
      await connection.quit()
    } catch (queueError) {
      console.error('[FFN][vms/inbound] Queue enqueue failed:', (queueError as Error).message)
    }
  } else {
    console.error('[FFN][vms/inbound] UPSTASH_REDIS_URL not configured — job not enqueued')
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
