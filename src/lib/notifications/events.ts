export type NotificationChannel = 'in-app' | 'in-app+email' | 'email'

export type NotificationEventDef = {
  event:    string
  channel:  NotificationChannel
  personas: string[]
  subject:  (payload: Record<string, unknown>) => string
  body:     (payload: Record<string, unknown>) => string
}

export const NOTIFICATION_EVENTS: Record<string, NotificationEventDef> = {
  TENANT_PROVISIONED: {
    event: 'TENANT_PROVISIONED', channel: 'email',
    personas: ['flex_admin'],
    subject: () => 'New tenant provisioned on FFN',
    body: p => `Tenant <strong>${String(p.tenantName ?? '')}</strong> has been provisioned.`,
  },
  INVITE_SENT: {
    event: 'INVITE_SENT', channel: 'email',
    personas: [],
    subject: () => 'You have been invited to FlexForceNow',
    body: p => `You have been invited to join <strong>${String(p.tenantName ?? 'your organisation')}</strong> on FlexForceNow.<br><br><a href="${String(p.inviteUrl ?? '')}" style="background:#0F2147;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Accept Invitation</a>`,
  },
  USER_ONBOARDED: {
    event: 'USER_ONBOARDED', channel: 'in-app',
    personas: ['p_super_admin','a_super_admin'],
    subject: () => 'New user onboarded',
    body: p => `${String(p.fullName ?? 'A user')} has completed onboarding.`,
  },
  VMS_EMAIL_RECEIVED: {
    event: 'VMS_EMAIL_RECEIVED', channel: 'in-app',
    personas: ['p_recruiter'],
    subject: () => 'New VMS email received',
    body: p => `VMS email from <strong>${String(p.senderDomain ?? '')}</strong> is pending review.`,
  },
  VMS_PARSE_COMPLETE: {
    event: 'VMS_PARSE_COMPLETE', channel: 'in-app',
    personas: ['p_recruiter'],
    subject: () => 'VMS email parsed',
    body: p => `VMS email parsed successfully. Subject: ${String(p.subject ?? '')}`,
  },
  VMS_PARSE_FAILED: {
    event: 'VMS_PARSE_FAILED', channel: 'in-app+email',
    personas: ['p_recruiter','p_super_admin'],
    subject: () => 'VMS email parse failed',
    body: p => `Failed to parse VMS email: ${String(p.subject ?? '')}. Manual review required.`,
  },
  VMS_MODE_B_FAILED: {
    event: 'VMS_MODE_B_FAILED', channel: 'in-app+email',
    personas: ['p_recruiter','p_super_admin'],
    subject: () => 'CWS API unreachable',
    body: p => `CWS API failed after 4 attempts for requisition <strong>${String(p.requisitionId ?? '')}</strong>. Manual review required.`,
  },
  JD_CREATED: {
    event: 'JD_CREATED', channel: 'in-app',
    personas: ['p_super_admin'],
    subject: () => 'New JD created',
    body: p => `Job description <strong>${String(p.title ?? '')}</strong> has been created.`,
  },
  JD_PUBLISHED: {
    event: 'JD_PUBLISHED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `New JD available: ${String(p.title ?? '')}`,
    body: p => `A new job description <strong>${String(p.title ?? '')}</strong> has been published and is available for submission.`,
  },
  JD_BROADCAST_SENT: {
    event: 'JD_BROADCAST_SENT', channel: 'in-app',
    personas: ['p_super_admin'],
    subject: () => 'JD broadcast sent',
    body: p => `JD <strong>${String(p.title ?? '')}</strong> has been broadcast to agencies.`,
  },
  JD_BROADCAST_RECEIVED: {
    event: 'JD_BROADCAST_RECEIVED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `New JD assigned: ${String(p.title ?? '')}`,
    body: p => `You have received a new JD: <strong>${String(p.title ?? '')}</strong>. Please review and assign to a recruiter.`,
  },
  JD_ASSIGNED_TO_RECRUITER: {
    event: 'JD_ASSIGNED_TO_RECRUITER', channel: 'in-app+email',
    personas: ['a_recruiter'],
    subject: p => `JD assigned to you: ${String(p.title ?? '')}`,
    body: p => `You have been assigned JD <strong>${String(p.title ?? '')}</strong>. Quota: ${String(p.quota ?? '')} submissions.`,
  },
  JD_SLA_BREACH_WARNING: {
    event: 'JD_SLA_BREACH_WARNING', channel: 'in-app+email',
    personas: ['a_recruiting_manager','p_recruiter'],
    subject: p => `SLA warning: ${String(p.title ?? '')}`,
    body: p => `JD <strong>${String(p.title ?? '')}</strong> SLA deadline is approaching in ${String(p.hoursRemaining ?? '')} hours.`,
  },
  JD_SLA_BREACHED: {
    event: 'JD_SLA_BREACHED', channel: 'in-app+email',
    personas: ['a_recruiting_manager','p_super_admin'],
    subject: p => `SLA breached: ${String(p.title ?? '')}`,
    body: p => `JD <strong>${String(p.title ?? '')}</strong> has breached its SLA deadline.`,
  },
  RTR_SENT_TO_CANDIDATE: {
    event: 'RTR_SENT_TO_CANDIDATE', channel: 'in-app',
    personas: ['a_recruiter'],
    subject: () => 'RTR sent to candidate',
    body: p => `RTR ${String(p.rtrNumber ?? '')} has been sent to ${String(p.candidateName ?? '')} for signing.`,
  },
  RTR_SIGNED: {
    event: 'RTR_SIGNED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `RTR signed: ${String(p.candidateName ?? '')}`,
    body: p => `Candidate <strong>${String(p.candidateName ?? '')}</strong> has signed RTR ${String(p.rtrNumber ?? '')}. Ready for submission.`,
  },
  RTR_EXPIRED: {
    event: 'RTR_EXPIRED', channel: 'in-app+email',
    personas: ['a_recruiter','a_recruiting_manager'],
    subject: p => `RTR expired: ${String(p.rtrNumber ?? '')}`,
    body: p => `RTR ${String(p.rtrNumber ?? '')} for ${String(p.candidateName ?? '')} has expired.`,
  },
  RTR_VOIDED: {
    event: 'RTR_VOIDED', channel: 'in-app',
    personas: ['a_recruiter'],
    subject: () => 'RTR voided',
    body: p => `RTR ${String(p.rtrNumber ?? '')} has been voided.`,
  },
  SUBMISSION_CREATED: {
    event: 'SUBMISSION_CREATED', channel: 'in-app+email',
    personas: ['p_hiring_manager','p_recruiter'],
    subject: p => `New submission: ${String(p.candidateName ?? '')}`,
    body: p => `<strong>${String(p.candidateName ?? '')}</strong> has been submitted for <strong>${String(p.jdTitle ?? '')}</strong> by ${String(p.agencyName ?? '')}.`,
  },
  SUBMISSION_SCORED: {
    event: 'SUBMISSION_SCORED', channel: 'in-app',
    personas: ['p_hiring_manager'],
    subject: p => `IntelliMatch scored: ${String(p.candidateName ?? '')}`,
    body: p => `${String(p.candidateName ?? '')} scored <strong>${String(p.score ?? '')}%</strong> for ${String(p.jdTitle ?? '')}.`,
  },
  SUBMISSION_SHORTLISTED: {
    event: 'SUBMISSION_SHORTLISTED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `Candidate shortlisted: ${String(p.candidateName ?? '')}`,
    body: p => `<strong>${String(p.candidateName ?? '')}</strong> has been shortlisted for ${String(p.jdTitle ?? '')}.`,
  },
  SUBMISSION_REJECTED: {
    event: 'SUBMISSION_REJECTED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `Submission rejected: ${String(p.candidateName ?? '')}`,
    body: p => `Submission for <strong>${String(p.candidateName ?? '')}</strong> on ${String(p.jdTitle ?? '')} has been rejected.`,
  },
  OVERRIDE_REQUESTED: {
    event: 'OVERRIDE_REQUESTED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `Override request: ${String(p.candidateName ?? '')}`,
    body: p => `P-HM has requested a scoring override for <strong>${String(p.candidateName ?? '')}</strong> (score ${String(p.score ?? '')}%, threshold ${String(p.threshold ?? '')}%). Please review.`,
  },
  OVERRIDE_APPROVED: {
    event: 'OVERRIDE_APPROVED', channel: 'in-app+email',
    personas: ['p_hiring_manager'],
    subject: p => `Override approved: ${String(p.candidateName ?? '')}`,
    body: p => `Your override request for <strong>${String(p.candidateName ?? '')}</strong> has been approved.`,
  },
  OVERRIDE_REJECTED: {
    event: 'OVERRIDE_REJECTED', channel: 'in-app+email',
    personas: ['p_hiring_manager'],
    subject: p => `Override rejected: ${String(p.candidateName ?? '')}`,
    body: p => `Your override request for <strong>${String(p.candidateName ?? '')}</strong> has been rejected.`,
  },
  INTERVIEW_SCHEDULED: {
    event: 'INTERVIEW_SCHEDULED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `Interview scheduled: ${String(p.candidateName ?? '')}`,
    body: p => `An interview has been scheduled for <strong>${String(p.candidateName ?? '')}</strong>.`,
  },
  INTERVIEW_SCORECARD_SUBMITTED: {
    event: 'INTERVIEW_SCORECARD_SUBMITTED', channel: 'in-app',
    personas: ['p_hiring_manager'],
    subject: p => `Scorecard submitted: ${String(p.candidateName ?? '')}`,
    body: p => `A scorecard has been submitted for <strong>${String(p.candidateName ?? '')}</strong>.`,
  },
  INTERVIEW_SCORED: {
    event: 'INTERVIEW_SCORED', channel: 'in-app+email',
    personas: ['p_hiring_manager','a_recruiting_manager'],
    subject: p => `Interview scored: ${String(p.candidateName ?? '')}`,
    body: p => `Interview for <strong>${String(p.candidateName ?? '')}</strong> has been scored. Recommendation: ${String(p.recommendation ?? '')}.`,
  },
  OFFER_CREATED: {
    event: 'OFFER_CREATED', channel: 'in-app+email',
    personas: ['a_recruiting_manager'],
    subject: p => `Offer created: ${String(p.candidateName ?? '')}`,
    body: p => `An offer has been created for <strong>${String(p.candidateName ?? '')}</strong>.`,
  },
  OFFER_APPROVED: {
    event: 'OFFER_APPROVED', channel: 'in-app+email',
    personas: ['p_hiring_manager','a_recruiting_manager'],
    subject: p => `Offer approved: ${String(p.candidateName ?? '')}`,
    body: p => `The offer for <strong>${String(p.candidateName ?? '')}</strong> has been approved.`,
  },
  OFFER_DELIVERED: {
    event: 'OFFER_DELIVERED', channel: 'in-app+email',
    personas: ['a_recruiting_manager','a_super_admin'],
    subject: p => `Offer ready for review: ${String(p.candidateName ?? '')}`,
    body: p => `The offer for <strong>${String(p.candidateName ?? '')}</strong> on <strong>${String(p.jdTitle ?? '')}</strong> has been approved and is ready for your review. Bill rate: ${String(p.billRate ?? '')} ${String(p.currency ?? '')}/day.`,
  },
  OFFER_REJECTED: {
    event: 'OFFER_REJECTED', channel: 'in-app+email',
    personas: ['p_hiring_manager'],
    subject: p => `Offer rejected: ${String(p.candidateName ?? '')}`,
    body: p => `The offer for <strong>${String(p.candidateName ?? '')}</strong> has been rejected.`,
  },
  PLACEMENT_CREATED: {
    event: 'PLACEMENT_CREATED', channel: 'in-app+email',
    personas: ['a_super_admin','a_recruiting_manager'],
    subject: p => `Placement confirmed: ${String(p.candidateName ?? '')}`,
    body: p => `<strong>${String(p.candidateName ?? '')}</strong> has been placed. Start date: ${String(p.startDate ?? '')}.`,
  },
  CONTRACT_ENDING_90: {
    event: 'CONTRACT_ENDING_90', channel: 'in-app',
    personas: ['p_hiring_manager'],
    subject: p => `Contract ending in 90 days: ${String(p.candidateName ?? '')}`,
    body: p => `${String(p.candidateName ?? '')}'s contract ends on ${String(p.endDate ?? '')} (90 days). Consider extension or offboarding.`,
  },
  CONTRACT_ENDING_60: {
    event: 'CONTRACT_ENDING_60', channel: 'in-app+email',
    personas: ['p_hiring_manager'],
    subject: p => `Contract ending in 60 days: ${String(p.candidateName ?? '')}`,
    body: p => `${String(p.candidateName ?? '')}'s contract ends on ${String(p.endDate ?? '')} (60 days).`,
  },
  CONTRACT_ENDING_30: {
    event: 'CONTRACT_ENDING_30', channel: 'in-app+email',
    personas: ['p_hiring_manager','a_recruiting_manager'],
    subject: p => `Contract ending in 30 days: ${String(p.candidateName ?? '')}`,
    body: p => `${String(p.candidateName ?? '')}'s contract ends on ${String(p.endDate ?? '')} (30 days). Action required.`,
  },
  CONTRACT_ENDING_14: {
    event: 'CONTRACT_ENDING_14', channel: 'in-app+email',
    personas: ['p_hiring_manager','a_recruiting_manager','p_super_admin'],
    subject: p => `URGENT — Contract ending in 14 days: ${String(p.candidateName ?? '')}`,
    body: p => `${String(p.candidateName ?? '')}'s contract ends on ${String(p.endDate ?? '')} in 14 days. Immediate action required.`,
  },
  TIMESHEET_SUBMITTED: {
    event: 'TIMESHEET_SUBMITTED', channel: 'in-app',
    personas: ['p_hiring_manager'],
    subject: p => `Timesheet submitted: ${String(p.candidateName ?? '')}`,
    body: p => `${String(p.candidateName ?? '')} has submitted a timesheet for ${String(p.period ?? '')}.`,
  },
  TIMESHEET_APPROVED: {
    event: 'TIMESHEET_APPROVED', channel: 'in-app+email',
    personas: ['a_recruiter'],
    subject: p => `Timesheet approved: ${String(p.period ?? '')}`,
    body: p => `Your timesheet for ${String(p.period ?? '')} has been approved.`,
  },
  TIMESHEET_REJECTED: {
    event: 'TIMESHEET_REJECTED', channel: 'in-app+email',
    personas: ['a_recruiter'],
    subject: p => `Timesheet rejected: ${String(p.period ?? '')}`,
    body: p => `Your timesheet for ${String(p.period ?? '')} has been rejected. Please review and resubmit.`,
  },
  INVOICE_CREATED: {
    event: 'INVOICE_CREATED', channel: 'in-app',
    personas: ['p_super_admin'],
    subject: p => `Invoice created: ${String(p.invoiceNumber ?? '')}`,
    body: p => `Invoice ${String(p.invoiceNumber ?? '')} for ${String(p.amount ?? '')} has been created.`,
  },
  INVOICE_OVERDUE: {
    event: 'INVOICE_OVERDUE', channel: 'in-app+email',
    personas: ['p_super_admin','a_super_admin'],
    subject: p => `Invoice overdue: ${String(p.invoiceNumber ?? '')}`,
    body: p => `Invoice ${String(p.invoiceNumber ?? '')} for ${String(p.amount ?? '')} is overdue.`,
  },
  BUDGET_REQUEST_SUBMITTED: {
    event: 'BUDGET_REQUEST_SUBMITTED', channel: 'in-app+email',
    personas: ['p_super_admin'],
    subject: p => `Budget request: ${String(p.role ?? '')}`,
    body: p => `A budget request for <strong>${String(p.headcount ?? '')} × ${String(p.role ?? '')}</strong> has been submitted for approval.`,
  },
  BUDGET_REQUEST_APPROVED: {
    event: 'BUDGET_REQUEST_APPROVED', channel: 'in-app+email',
    personas: ['p_hiring_manager'],
    subject: p => `Budget approved: ${String(p.role ?? '')}`,
    body: p => `Your budget request for <strong>${String(p.headcount ?? '')} × ${String(p.role ?? '')}</strong> has been approved.`,
  },
  PAYMENT_FAILED: {
    event: 'PAYMENT_FAILED', channel: 'in-app+email',
    personas: ['p_super_admin','a_super_admin'],
    subject: () => 'Payment failed — action required',
    body: p => `Your subscription payment of <strong>${String(p.amount ?? '')}</strong> failed (Invoice ${String(p.invoiceNumber ?? '')}). Please update your billing details to keep your account active.`,
  },
}
