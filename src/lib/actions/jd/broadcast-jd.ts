'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const resend = new Resend(process.env['RESEND_API_KEY']!)

export type BroadcastJdResult = { error?: string; success?: boolean; broadcastCount?: number }

export async function broadcastJD(
  jobDescriptionId: string,
  tenantId:         string,
  jdTitle:          string
): Promise<BroadcastJdResult> {

  // 1. Create canonical x_ffn_jd record from x_ffn_job_description
  const { data: draft, error: draftError } = await supabaseAdmin
    .from('x_ffn_job_description')
    .select('*')
    .eq('id', jobDescriptionId)
    .single()

  if (draftError || !draft) return { error: 'Draft JD not found.' }

  const hmId = draft['assigned_hm_id']
    ? String(draft['assigned_hm_id'])
    : (await supabaseAdmin
        .from('x_ffn_user_profile')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('persona_code', ['p_hiring_manager', 'p_super_admin'])
        .limit(1)
        .single()
      ).data?.id ?? tenantId

  const { data: canonicalJd, error: jdInsertError } = await supabaseAdmin
    .from('x_ffn_jd')
    .insert({
      tenant_id:                tenantId,
      number:                   `JD-${Date.now()}`,
      title:                    String(draft['title'] ?? ''),
      hm_id:                    hmId,
      description:              String(draft['description_html'] ?? ''),
      requirements:             String(draft['skills'] ?? ''),
      location_city:            String(draft['location_city'] ?? ''),
      location_type:            (() => {
        const wt = String(draft['work_type'] ?? 'onsite').toLowerCase()
        if (wt === 'remote') return 'remote'
        if (wt === 'hybrid') return 'hybrid'
        return 'onsite'
      })(),
      employment_type:          'contract',
      currency:                 String(draft['currency'] ?? 'GBP').slice(0, 3),
      bill_rate_min:            draft['bill_rate'] != null ? parseFloat(String(draft['bill_rate'])) * 0.85 : null,
      bill_rate_max:            draft['bill_rate'] != null ? parseFloat(String(draft['bill_rate'])) : null,
      rate_model:               String(draft['rate_model'] ?? 'daily').toLowerCase(),
      headcount:                typeof draft['headcount'] === 'number' ? draft['headcount'] : 1,
      target_start_date:        draft['start_date'] ? String(draft['start_date']) : null,
      vms_source:               draft['source'] === 'VMS' ? 'email' : 'manual',
      parsed_from_vms_inbox_id: draft['vms_inbox_id'] ? String(draft['vms_inbox_id']) : null,
      intellimatch_threshold:   typeof draft['intellimatch_threshold'] === 'number'
        ? draft['intellimatch_threshold'] : 75,
      status:                   'open',
      published_at:             new Date().toISOString(),
    })
    .select('id')
    .single()

  if (jdInsertError || !canonicalJd) {
    return { error: jdInsertError?.message ?? 'Failed to create canonical JD record.' }
  }

  // Link draft back to canonical
  await supabaseAdmin
    .from('x_ffn_job_description')
    .update({ jd_canonical_id: canonicalJd.id, status: 'published' })
    .eq('id', jobDescriptionId)

  const canonicalJdId = canonicalJd.id

  // 2. Get tier config for this tenant
  const { data: tierConfigs } = await supabaseAdmin
    .from('x_ffn_tier_config')
    .select('tier_number, agency_tenant_id, hold_window_hours')
    .eq('tenant_id', tenantId)
    .order('tier_number')

  // 3. Get all active agency tenants
  const { data: allAgencies } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('id, name')
    .eq('type', 'agency')
    .eq('status', 'active')

  if (!allAgencies || allAgencies.length === 0) {
    return { success: true, broadcastCount: 0 }
  }

  // BR-DIST-002: no tier config → broadcast all agencies as Tier 1, no hold window
  const tier1Agencies = tierConfigs && tierConfigs.length > 0
    ? allAgencies.filter(a =>
        tierConfigs.some(c => c.agency_tenant_id === a.id && c.tier_number === 1)
      )
    : allAgencies

  const tier1Config    = tierConfigs?.find(c => c.tier_number === 1)
  const tier1HoldHours = tier1Config?.hold_window_hours ?? null
  const agencySlaHours = 48
  const now            = new Date()
  const slaDeadline    = new Date(now.getTime() + agencySlaHours * 3600000)

  // 4. INSERT broadcast records for Tier 1
  const broadcastRows = tier1Agencies.map(agency => ({
    tenant_id:           tenantId,
    jd_id:               canonicalJdId,
    agency_tenant_id:    agency.id,
    tier:                1,
    status:              'pending',
    sent_at:             now.toISOString(),
    sla_deadline:        new Date(now.getTime() + agencySlaHours * 3600000).toISOString(),
    hold_window_ends_at: tier1HoldHours
      ? new Date(now.getTime() + tier1HoldHours * 3600000).toISOString()
      : null,
  }))

  const { error: broadcastError } = await supabaseAdmin
    .from('x_ffn_jd_broadcast')
    .insert(broadcastRows)

  if (broadcastError) return { error: broadcastError.message }

  // 5. Send Resend notifications to each A-RM in Tier 1 agencies
  for (const agency of tier1Agencies) {
    const { data: arms } = await supabaseAdmin
      .from('x_ffn_user_profile')
      .select('email, full_name')
      .eq('tenant_id', agency.id)
      .eq('persona_code', 'a_recruiting_manager')
      .eq('is_active', true)

    if (arms && arms.length > 0) {
      for (const arm of arms) {
        if (arm.email) {
          await resend.emails.send({
            from:    'noreply@hirenowwithflex.us',
            to:      arm.email,
            subject: `New Job Description Available — ${jdTitle}`,
            html: `
              <p>Hi ${arm.full_name ?? 'Recruiting Manager'},</p>
              <p>A new Job Description has been posted that matches your agency profile.</p>
              <p><strong>${jdTitle}</strong></p>
              <p>Review and accept it to begin sourcing candidates.</p>
              <p>SLA Deadline: ${slaDeadline.toLocaleDateString()}</p>
              <p><a href="${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/agency/jd-inbox">Review Job Description &rarr;</a></p>
            `,
          }).catch(err => console.error('[FFN][broadcast] Email failed:', (err as Error).message))
        }
      }
    }
  }

  // 6. Enqueue tier-escalation BullMQ job if there is a Tier 2
  const hasTier2 = tierConfigs?.some(c => c.tier_number === 2)
  if (hasTier2 && tier1HoldHours) {
    let connection: IORedis | null = null
    try {
      connection = new IORedis(process.env['UPSTASH_REDIS_URL']!, {
        maxRetriesPerRequest: null,
        enableReadyCheck:     false,
      })
      const queue = new Queue('tier-escalation', { connection })
      await queue.add(
        'escalate_tier',
        { jdId: canonicalJdId, tenantId, nextTier: 2, jdTitle },
        { delay: tier1HoldHours * 3600000 }
      )
      await queue.close()
    } catch (err) {
      console.error('[FFN][broadcast] BullMQ enqueue failed:', (err as Error).message)
    } finally {
      if (connection) await connection.quit().catch(() => undefined)
    }
  }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'system',
    action:       'jd.broadcast',
    entity_type:  'x_ffn_jd',
    entity_id:    canonicalJdId,
    new_values:   { broadcast_count: broadcastRows.length, tier: 1 },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true, broadcastCount: broadcastRows.length }
}
