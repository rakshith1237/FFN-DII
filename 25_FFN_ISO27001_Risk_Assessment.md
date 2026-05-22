# FFN ISO 27001 Risk Assessment
**Document:** 25_FFN_ISO27001_Risk_Assessment.md
**Standard:** ISO 27001:2022 §6.1.2
**Prepared by:** Security Engineer (WBS #49)
**Date:** 2026-05-22
**Next Review:** 2027-05-22

---

## 1. Asset Register

| ID | Asset | Type | Owner | Classification |
|---|---|---|---|---|
| A-001 | Supabase PostgreSQL database | Data | Sai Rakshith | Restricted |
| A-002 | Candidate PII (names, CVs, emails) | Data | Partner tenants (controller) | Restricted |
| A-003 | Platform user credentials | Data | Sai Rakshith | Restricted |
| A-004 | Source code (GitHub) | Software | Sai Rakshith | Confidential |
| A-005 | Environment variables / secrets (Vercel) | Data | Sai Rakshith | Restricted |
| A-006 | Stripe billing credentials | Data | Sai Rakshith | Restricted |
| A-007 | Vercel deployment pipeline | Service | Sai Rakshith | Internal |
| A-008 | BullMQ worker (Render) | Service | Sai Rakshith | Internal |
| A-009 | Upstash Redis (queue + rate limit) | Service | Sai Rakshith | Internal |
| A-010 | Supabase Storage (resumes, DPAs, IR35) | Data | Sai Rakshith | Restricted |
| A-011 | Audit log (x_ffn_audit_log) | Data | Sai Rakshith | Confidential |
| A-012 | API keys (x_ffn_api_keys, hashed) | Data | Partner tenants | Restricted |

---

## 2. Threat Catalogue

| ID | Threat | Category |
|---|---|---|
| T-001 | Unauthorised cross-tenant data access | Confidentiality |
| T-002 | SQL injection | Confidentiality / Integrity |
| T-003 | Compromised admin (flex_admin) credential | Confidentiality / Integrity |
| T-004 | Supply chain attack via npm dependency | Integrity / Availability |
| T-005 | Infrastructure outage (Vercel / Supabase) | Availability |
| T-006 | Ransomware / data destruction | Availability / Integrity |
| T-007 | Insider threat (developer access abuse) | Confidentiality |
| T-008 | JWT token theft / session hijacking | Confidentiality |
| T-009 | GDPR non-compliance (erasure failure) | Compliance |
| T-010 | AI prompt injection / data leakage via AI | Confidentiality |
| T-011 | DDoS attack | Availability |
| T-012 | Brute force authentication | Confidentiality |
| T-013 | Misconfigured RLS policy | Confidentiality |
| T-014 | API key compromise | Confidentiality |

---

## 3. Risk Assessment Matrix (Likelihood × Impact)

**Scale:** 1 = Very Low, 2 = Low, 3 = Medium, 4 = High, 5 = Critical

| Risk ID | Threat | Asset | Likelihood | Impact | Inherent Risk | Control | Residual Risk | Treatment |
|---|---|---|---|---|---|---|---|---|
| R-001 | T-001 Cross-tenant access | A-002 | 2 | 5 | 10 | RLS on 47 tables, automated test suite | 2 | Accept |
| R-002 | T-002 SQL injection | A-001 | 1 | 5 | 5 | PostgREST parameterised queries, TypeScript types | 1 | Accept |
| R-003 | T-003 Admin credential compromise | A-001 | 2 | 5 | 10 | MFA on GitHub/Supabase, single named account | 4 | Treat — add hardware MFA token in V2.1 |
| R-004 | T-004 Supply chain attack | A-004 | 2 | 4 | 8 | Dependabot, npm audit in CI, package-lock | 4 | Accept |
| R-005 | T-005 Infrastructure outage | A-007 | 2 | 3 | 6 | Vercel/Supabase SLAs, daily backups, RTO 4h | 4 | Accept |
| R-006 | T-006 Ransomware | A-001 | 1 | 5 | 5 | Supabase managed, daily backups, no direct DB port | 2 | Accept |
| R-007 | T-007 Insider threat | A-001 | 1 | 5 | 5 | Audit log, quarterly access review, minimal team | 2 | Accept |
| R-008 | T-008 JWT theft | A-003 | 2 | 4 | 8 | httpOnly cookies, short expiry, HTTPS-only | 3 | Accept |
| R-009 | T-009 GDPR erasure failure | A-002 | 2 | 4 | 8 | BullMQ erasure job, 72h SLA, audit log | 2 | Accept |
| R-010 | T-010 AI prompt injection | A-002 | 2 | 3 | 6 | No PII in AI prompts, skill text only | 2 | Accept |
| R-011 | T-011 DDoS | A-007 | 3 | 3 | 9 | Cloudflare WAF, Vercel Edge rate limiting | 4 | Accept — add WAF rules in V2.1 |
| R-012 | T-012 Brute force auth | A-003 | 3 | 3 | 9 | 5 attempts / 15 min rate limit (Upstash) | 3 | Accept |
| R-013 | T-013 RLS misconfiguration | A-001 | 2 | 5 | 10 | Automated RLS test suite (15/15 pass) | 2 | Accept |
| R-014 | T-014 API key compromise | A-012 | 2 | 3 | 6 | SHA-256 hash storage, scope enforcement, rate limit | 2 | Accept |

**Residual risks >= 6:** R-003 (admin MFA), R-004 (supply chain), R-005 (infra), R-011 (DDoS)
All accepted for V2.0 with documented treatment plans for V2.1.

---

## 4. Risk Treatment Plan

| Risk ID | Treatment | Owner | Target Date |
|---|---|---|---|
| R-003 | Add hardware FIDO2/YubiKey MFA for Sai's GitHub and Supabase accounts | Sai | V2.1 Sprint 1 |
| R-004 | Implement automated dependency patching schedule (weekly Dependabot PRs) | Sai | V2.1 Sprint 1 |
| R-005 | Implement automated uptime monitoring with alerting (PagerDuty or equivalent) | Sai | V2.1 Sprint 2 |
| R-011 | Configure Cloudflare WAF rate limiting rules (IP-based, beyond bot management) | Sai | V2.1 Sprint 1 |

*Document produced: WBS #49 — 2026-05-22*