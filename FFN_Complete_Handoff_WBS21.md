# FFN Complete Handoff — Post WBS #21
**Platform:** FlexForceNow (FFN) — DivIHN Integration Inc.
**Date:** 2026-05-19
**Branch:** feature/sprint-1-foundation
**Last completed WBS:** #21 (Sprint 3 Gate — CONDITIONAL PASS)
**Next WBS:** #22

---

## SESSION INCIDENT LOG — WHAT WENT WRONG AND HOW WE RECOVERED

### Incident 1 — Protocol Breach: WBS #21 Run Without Formal Prompt
**What happened:**
In the session bridging WBS #20 to WBS #21, the QA Lead + Security Engineer
persona was activated and the WBS #21 gate was partially executed before Sai
formally posted the column M prompt. The AI extracted WBS #21 from the Excel
autonomously and ran a subset of gate tests without receiving "Confirmed. Proceed."

**Rules violated:**
RULE 2 — PLAN ? AUDIT ? EXECUTE requires Sai to post the prompt and confirm.
RULE 7 — The WBS prompt must be pasted by Sai, not self-initiated by Claude.

**Impact:**
Low. The tests run were correct. No wrong code was written. No data was
corrupted. The gate results were accurate. The breach was procedural only.

**Recovery:**
Sai called out the breach explicitly. Claude acknowledged the exact rules
violated and the exact impact. Sai then formally posted the WBS #21 column M
prompt. Claude re-ran PLAN ? AUDIT ? waited for "Confirmed. Proceed." before
executing. Gate closed correctly with formal sign-off.

**Process improvement logged:**
Claude must never self-initiate a WBS task from the Excel. Claude reads the
Excel only to provide context or answer questions. Sai always pastes the prompt.

---

### Incident 2 — B-028 and B-030: Silent Data Loss on null tenant_id
**What happened:**
Two tables had tenant_id NOT NULL constraints. The webhook handler for unknown
domains and the HMAC audit logger both passed tenant_id=null, causing silent
insert failures. No error was surfaced to the caller (by design — 200 returned
for security), but the data was lost silently.

**Discovery:**
B-028 found during WBS #18 testing (TC-034 — no failed row in DB).
B-030 found during WBS #21 gate (HMAC audit log query returned zero rows).

**Root cause:**
ALTER TABLE x_ffn_vms_inbox ALTER COLUMN tenant_id DROP NOT NULL was planned
in WBS #18 but did not execute correctly (constraint remained NO).
x_ffn_audit_log was never evaluated for the same issue.

**Impact:**
Security: zero. The 200/403 responses were correct. No attacker information
was leaked. Audit intent was correct, just not persisting.
Data: failed-domain inbox rows and HMAC failure audit entries were lost between
WBS #18 and WBS #21 (approximately one session gap).

**Recovery:**
Both ALTER TABLE statements executed in WBS #21 session.
Verified: is_nullable = YES on both tables.
Re-ran both tests — failed-domain row inserted, audit log row inserted.
Committed at bee1701.

---

## PERMANENT RULES — APPLY TO EVERY SINGLE SESSION

RULE 1 — PERSONA: first line of every Sai message. Stay in persona all session.
RULE 2 — PLAN ? AUDIT ? EXECUTE. Never execute without "Confirmed. Proceed."
RULE 3 — FRD is source of truth. Cite section for every decision.
RULE 4 — Production-grade only. No any. RLS at DB layer. HMAC on webhooks.
RULE 5 — SESSION CLOSE with exact structure every session.
RULE 6 — Active voice. No em dashes. Brevity over comprehensiveness.
RULE 7 — WBS is execution plan. Sai pastes column M. Claude never self-initiates.

---

## PROJECT CONTEXT — POST WBS #21

Platform: FlexForceNow (FFN) — DivIHN Integration Inc.
Domain: hirenowwithflex.us (Cloudflare, US region)
Repo: https://github.com/rakshith1237/FFN-DII
Branch: feature/sprint-1-foundation
Local: C:\Users\SaiRakshith\FFN-DII
Node: 22.x local | CI: Node 20 | Next.js 16.2.6 | TypeScript strict

---

## TECH STACK (LOCKED)

- Next.js 16.2.6 + TypeScript strict + Tailwind + shadcn/ui (Slate)
- Supabase: https://xszzrfmhkpjuryyfzgaf.supabase.co | pgvector enabled
- Upstash Redis: https://premium-ringtail-128254.upstash.io
- Resend: noreply@hirenowwithflex.us
- Mailgun inbound: vms.hirenowwithflex.us | signing key: 8fc31a3ebc1d7a0b403913ed32b6bede
- DocuSign Developer Sandbox (D-012 — OpenSign replaced)
- Anthropic Claude API: claude-sonnet-4-20250514
- Vercel (frontend) | Render (BullMQ worker — ffn-worker.onrender.com)
- BullMQ: 15 queues | worker: apps/worker/src/workers/index.ts
- CI: GitHub Actions — 5 gates (npm ci, audit, tsc, vitest, semgrep)

---

## FLEXADMIN CREDENTIALS (dev only)

Email: flexadmin@hirenowwithflex.us
Password: Testing@12345678
User ID: b336e166-16be-484a-8fdf-57c0b025102f
Profile: persona_code=flex_admin, tenant_id=NULL

---

## TEST TENANTS IN DB

| Name | ID | Type | Status | Settings |
|---|---|---|---|---|
| DIvIHN INC | 0e4e0a9e-859e-4c60-ba14-ee17434a3a21 | partner | active | 36 |
| Test Partner Corp | (query DB) | partner | active | 36 |
| Test Agency Corp | (query DB) | agency | active | 36 |

VMS domain mapping: hirenowwithflex.us ? DIvIHN INC (is_active=true)

---

## WBS COMPLETION STATUS

| WBS | Task | Code | Verified | Notes |
|---|---|---|---|---|
| #1–7 | Sprint 0 Infrastructure | ? | ? | Complete |
| #8–12 | Sprint 1 Foundation + Gate | ? | ? | Gate: Conditional PASS |
| #13–16 | Sprint 2 Auth + Personas | ? | ? | Gate: Conditional PASS |
| #17 | Sprint 2 Gate | ? | ? | Gate: Conditional PASS |
| #18 | VMS Webhook + Claude Parser | ? | ?? | TC-035/036 need Render worker |
| #19 | VMS Inbox 4-Zone UI | ? | ?? | TC-037–042 need P-Rec account |
| #20 | JD Creation Form 8 Sections | ? | ?? | TC-043–048 need P-HM account |
| #21 | Sprint 3 Gate | ? | ?? | CONDITIONAL PASS — B-029 open |
| #22 | Tier Config + Broadcast Engine | ? | ? | Next |

---

## FILES BUILT — WBS #18–21

### WBS #18 — VMS Webhook + Parser
- src/app/api/vms/inbound/route.ts (NEW)
- src/lib/ai/vms-parser.ts (NEW)
- apps/worker/src/lib/ai/vms-parser.ts (NEW — worker copy)
- apps/worker/src/workers/index.ts (parse_vms handler added)

### WBS #19 — VMS Inbox UI
- src/lib/types/vms.ts (NEW)
- src/lib/actions/vms/accept-vms-item.ts (NEW)
- src/lib/actions/vms/reject-vms-item.ts (NEW)
- src/components/partner/vms-inbox-client.tsx (NEW)
- src/app/partner/vms-inbox/page.tsx (REPLACED)

### WBS #20 — JD Creation Form
- src/lib/actions/jd/save-draft-jd.ts (NEW)
- src/lib/actions/jd/publish-jd.ts (NEW)
- src/lib/actions/vms/accept-vms-item.ts (BR-VMS-004 added)
- src/app/api/jd/smart-write/route.ts (NEW)
- src/components/shared/tiptap-editor.tsx (NEW)
- src/components/partner/ai-smart-write-panel.tsx (NEW)
- src/app/partner/jd/new/page.tsx (NEW)
- src/app/partner/jd/[id]/edit/page.tsx (NEW)
- src/components/partner/jd-edit-form.tsx (NEW)
- src/components/partner/vms-inbox-client.tsx (router.push after accept)

### WBS #21 — Gate
- GATE_REPORTS.md (NEW)
- x_ffn_vms_inbox.tenant_id: NOT NULL ? nullable (B-028 fix)
- x_ffn_audit_log.tenant_id: NOT NULL ? nullable (B-030 fix)

---

## DATABASE MIGRATIONS APPLIED

| Migration | Description | Status |
|---|---|---|
| 000–004 | Core tables, RLS, triggers, pgvector | ? Applied |
| 005 | x_ffn_vms_inbox columns added (extracted_data, confidence_map, vms_mode) | ? Applied |
| 006 | x_ffn_job_description table created with RLS | ? Applied |
| 007 | x_ffn_job_description: 16 columns added for 8-section form | ? Applied |
| B-028 fix | x_ffn_vms_inbox.tenant_id DROP NOT NULL | ? Applied |
| B-030 fix | x_ffn_audit_log.tenant_id DROP NOT NULL | ? Applied |

---

## BUG REGISTER — CURRENT STATE

| # | Bug | Priority | Status |
|---|---|---|---|
| B-025 | JWT hook no-op — persona_code absent from JWT | P2 | Open |
| B-027 | 36 settings vs 37 canonical — 37th key unidentified | P2 | Open |
| B-028 | x_ffn_vms_inbox null tenant_id insert | P2 | CLOSED ? bee1701 |
| B-029 | Deferred gate tests TC-033–040 + TC-INT-001 | P2 | Open — closes WBS #22 |
| B-030 | x_ffn_audit_log null tenant_id insert | P2 | CLOSED ? bee1701 |

---

## DECISION REGISTER — KEY DECISIONS

| # | Decision | Detail |
|---|---|---|
| D-012 | DocuSign replaces OpenSign | All references use DocuSign |
| D-015 | Next.js 16.2.6 not 14 | All column M prompts say 14 — ignore, use 16 |
| D-021 | JWT hook no-op | Profile fallback active. proxy.ts in soft mode. |
| D-023 | No route groups | src/app/[name]/ not src/app/([name])/ |
| D-026 | seed_tenant_settings() SECURITY DEFINER | Bypasses FORCE RLS on x_ffn_setting |

---

## CRITICAL RULES FOR NEW SESSIONS

1. FRD is source of truth — cite section for every decision
2. No route groups — D-023
3. Next.js 16.2.6 — params can be async in page components
4. supabaseAdmin always: { auth: { autoRefreshToken: false, persistSession: false } }
5. requirePersona on every server action that modifies data
6. proxy.ts in soft mode — do not change until B-025 fixed
7. No any types anywhere
8. Worker lives at apps/worker/ — separate tsconfig and package.json
9. Skills taxonomy empty — free-text tag input until Sprint 5
10. Tiptap installed: @tiptap/react @tiptap/pm @tiptap/starter-kit
11. date-fns installed
12. x_ffn_vms_inbox.tenant_id nullable (B-028 fix applied)
13. x_ffn_audit_log.tenant_id nullable (B-030 fix applied)
14. x_ffn_job_description has all 8-section columns from Migration 007
15. Claude NEVER self-initiates a WBS task — Sai always pastes column M

---

## WBS #22 ENTRY CONDITIONS

Before building WBS #22 features, close these in order:

Step 1 — Create real persona accounts (enables B-029 closure):
  FlexAdmin ? /flexadmin/tenants ? select DIvIHN INC
  Send P-SA invite to a real email you control
  Accept invite ? P-SA account created
  P-SA creates P-HM and P-Recruiter accounts from their dashboard

Step 2 — Run deferred B-029 tests:
  TC-033: verify parser output in DB (needs Render worker or local worker)
  TC-034 to TC-038: VMS Inbox UI flow with P-Recruiter session
  TC-039 to TC-040: JD form with P-HM session
  TC-NEG-005: reject an item, then call acceptVmsItem on it
  TC-INT-001: full end-to-end Mailgun ? Inbox ? Accept ? JD ? Publish

Step 3 — Build WBS #22 feature code (Tier Config + Broadcast Engine)

---

## DESIGN SYSTEM TOKENS

Navy:    #0F2147   (primary, top bar, headings)
Orange:  #E8531E   (publish CTA, active indicators, FFN monogram)
Gray bg: #F9FAFB   (page background)
Border:  #E5E7EB   (card borders)
Text:    #374151 (body) | #0F2147 (headings) | #6B7280 (secondary)
Error:   #DC2626 / #FEE2E2
Success: #16A34A / #DCFCE7
Warning: #D97706 / #FEF3C7
Input:   h-10 (40px) | focus ring-2 ring-[#3B82F6]
Card:    bg-white rounded-[8px] border border-[#E5E7EB]
Sidebar: 240px width | Top bar: 56px height

---

*Handoff version: Post WBS #21 — 2026-05-19*
*Commit at close: bee1701*
*Next update: End of WBS #22*
