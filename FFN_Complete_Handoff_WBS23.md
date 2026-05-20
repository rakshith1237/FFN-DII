# FFN Complete Handoff — Post WBS #23
**Platform:** FlexForceNow (FFN) — DivIHN Integration Inc.
**Date:** 2026-05-20
**Branch:** feature/sprint-1-foundation
**Last completed WBS:** #23 (Sprint 4 Gate — CONDITIONAL PASS)
**Next WBS:** #24

---

## SESSION INCIDENT LOG

### Incident 1 — Protocol Breach: WBS #21 Run Without Formal Prompt
**What:** AI self-initiated WBS #21 gate without Sai posting column M prompt.
**Rules violated:** RULE 2, RULE 7.
**Impact:** Low — correct tests, no wrong code, no data corruption.
**Recovery:** Sai called it out. Sai formally re-posted WBS #21 prompt. Gate re-run with full PLAN ? AUDIT ? Confirmed. Proceed. protocol.
**Prevention:** Claude never self-initiates a WBS from the Excel. Sai always pastes column M.

### Incident 2 — B-028 + B-030: Silent null tenant_id inserts
**What:** Two tables had tenant_id NOT NULL. System-level inserts (no tenant context) failed silently.
**Discovery:** WBS #18 (B-028), WBS #21 (B-030).
**Recovery:** ALTER TABLE DROP NOT NULL applied to both. Verified at bee1701.
**Status:** CLOSED.

### Incident 3 — B-031: SLA Monitor Job Missing from WBS #22 Scope
**What:** TC-047 required an SLA monitor BullMQ job. Not included in WBS #22 build scope.
**Discovery:** WBS #23 gate.
**Impact:** P2. sla_breached field never set server-side. Client-side countdown works correctly.
**Recovery:** Logged as B-031. Fix scoped to WBS #24 opening step.

---

## PERMANENT RULES — APPLY TO EVERY SINGLE SESSION

RULE 1 — PERSONA: first line of every Sai message. Stay in persona.
RULE 2 — PLAN ? AUDIT ? EXECUTE. Never execute without Confirmed. Proceed.
RULE 3 — FRD is source of truth. Cite section for every decision.
RULE 4 — Production-grade. No any. RLS at DB. HMAC on webhooks.
RULE 5 — SESSION CLOSE every session.
RULE 6 — Active voice. No em dashes. Brevity.
RULE 7 — WBS is execution plan. Sai pastes column M. Claude never self-initiates.

---

## PROJECT CONTEXT

Platform: FlexForceNow (FFN) — DivIHN Integration Inc.
Domain: hirenowwithflex.us
Repo: https://github.com/rakshith1237/FFN-DII
Branch: feature/sprint-1-foundation
Local: C:\Users\SaiRakshith\FFN-DII
Node: 22.x local | CI: Node 20 | Next.js 16.2.6 | TypeScript strict

---

## TECH STACK (LOCKED)

Next.js 16.2.6 + TypeScript strict + Tailwind + shadcn/ui (Slate)
Supabase: https://xszzrfmhkpjuryyfzgaf.supabase.co | pgvector enabled
Upstash Redis: https://premium-ringtail-128254.upstash.io
Resend: noreply@hirenowwithflex.us
Mailgun inbound: vms.hirenowwithflex.us | signing key: 8fc31a3ebc1d7a0b403913ed32b6bede
DocuSign Developer Sandbox (D-012)
Anthropic Claude API: claude-sonnet-4-20250514
Vercel (frontend) | Render (BullMQ worker)
BullMQ: 15 queues + tier-escalation | worker: apps/worker/src/workers/index.ts
CI: GitHub Actions — 5 gates | Latest: CI #33 green (3d3253e)

---

## FLEXADMIN CREDENTIALS (dev)

Email: flexadmin@hirenowwithflex.us
Password: Testing@12345678
User ID: b336e166-16be-484a-8fdf-57c0b025102f

---

## TEST TENANTS

| Name | Type | Status | Settings |
|---|---|---|---|
| DIvIHN INC (id: 0e4e0a9e-...) | partner | active | 36 |
| Test Partner Corp | partner | active | 36 |
| Test Agency Corp | agency | active | 36 |

VMS domain: hirenowwithflex.us ? DIvIHN INC

---

## WBS COMPLETION STATUS

| WBS | Task | Code | Verified |
|---|---|---|---|
| #1-7 | Sprint 0 Infrastructure | ? | ? |
| #8-12 | Sprint 1 Foundation + Gate | ? | ? |
| #13-17 | Sprint 2 Auth + Gate | ? | ? |
| #18 | VMS Webhook + Claude Parser | ? | ?? TC-035/036 need Render |
| #19 | VMS Inbox 4-Zone UI | ? | ?? B-029 |
| #20 | JD Creation Form 8 Sections | ? | ?? B-029 |
| #21 | Sprint 3 Gate | ? | ?? Conditional PASS |
| #22 | Tier Config + Broadcast Engine | ? | ?? B-029 |
| #23 | Sprint 4 Gate | ? | ?? Conditional PASS |
| #24 | Next | ? | ? |

---

## FILES BUILT — WBS #22-23

### WBS #22 — Tier Config + Broadcast + ARM + A-Rec
src/lib/types/broadcast.ts (NEW)
src/lib/actions/tier/update-tier-config.ts (NEW)
src/lib/actions/jd/broadcast-jd.ts (NEW)
src/lib/actions/jd/publish-jd.ts (UPDATED — delegates to broadcastJD)
src/lib/actions/agency/accept-jd.ts (NEW)
src/lib/actions/agency/decline-jd.ts (NEW)
src/lib/actions/agency/assign-jd.ts (NEW)
src/app/partner/settings/tier-config/page.tsx (NEW)
src/components/partner/tier-config-client.tsx (NEW — @dnd-kit drag-drop)
src/app/agency/jd-inbox/page.tsx (NEW)
src/components/agency/jd-inbox-client.tsx (NEW)
src/app/agency/jd/[id]/assign/page.tsx (NEW)
src/components/agency/jd-assign-client.tsx (NEW)
src/app/agency/requirements/page.tsx (REPLACED shell)
src/components/agency/requirements-client.tsx (NEW)
apps/worker/src/workers/index.ts (tier-escalation processor added)

### WBS #23 — Gate
GATE_REPORTS.md (Sprint 4 gate appended)

---

## DATABASE MIGRATIONS APPLIED

| Migration | Description | Status |
|---|---|---|
| 000-004 | Core tables, RLS, triggers, pgvector | ? |
| 005 | x_ffn_vms_inbox columns | ? |
| 006 | x_ffn_job_description table | ? |
| 007 | x_ffn_job_description 16 columns | ? |
| 008 | x_ffn_tier_config + x_ffn_jd_assignment + jd_canonical_id | ? |
| B-028 fix | x_ffn_vms_inbox.tenant_id nullable | ? |
| B-030 fix | x_ffn_audit_log.tenant_id nullable | ? |

---

## BUG REGISTER — CURRENT STATE

| # | Bug | Priority | Status |
|---|---|---|---|
| B-025 | JWT hook no-op — persona_code absent | P2 | Open |
| B-027 | 36 settings vs 37 canonical | P2 | Open |
| B-028 | null tenant_id VMS insert | P2 | CLOSED bee1701 |
| B-029 | Persona-dependent gate tests | P2 | Open — WBS #24 |
| B-030 | HMAC audit log null tenant_id | P2 | CLOSED bee1701 |
| B-031 | SLA monitor job not built | P2 | Open — WBS #24 |

---

## DECISION REGISTER

| # | Decision | Detail |
|---|---|---|
| D-012 | DocuSign not OpenSign | All references |
| D-015 | Next.js 16.2.6 not 14 | Column M prompts say 14 — ignore |
| D-021 | JWT hook no-op | proxy.ts soft mode until B-025 fixed |
| D-023 | No route groups | src/app/[name]/ only |
| D-026 | seed_tenant_settings() SECURITY DEFINER | Bypasses FORCE RLS |
| D-027 | x_ffn_job_description = draft table | x_ffn_jd = canonical published record |

---

## CRITICAL RULES FOR NEW SESSIONS

1. FRD is source of truth — cite section for every decision
2. No route groups — D-023
3. Next.js 16.2.6 — params: Promise<{ id: string }> in page components
4. supabaseAdmin always: { auth: { autoRefreshToken: false, persistSession: false } }
5. requirePersona on every server action that modifies data
6. proxy.ts in soft mode — do not change until B-025 fixed
7. No any types — TypeScript strict throughout
8. Worker at apps/worker/ — separate tsconfig and package.json
9. Skills taxonomy empty — free-text until Sprint 5
10. x_ffn_vms_inbox.tenant_id nullable (B-028 fix applied)
11. x_ffn_audit_log.tenant_id nullable (B-030 fix applied)
12. x_ffn_job_description = draft/edit table. x_ffn_jd = published canonical record
13. jd_canonical_id column on x_ffn_job_description links to x_ffn_jd
14. @dnd-kit installed: @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
15. QUEUES.TIER_ESCALATION = 'tier-escalation' (confirmed consistent)
16. Claude NEVER self-initiates a WBS task — Sai always pastes column M

---

## WBS #24 ENTRY CONDITIONS (execute in order)

Step 1 — Fix B-031 (SLA monitor job):
  Create 'sla-monitor' queue processor in apps/worker/src/workers/index.ts
  Job: scan x_ffn_jd_broadcast WHERE status='pending' AND sla_deadline < now()
  Update: SET sla_breached=true
  Note: x_ffn_jd_broadcast does not have sla_deadline column yet
  Add column: ALTER TABLE x_ffn_jd_broadcast ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ
  Update broadcast-jd.ts to populate sla_deadline on insert

Step 2 — Close B-029 (create real persona accounts):
  FlexAdmin ? /flexadmin/tenants ? DIvIHN INC
  Send P-SA invite to real accessible email
  Accept invite ? P-SA account created
  P-SA creates: 1x P-HM, 1x P-Recruiter, 1x A-SA, 1x A-RM, 1x A-Rec
  Run deferred TC-043–045, TC-048, TC-INT-001

Step 3 — Build WBS #24 feature code (paste column M prompt)

---

## DESIGN SYSTEM TOKENS

Navy:    #0F2147
Orange:  #E8531E
Gray bg: #F9FAFB
Border:  #E5E7EB
Text:    #374151 (body) | #0F2147 (headings) | #6B7280 (secondary)
Error:   #DC2626 / #FEE2E2
Success: #16A34A / #DCFCE7
Warning: #D97706 / #FEF3C7
Tier 1:  #0F2147 text-white
Tier 2:  #DBEAFE text-[#1D4ED8]
Tier 3:  #CCFBF1 text-[#0F766E]
Input:   h-10 | focus ring-2 ring-[#3B82F6]
Sidebar: 240px | Top bar: 56px

---

*Handoff version: Post WBS #23 — 2026-05-20*
*Commit at close: 3d3253e*
*Next update: End of WBS #24*
