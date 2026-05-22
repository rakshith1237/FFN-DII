# FFN SOC 2 Type II Evidence Pack
**Document:** 22_FFN_SOC2_Evidence_Pack.md
**Standard:** AICPA SOC 2 Type II — Trust Services Criteria
**Prepared by:** Product Owner / Security Engineer (WBS #49)
**Date:** 2026-05-22
**Organisation:** DivIHN Integration Inc. — FlexForceNow Platform
**Audit Period:** 2026-01-01 to 2026-05-22 (Type I window; Type II period begins on auditor engagement)

---

## 1. CC1 — Control Environment

### 1.1 Organisational Structure
- **Entity:** DivIHN Integration Inc., Aberdeen, Scotland, UK
- **Primary Owner:** Sai Rakshith (CEO / Lead Engineer)
- **Data Protection Contact:** dpo@hirenowwithflex.us
- **Platform:** FlexForceNow SaaS — hirenowwithflex.us

### 1.2 Code of Conduct / Acceptable Use
All platform access requires authentication via Supabase JWT. FlexAdmin access requires a named account held by Sai. No anonymous access to any platform data exists.

### 1.3 RBAC Summary
Seven personas defined in FRD Part 9: p_hiring_manager, p_super_admin, p_recruiter (Partner); a_recruiter, a_recruiting_manager, a_super_admin (Agency); flex_admin. Each persona has a documented permission matrix in 02_FORGE_SDLC_Framework.md.

---

## 2. CC2 — Communication and Information

### 2.1 Privacy Policy
Published at: https://hirenowwithflex.us/privacy (WBS #44)
GDPR compliant — 11 sections, DPO contact listed, 9 sub-processors documented.

### 2.2 Terms of Service
Published at: https://hirenowwithflex.us/terms (WBS #44)
Covers: service scope, billing, IR35 disclaimer, governing law (Scotland).

### 2.3 Sub-Processor Communication
All 9 sub-processors listed in Privacy Policy and 20_FFN_Vendor_DPA_Register.md with DPA status.

---

## 3. CC3 — Risk Assessment

### 3.1 Risk Assessment Document
See: 25_FFN_ISO27001_Risk_Assessment.md
Annual review cycle established. Last assessed: 2026-05-22.

### 3.2 Identified High Risks and Controls

| Risk | Control | Status |
|---|---|---|
| Cross-tenant data access | RLS enforced on all 47 tables; automated test suite (15/15 pass) | Mitigated |
| Compromised admin credentials | flex_admin is single named account; MFA on GitHub and Supabase | Mitigated |
| Supply chain attack (npm) | Dependabot enabled; npm audit in CI; package-lock.json integrity | Mitigated |
| Data breach of candidate PII | AES-256 at rest (Supabase); TLS 1.2+ in transit; private Storage buckets | Mitigated |
| GDPR erasure failure | Automated BullMQ erasure job; 72h SLA; audit log confirmation | Mitigated |

---

## 4. CC6 — Logical and Physical Access Controls

### 4.1 Access Provisioning
All platform users are provisioned via Supabase Auth (magic link or password). No shared credentials exist.
FlexAdmin access: single named account, login logged in x_ffn_audit_log.

### 4.2 Quarterly Access Review
Access review process: FlexAdmin runs quarterly query against x_ffn_user_profile to confirm active users match current employment. Deprovisioned users: set is_active=false + revoke Supabase session.

**Access Review Log:**

| Quarter | Reviewer | Users Reviewed | Actions Taken | Date |
|---|---|---|---|---|
| Q1 2026 | Sai Rakshith | 8 test accounts | None required | 2026-03-31 |
| Q2 2026 | Sai Rakshith | Pending | — | 2026-06-30 |

### 4.3 Change Management
All code changes require:
1. GitHub Pull Request with passing CI (TypeScript + npm audit)
2. Sai approval before merge
3. Commit message follows [sprint-N][WBS-N] convention
4. Vercel auto-deploys on main branch push only

**Evidence:** GitHub repository rakshith1237/FFN-DII — all 50+ WBS commits with CI status.

### 4.4 Authentication Controls
- Password minimum: 12 characters (Supabase Auth)
- Magic link expiry: 1 hour
- Session timeout: configurable per tenant (default 480 minutes)
- Rate limiting: 5 auth attempts per 15 minutes (Upstash)
- All auth via POST — no credentials in URL

### 4.5 API Key Management (WBS #49)
- SHA-256 hash only stored — raw key shown once on generation
- Rate limit: 100 requests/minute per key (Upstash sliding window)
- Scopes: read / write — enforced per endpoint
- Revocation: is_active=false immediately blocks key

---

## 5. CC7 — System Operations

### 5.1 Monitoring
- **Uptime monitoring:** Vercel deployment health checks on every deploy
- **Queue depth:** Upstash Redis console — monitored manually; alerting to be added in V2.1
- **Error tracking:** Vercel function logs (production)
- **Audit log:** x_ffn_audit_log append-only, 7-year retention, all significant actions logged

### 5.2 Incident Response
See: 23_FFN_Incident_Response_Procedures.md
No P0 or P1 incidents recorded during audit period.

### 5.3 Vulnerability Management
- Dependabot: enabled on rakshith1237/FFN-DII (1 moderate dependency alert — tracked, non-exploitable in FFN context)
- npm audit: runs on every CI push (npm audit --audit-level=high)
- Semgrep SAST: configured in CI pipeline
- OWASP ASVS L2: 89.9% Met (152/169 applicable controls) — see 19_FFN_ASVS_Assessment.md
- Penetration test: 0 Critical, 0 High findings — see 21_FFN_Pentest_Report.md

---

## 6. CC8 — Change Management

### 6.1 Change Process
All changes follow FORGE SDLC (7-gate framework — see 02_FORGE_SDLC_Framework.md):
GATE 1: Sprint planning → GATE 2: Implementation → GATE 3: Code review → GATE 4: CI pass → GATE 5: Deployment → GATE 6: Verification → GATE 7: Gate sign-off

### 6.2 Change Evidence
GitHub commits follow format: [sprint-N][WBS-N] description
50 WBS tasks completed with commit evidence from sprint-1 (WBS-1) through sprint-37 (WBS-48).

---

## 7. CC9 — Risk Mitigation

### 7.1 Sub-Processor Risk
All 9 sub-processors assessed in 20_FFN_Vendor_DPA_Register.md.
4 DPAs requiring manual signature (Resend, Anthropic, OpenAI, DocuSign) — pending Sai action before V2.0 GA.

### 7.2 Business Continuity
- Database: Supabase managed backups (daily, 7-day retention on Pro plan)
- Code: GitHub repository with full history
- Secrets: Vercel environment variables (encrypted at rest)
- Recovery Point Objective (RPO): 24 hours
- Recovery Time Objective (RTO): 4 hours (redeploy to Vercel from GitHub)

---

## 8. Availability (A1)

### 8.1 Uptime Commitment
Target: 99.5% monthly uptime.
Infrastructure: Vercel Edge Network (99.99% SLA) + Supabase (99.9% SLA).

### 8.2 Capacity Planning
BullMQ workers: auto-scaled on Render. Upstash Redis: serverless, no capacity limit.
Supabase: row-level quotas monitored via Supabase dashboard.

---

## 9. Confidentiality (C1)

Candidate PII: accessible only to the tenant that created it (RLS).
Cross-tenant queries: impossible at DB layer (RLS FORCE on all 47 tables).
AI processing: skill descriptions only — no PII sent to Anthropic or OpenAI APIs.

---

## 10. Privacy (P-Series)

Full privacy programme documented in 11_FFN_DPIA.md.
GDPR rights implementation: Right to Erasure (72h), Right to Access (30 days), Right to Portability.
GDPR erasure API: POST /api/gdpr/erasure (WBS #39).
Privacy policy: https://hirenowwithflex.us/privacy

---

## Auditor Action Items

| Item | Owner | Due |
|---|---|---|
| Provide GitHub access for change management review | Sai | On auditor request |
| Provide Supabase dashboard access (read-only) | Sai | On auditor request |
| Complete Q2 2026 access review | Sai | 2026-06-30 |
| Sign 4 pending DPAs (Resend, Anthropic, OpenAI, DocuSign) | Sai | Before V2.0 GA |
| Enrol in SOC 2 Type II audit with Prescient Assurance or equivalent | Sai | Immediate |

*Document produced: WBS #49 — 2026-05-22*