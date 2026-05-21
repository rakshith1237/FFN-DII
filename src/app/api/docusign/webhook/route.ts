import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fireNotification } from '@/lib/notifications/fire-notification'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const resend = new Resend(process.env['RESEND_API_KEY']!)

type DocuSignEvent = {
  event?:             string
  envelopeId?:        string
  status?:            string
  completedDateTime?: string
  voidedDateTime?:    string
  voidedReason?:      string
  data?: {
    envelopeId?: string
    envelopeSummary?: {
      status?:          string
      completedDateTime?: string
      voidedDateTime?:  string
      voidedReason?:    string
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()

  // HMAC validation — BR-RTR-005
  const hmacKey   = process.env['DOCUSIGN_CONNECT_HMAC_KEY']
  const signature = request.headers.get('x-docusign-signature-1')

  if (hmacKey && hmacKey !== 'set-this-from-docusign-connect-config' && signature) {
    const expected = crypto
      .createHmac('sha256', hmacKey)
      .update(rawBody)
      .digest('base64')

    if (expected !== signature) {
      await supabaseAdmin.from('x_ffn_audit_log').insert({
        tenant_id:    null,
        actor_id:     null,
        persona_code: 'system',
        action:       'docusign.webhook_hmac_failure',
        entity_type:  'api',
        entity_id:    null,
        new_values:   { ip: request.headers.get('x-forwarded-for') },
        ip_address:   request.headers.get('x-forwarded-for'),
        user_agent:   request.headers.get('user-agent'),
      })
      // Return 200 anyway to prevent DocuSign retry storms
      return NextResponse.json({ received: true }, { status: 200 })
    }
  }

  let event: DocuSignEvent
  try {
    event = JSON.parse(rawBody) as DocuSignEvent
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const envelopeId = event.envelopeId
    ?? event.data?.envelopeId
    ?? null

  const envelopeStatus = (
    event.status
    ?? event.data?.envelopeSummary?.status
    ?? event.event
    ?? ''
  ).toLowerCase()

  if (!envelopeId) return NextResponse.json({ received: true }, { status: 200 })

  const { data: rtr } = await supabaseAdmin
    .from('x_ffn_rtr')
    .select('id, agency_tenant_id, candidate_id, jd_id, number')
    .eq('docusign_envelope_id', envelopeId)
    .single()

  if (!rtr) return NextResponse.json({ received: true }, { status: 200 })

  if (envelopeStatus === 'completed') {
    await supabaseAdmin
      .from('x_ffn_rtr')
      .update({
        status:          'signed',
        signed_at:       new Date().toISOString(),
        docusign_status: 'completed',
      })
      .eq('id', rtr.id)

    const { data: arms } = await supabaseAdmin
      .from('x_ffn_user_profile')
      .select('email, full_name')
      .eq('tenant_id', String(rtr.agency_tenant_id))
      .eq('persona_code', 'a_recruiting_manager')
      .eq('is_active', true)

    const { data: candidate } = await supabaseAdmin
      .from('x_ffn_candidate')
      .select('first_name, last_name')
      .eq('id', String(rtr.candidate_id))
      .single()

    const candidateName = candidate
      ? `${String(candidate.first_name)} ${String(candidate.last_name)}`
      : 'Candidate'

    if (arms) {
      for (const arm of arms) {
        if (arm.email) {
          await resend.emails.send({
            from:    'noreply@hirenowwithflex.us',
            to:      String(arm.email),
            subject: `RTR Signed — ${candidateName} is ready for your approval`,
            html:    `<p>Hi ${String(arm.full_name ?? 'Recruiting Manager')},</p>
                      <p>The Right to Represent for <strong>${candidateName}</strong> (RTR ${String(rtr.number)}) has been signed.</p>
                      <p>Please review and approve it in your <a href="${process.env['NEXT_PUBLIC_APP_URL']}/agency/rtr-inbox">RTR Inbox</a>.</p>`,
          }).catch(err => console.error('[FFN][docusign-webhook] Email failed:', (err as Error).message))
        }
      }
    }

    await supabaseAdmin.from('x_ffn_audit_log').insert({
      tenant_id:    String(rtr.agency_tenant_id),
      actor_id:     null,
      persona_code: 'system',
      action:       'rtr.signed',
      entity_type:  'x_ffn_rtr',
      entity_id:    String(rtr.id),
      new_values:   { envelope_id: envelopeId },
      ip_address:   null,
      user_agent:   null,
    })

    await fireNotification('RTR_SIGNED', String(rtr.agency_tenant_id), { rtrNumber: String(rtr.number), candidateName })
  }

  if (envelopeStatus === 'voided') {
    await supabaseAdmin
      .from('x_ffn_rtr')
      .update({
        status:          'voided',
        voided_at:       new Date().toISOString(),
        docusign_status: 'voided',
        void_reason:     String(event.data?.envelopeSummary?.voidedReason ?? 'Voided via DocuSign'),
      })
      .eq('id', rtr.id)

    await supabaseAdmin.from('x_ffn_audit_log').insert({
      tenant_id:    String(rtr.agency_tenant_id),
      actor_id:     null,
      persona_code: 'system',
      action:       'rtr.voided',
      entity_type:  'x_ffn_rtr',
      entity_id:    String(rtr.id),
      new_values:   { envelope_id: envelopeId },
      ip_address:   null,
      user_agent:   null,
    })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
