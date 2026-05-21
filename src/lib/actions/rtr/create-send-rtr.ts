'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { checkRtrDedup } from './check-rtr-dedup'
import { sendEnvelopeForSigning } from '@/lib/docusign/client'
import { fireNotification } from '@/lib/notifications/fire-notification'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const resend = new Resend(process.env['RESEND_API_KEY']!)

function generateRtrNumber(): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const hex   = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  return `RTR-${year}${month}-${hex}`
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{${k}}`, v),
    template
  )
}

export type CreateRtrState = {
  error?:          string
  blocked?:        boolean
  existingRtrId?:  string
  existingNumber?: string
  success?:        boolean
  rtrId?:          string
  rtrNumber?:      string
}

export async function createAndSendRtr(
  candidateId: string,
  jdId:        string
): Promise<CreateRtrState> {
  await requirePersona(['a_recruiter'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  // Dedup check — BR-RTR-001
  const dedup = await checkRtrDedup(candidateId, jdId)
  if (dedup.isDuplicate) {
    return {
      blocked: true,
      error:   'An RTR for this candidate on this role already exists (created within 4 months).',
    }
  }

  // Fetch candidate — BR-RTR-003 (must be on_bench)
  const { data: candidate } = await supabaseAdmin
    .from('x_ffn_candidate')
    .select('id, first_name, last_name, email, bench_status')
    .eq('id', candidateId)
    .eq('tenant_id', tenantId)
    .single()

  if (!candidate) return { error: 'Candidate not found.' }
  if (candidate.bench_status !== 'on_bench') {
    return { error: 'BR-RTR-003: Candidate must have bench_status = on_bench to generate an RTR.' }
  }

  // Fetch JD — BR-RTR-002 (must be open)
  const { data: jd } = await supabaseAdmin
    .from('x_ffn_jd')
    .select('id, title, status, tenant_id')
    .eq('id', jdId)
    .single()

  if (!jd) return { error: 'Job description not found.' }
  if (jd.status !== 'open') {
    return { error: 'BR-RTR-002: RTRs can only be generated for open Job Descriptions.' }
  }

  // Fetch partner org name
  const { data: partnerTenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name')
    .eq('id', jd.tenant_id)
    .single()

  // Fetch agency name
  const { data: agencyTenant } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name')
    .eq('id', tenantId)
    .single()

  // Fetch RTR template
  const { data: template } = await supabaseAdmin
    .from('x_ffn_rtr_template')
    .select('id, body_html')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .single()

  const fallbackHtml = `<html><body><h2>Right to Represent</h2>
<p>This authorises {agency_org} to represent {candidate_name} for {jd_title} at {partner_org}.</p>
<p>Valid for 4 months from signing date.</p></body></html>`

  const rawHtml = template?.body_html ?? fallbackHtml
  const vars: Record<string, string> = {
    candidate_name: `${String(candidate.first_name)} ${String(candidate.last_name)}`,
    jd_title:       String(jd.title),
    partner_org:    partnerTenant?.name ? String(partnerTenant.name) : 'Partner Organisation',
    agency_org:     agencyTenant?.name  ? String(agencyTenant.name)  : 'Agency',
    date:           new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
  const renderedHtml = renderTemplate(String(rawHtml), vars)

  // Get expiry from settings (default 7 days)
  const { data: expirySetting } = await supabaseAdmin
    .from('x_ffn_setting')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', 'default_rtr_expiry_days')
    .single()

  const expiryDays    = expirySetting ? parseInt(String(expirySetting.value), 10) : 7
  const expiresAt     = new Date(Date.now() + expiryDays * 86400000).toISOString()
  const rtrNumber     = generateRtrNumber()
  const candidateName = `${String(candidate.first_name)} ${String(candidate.last_name)}`

  // Insert RTR in draft state
  const { data: rtr, error: insertError } = await supabaseAdmin
    .from('x_ffn_rtr')
    .insert({
      tenant_id:        tenantId,
      number:           rtrNumber,
      jd_id:            jdId,
      candidate_id:     candidateId,
      agency_tenant_id: tenantId,
      template_id:      template?.id ?? null,
      recruiter_id:     candidateId, // placeholder — update below with actual recruiter
      status:           'draft',
      expires_at:       expiresAt,
    })
    .select('id')
    .single()

  if (insertError || !rtr) return { error: insertError?.message ?? 'Failed to create RTR.' }

  // Send via DocuSign
  let envelopeId = ''
  try {
    envelopeId = await sendEnvelopeForSigning({
      candidateEmail: String(candidate.email),
      candidateName,
      htmlContent:    renderedHtml,
      subject:        `Right to Represent — ${String(jd.title)} — Please Sign`,
      rtrNumber,
    })
  } catch (err) {
    // Roll back draft RTR on DocuSign failure
    await supabaseAdmin.from('x_ffn_rtr').delete().eq('id', rtr.id)
    return { error: `DocuSign error: ${(err as Error).message}` }
  }

  // Update RTR to sent
  await supabaseAdmin
    .from('x_ffn_rtr')
    .update({
      status:               'sent',
      docusign_envelope_id: envelopeId,
      docusign_status:      'sent',
    })
    .eq('id', rtr.id)

  // Audit log
  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiter',
    action:       'rtr.sent',
    entity_type:  'x_ffn_rtr',
    entity_id:    rtr.id,
    new_values:   { rtr_number: rtrNumber, envelope_id: envelopeId, candidate_id: candidateId, jd_id: jdId },
    ip_address:   null,
    user_agent:   null,
  })

  await fireNotification('RTR_SENT_TO_CANDIDATE', tenantId, { rtrNumber, candidateName })

  void resend

  return { success: true, rtrId: rtr.id, rtrNumber }
}
