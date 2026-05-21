import { createAdminClient } from '@/lib/supabase/admin'
import { NOTIFICATION_EVENTS } from './events'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

function buildEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#0F2147;margin-top:0">${title}</h2>
    <div style="color:#374151;line-height:1.6">${body}</div>
    <hr style="margin:32px 0;border-color:#E5E7EB" />
    <p style="color:#9CA3AF;font-size:12px">FlexForceNow &middot; DivIHN Integration Inc.</p>
  </body></html>`
}

export async function fireNotification(
  eventKey:    string,
  tenantId:    string,
  payload:     Record<string, unknown>,
  opts?: {
    extraTenantIds?: string[]
    overrideUserIds?: string[]
    overrideEmail?: { to: string; name?: string }
  }
): Promise<void> {
  const eventDef = NOTIFICATION_EVENTS[eventKey]
  if (!eventDef) {
    console.warn(`[fireNotification] unknown event: ${eventKey}`)
    return
  }

  const db = createAdminClient()

  let recipientIds: { userId: string; email: string | null; fullName: string | null }[] = []

  if (opts?.overrideUserIds?.length) {
    const { data: profiles } = await db
      .from('x_ffn_user_profile')
      .select('user_id, email, full_name')
      .in('user_id', opts.overrideUserIds)
    recipientIds = (profiles ?? []).map(p => ({ userId: p.user_id, email: p.email, fullName: p.full_name }))
  } else if (eventDef.personas.length > 0) {
    const tenantIds = [tenantId, ...(opts?.extraTenantIds ?? [])]
    const { data: profiles } = await db
      .from('x_ffn_user_profile')
      .select('user_id, email, full_name')
      .in('tenant_id', tenantIds)
      .in('persona_code', eventDef.personas)
      .eq('is_active', true)
    recipientIds = (profiles ?? []).map(p => ({ userId: p.user_id, email: p.email, fullName: p.full_name }))
  }

  if (recipientIds.length === 0 && !opts?.overrideEmail) return

  const subject  = eventDef.subject(payload)
  const bodyHtml = eventDef.body(payload)

  if (eventDef.channel === 'in-app' || eventDef.channel === 'in-app+email') {
    const rows = recipientIds.map(r => ({
      tenant_id:  tenantId,
      user_id:    r.userId,
      event_type: eventKey,
      payload,
      read:       false,
    }))
    if (rows.length > 0) {
      await db.from('x_ffn_notification').insert(rows).then(({ error }) => {
        if (error) console.error(`[fireNotification] insert error: ${error.message}`)
      })
    }
  }

  if (eventDef.channel === 'email' || eventDef.channel === 'in-app+email') {
    const resend = getResend()
    const emailTargets = opts?.overrideEmail
      ? [{ email: opts.overrideEmail.to }]
      : recipientIds.filter(r => r.email).map(r => ({ email: r.email! }))

    for (const target of emailTargets) {
      await resend.emails.send({
        from:    'FFN Platform <noreply@hirenowwithflex.us>',
        to:      target.email,
        subject,
        html:    buildEmailHtml(subject, bodyHtml),
      }).catch(err => console.error(`[fireNotification] email error to ${target.email}: ${String(err)}`))
    }
  }
}
