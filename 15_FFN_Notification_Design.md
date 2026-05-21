# FFN Notification Design — V1.0 Beta
**Document:** 15_FFN_Notification_Design.md
**WBS:** #36 | Sprint 12-13
**FRD Reference:** Sections 96, 97, 100
**Date:** 2026-05-21

---

## 1. Architecture Overview

FFN uses a two-channel notification system:
- **In-app:** Supabase Realtime (postgres_changes on x_ffn_notification). Bell icon shows unread count. Drawer lists all unread notifications. Marks read on drawer open.
- **Email:** Resend HTML templates. Fired server-side alongside in-app INSERT. Non-fatal — email failure does not block the operation.

All notifications are fired via a single `fireNotification()` function in `src/lib/notifications/fire-notification.ts`. It resolves recipient user_ids from persona codes + tenant_id, then INSERTs into x_ffn_notification and optionally calls Resend.

---

## 2. x_ffn_notification Schema

```sql
CREATE TABLE x_ffn_notification (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES x_ffn_tenant(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: SELECT → `user_id = auth.uid()`. INSERT → service role only. DELETE → FALSE (read flags only).
Realtime: REPLICA IDENTITY FULL. Supabase Realtime enabled on table.

---

## 3. Supabase Realtime SSE Pattern

```typescript
const channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event:  'INSERT',
    schema: 'public',
    table:  'x_ffn_notification',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    setUnreadCount(prev => prev + 1)
    setLatest(payload.new)
  })
  .subscribe()
```

Client subscribes on mount. Unsubscribes on unmount. Bell badge shows unread count. Opening drawer calls `markAllRead()` → UPDATE x_ffn_notification SET read=true WHERE user_id=me AND read=false.

---

## 4. fireNotification() Signature

```typescript
fireNotification(
  event:     NotificationEvent,        // from NOTIFICATION_EVENTS map
  tenantId:  string,
  payload:   Record<string, unknown>,
  overrideRecipientIds?: string[]      // optional: skip persona lookup, use explicit user IDs
): Promise<void>
```

Persona resolution: query `x_ffn_user_profile` WHERE tenant_id=tenantId AND persona_code IN (event.recipientPersonas) AND is_active=true. Returns array of user_ids. For cross-tenant events (e.g. SUBMISSION_CREATED fires to partner when agency submits), pass both tenant IDs.

---

## 5. All 43 Notification Events

| # | Event | Channel | Recipient Personas |
|---|---|---|---|
| 1 | TENANT_PROVISIONED | email | flex_admin |
| 2 | INVITE_SENT | email | (override: invited user email) |
| 3 | USER_ONBOARDED | in-app | p_super_admin / a_super_admin |
| 4 | VMS_EMAIL_RECEIVED | in-app | p_recruiter |
| 5 | VMS_PARSE_COMPLETE | in-app | p_recruiter |
| 6 | VMS_PARSE_FAILED | in-app+email | p_recruiter, p_super_admin |
| 7 | VMS_MODE_B_FAILED | in-app+email | p_recruiter, p_super_admin |
| 8 | JD_CREATED | in-app | p_super_admin |
| 9 | JD_PUBLISHED | in-app+email | a_recruiting_manager |
| 10 | JD_BROADCAST_SENT | in-app | p_super_admin |
| 11 | JD_BROADCAST_RECEIVED | in-app+email | a_recruiting_manager |
| 12 | JD_ASSIGNED_TO_RECRUITER | in-app+email | a_recruiter |
| 13 | JD_SLA_BREACH_WARNING | in-app+email | a_recruiting_manager, p_recruiter |
| 14 | JD_SLA_BREACHED | in-app+email | a_recruiting_manager, p_super_admin |
| 15 | RTR_SENT_TO_CANDIDATE | in-app | a_recruiter |
| 16 | RTR_SIGNED | in-app+email | a_recruiting_manager |
| 17 | RTR_EXPIRED | in-app+email | a_recruiter, a_recruiting_manager |
| 18 | RTR_VOIDED | in-app | a_recruiter |
| 19 | SUBMISSION_CREATED | in-app+email | p_hiring_manager, p_recruiter |
| 20 | SUBMISSION_SCORED | in-app | p_hiring_manager |
| 21 | SUBMISSION_SHORTLISTED | in-app+email | a_recruiting_manager |
| 22 | SUBMISSION_REJECTED | in-app+email | a_recruiting_manager |
| 23 | OVERRIDE_REQUESTED | in-app+email | a_recruiting_manager |
| 24 | OVERRIDE_APPROVED | in-app+email | p_hiring_manager |
| 25 | OVERRIDE_REJECTED | in-app+email | p_hiring_manager |
| 26 | INTERVIEW_SCHEDULED | in-app+email | a_recruiting_manager |
| 27 | INTERVIEW_SCORECARD_SUBMITTED | in-app | p_hiring_manager |
| 28 | INTERVIEW_SCORED | in-app+email | p_hiring_manager, a_recruiting_manager |
| 29 | OFFER_CREATED | in-app+email | a_recruiting_manager |
| 30 | OFFER_APPROVED | in-app+email | p_hiring_manager, a_recruiting_manager |
| 31 | OFFER_REJECTED | in-app+email | p_hiring_manager |
| 32 | PLACEMENT_CREATED | in-app+email | a_super_admin, a_recruiting_manager |
| 33 | CONTRACT_ENDING_90 | in-app | p_hiring_manager |
| 34 | CONTRACT_ENDING_60 | in-app+email | p_hiring_manager |
| 35 | CONTRACT_ENDING_30 | in-app+email | p_hiring_manager, a_recruiting_manager |
| 36 | CONTRACT_ENDING_14 | in-app+email | p_hiring_manager, a_recruiting_manager, p_super_admin |
| 37 | TIMESHEET_SUBMITTED | in-app | p_hiring_manager |
| 38 | TIMESHEET_APPROVED | in-app+email | a_recruiter |
| 39 | TIMESHEET_REJECTED | in-app+email | a_recruiter |
| 40 | INVOICE_CREATED | in-app | p_super_admin |
| 41 | INVOICE_OVERDUE | in-app+email | p_super_admin, a_super_admin |
| 42 | BUDGET_REQUEST_SUBMITTED | in-app+email | p_super_admin |
| 43 | BUDGET_REQUEST_APPROVED | in-app+email | p_hiring_manager |

---

## 6. Email Template Pattern

All emails use a shared HTML wrapper. Variables injected via template literals.

```typescript
function buildEmail(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <img src="https://hirenowwithflex.us/logo.png" height="32" alt="FFN" />
    <h2 style="color:#0F2147;margin-top:24px">${title}</h2>
    <div style="color:#374151;line-height:1.6">${body}</div>
    <hr style="margin:32px 0;border-color:#E5E7EB" />
    <p style="color:#9CA3AF;font-size:12px">FlexForceNow · DivIHN Integration Inc. · hirenowwithflex.us</p>
  </body></html>`
}
```

---

*Document produced: WBS #36 · 2026-05-21*
