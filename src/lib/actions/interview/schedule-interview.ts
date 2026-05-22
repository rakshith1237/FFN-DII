'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { fireNotification }     from '@/lib/notifications/fire-notification'
import { getSetting }           from '@/lib/settings/resolver'
import { Resend }               from 'resend'
import { revalidatePath }       from 'next/cache'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

export type ScheduleInterviewInput = {
  submissionId:    string
  jdId:            string
  candidateId:     string
  interviewFormat: 'video' | 'in_person' | 'phone'
  meetingPlatform: string | null
  meetingUrl:      string | null
  scheduledAt:     string          // ISO string
  durationMinutes: 30 | 45 | 60 | 90
  panelists:       { userId: string; name: string; email: string }[]
  notes:           string | null
}

export async function scheduleInterview(
  input: ScheduleInterviewInput
): Promise<{ error: string | null; interviewId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', interviewId: null }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) {
    return { error: 'Only Hiring Managers can schedule interviews', interviewId: null }
  }

  // Server-side future date validation
  if (new Date(input.scheduledAt) <= new Date()) {
    return { error: 'Interview must be scheduled in the future', interviewId: null }
  }

  const db = createAdminClient()

  // Submission must be shortlisted
  const { data: sub } = await db
    .from('x_ffn_submission')
    .select('id, status, candidate_id, jd_id, agency_tenant_id')
    .eq('id', input.submissionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!sub) return { error: 'Submission not found', interviewId: null }
  if (sub.status !== 'shortlisted') {
    return { error: `Submission must be shortlisted before scheduling (current: ${sub.status})`, interviewId: null }
  }

  // Fetch candidate + JD for email templates
  const [{ data: candidate }, { data: jd }] = await Promise.all([
    db.from('x_ffn_candidate').select('first_name, last_name, email').eq('id', input.candidateId).maybeSingle(),
    db.from('x_ffn_jd').select('number, title').eq('id', input.jdId).maybeSingle(),
  ])

  // Fetch interview criteria for briefing
  const { data: criteria } = await db
    .from('x_ffn_jd_interview_criterion')
    .select('criterion_text, weight, sort_order')
    .eq('jd_id', input.jdId)
    .eq('is_active', true)
    .order('sort_order')

  // Resolve tenant timezone from settings
  const tz = await getSetting('timezone', { tenantId }) ?? 'Europe/London'

  const scheduledDate = new Date(input.scheduledAt)
  const formattedDate = scheduledDate.toLocaleString('en-GB', {
    timeZone:     tz,
    dateStyle:    'full',
    timeStyle:    'short',
  })

  const candidateName = candidate
    ? `${candidate.first_name} ${candidate.last_name}`
    : 'Candidate'
  const jdTitle = jd?.title ?? 'Job Description'

  // INSERT interview
  const { data: interview, error: insertError } = await db
    .from('x_ffn_interview')
    .insert({
      tenant_id:            tenantId,
      jd_id:                input.jdId,
      submission_id:        input.submissionId,
      candidate_id:         input.candidateId,
      scheduled_at:         input.scheduledAt,
      duration_minutes:     input.durationMinutes,
      interview_format:     input.interviewFormat,
      meeting_platform:     input.meetingPlatform,
      meeting_url:          input.meetingUrl,
      panelists:            input.panelists,
      panelists_total_count: input.panelists.length,
      panelists_submitted_count: 0,
      anonymous_panel_mode: false,
      scorecard_deadline:   new Date(
        scheduledDate.getTime() + 48 * 60 * 60 * 1000
      ).toISOString(),
      status:               'scheduled',
      created_by:           user.id,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message, interviewId: null }

  // UPDATE submission status
  await db
    .from('x_ffn_submission')
    .update({ status: 'interview_scheduled' })
    .eq('id', input.submissionId)

  // Audit log
  await db.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     user.id,
    persona_code: persona,
    action:       'interview.scheduled',
    entity_type:  'x_ffn_interview',
    entity_id:    interview.id,
    new_values:   { submission_id: input.submissionId, scheduled_at: input.scheduledAt },
  })

  // Fire INTERVIEW_SCHEDULED notification (to A-RM in agency tenant)
  await fireNotification('INTERVIEW_SCHEDULED', tenantId, {
    candidateName,
    jdTitle,
  }, { extraTenantIds: [sub.agency_tenant_id] })

  // Criteria HTML for briefing
  const criteriaHtml = (criteria ?? []).length > 0
    ? `<ul>${(criteria ?? []).map(c =>
        `<li style="margin-bottom:6px"><strong>${c.criterion_text}</strong> (weight: ${c.weight})</li>`
      ).join('')}</ul>`
    : '<p>General interview — no specific criteria configured.</p>'

  const meetingInfo = input.meetingUrl
    ? `<p><strong>Meeting Link:</strong> <a href="${input.meetingUrl}">${input.meetingUrl}</a></p>`
    : `<p><strong>Format:</strong> ${input.interviewFormat === 'in_person' ? 'In Person' : input.interviewFormat}</p>`

  const baseHtml = (recipientName: string) =>
    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0F2147">Interview Scheduled — ${jdTitle}</h2>
      <p>Hi ${recipientName},</p>
      <p>An interview has been scheduled for <strong>${candidateName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#F9FAFB;font-weight:600">Date &amp; Time</td>
            <td style="padding:8px">${formattedDate}</td></tr>
        <tr><td style="padding:8px;background:#F9FAFB;font-weight:600">Duration</td>
            <td style="padding:8px">${input.durationMinutes} minutes</td></tr>
        <tr><td style="padding:8px;background:#F9FAFB;font-weight:600">Format</td>
            <td style="padding:8px">${input.meetingPlatform ?? input.interviewFormat}</td></tr>
      </table>
      ${meetingInfo}
      <h3 style="color:#0F2147;margin-top:24px">Interview Criteria</h3>
      ${criteriaHtml}
      ${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ''}
      <hr style="margin:32px 0;border-color:#E5E7EB" />
      <p style="color:#9CA3AF;font-size:12px">FlexForceNow &middot; DivIHN Integration Inc.</p>
    </body></html>`

  const resend = getResend()

  // Email each panelist
  for (const panelist of input.panelists) {
    if (!panelist.email) continue
    await resend.emails.send({
      from:    'FFN Platform <noreply@hirenowwithflex.us>',
      to:      panelist.email,
      subject: `Interview brief: ${candidateName} — ${jdTitle}`,
      html:    baseHtml(panelist.name || panelist.email),
    }).catch(err => console.error('[interview] panelist email error:', String(err)))
  }

  // Email candidate
  if (candidate?.email) {
    await resend.emails.send({
      from:    'FFN Platform <noreply@hirenowwithflex.us>',
      to:      candidate.email,
      subject: `Your interview for ${jdTitle} is confirmed`,
      html:    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#0F2147">Interview Confirmed</h2>
        <p>Hi ${candidate.first_name},</p>
        <p>Your interview for <strong>${jdTitle}</strong> has been confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#F9FAFB;font-weight:600">Date &amp; Time</td>
              <td style="padding:8px">${formattedDate}</td></tr>
          <tr><td style="padding:8px;background:#F9FAFB;font-weight:600">Duration</td>
              <td style="padding:8px">${input.durationMinutes} minutes</td></tr>
        </table>
        ${meetingInfo}
        <hr style="margin:32px 0;border-color:#E5E7EB" />
        <p style="color:#9CA3AF;font-size:12px">FlexForceNow &middot; DivIHN Integration Inc.</p>
      </body></html>`,
    }).catch(err => console.error('[interview] candidate email error:', String(err)))
  }

  revalidatePath(`/partner/jd/${input.jdId}/decision-vault`)
  revalidatePath('/partner/interviews')
  return { error: null, interviewId: interview.id }
}
