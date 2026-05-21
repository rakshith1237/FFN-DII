# FFN Data Protection Impact Assessment (DPIA)
**Document:** 11_FFN_DPIA.md
**Standard:** GDPR Article 35 | UK GDPR Schedule 1
**Prepared by:** Security Engineer (WBS #39)
**Date:** 2026-05-21
**Organisation:** DivIHN Integration Inc. — FlexForceNow Platform
**Data Controller:** DivIHN Integration Inc., Aberdeen, UK

---

## 1. Description of Processing

FlexForceNow (FFN) is a B2B SaaS workforce management platform. It processes personal data of:

| Data Subject Category | Examples |
|---|---|
| Candidates | Name, email, phone, CV/resume, location, skills, employment history, IR35 status, bank-rate expectations |
| Platform Users (HMs, Recruiters, ARMs) | Name, email, login timestamps, activity audit trail |
| Agency Staff | Same as Platform Users |
| Tenant Contacts | Primary contact name, email, billing details |

**Purpose of processing:** Facilitate contingent workforce recruitment, submission management, RTR e-signature, timesheet management, invoice processing, and AI-assisted candidate scoring.

**Legal basis:** Art. 6(1)(b) — Contract performance (for candidates who sign RTR); Art. 6(1)(f) — Legitimate interests (for user accounts and platform operations); Art. 6(1)(c) — Legal obligation (audit log retention for 7 years).

---

## 2. Necessity and Proportionality

| Data Element | Necessity | Retention Period | Legal Basis |
|---|---|---|---|
| Candidate PII (name, email, CV) | Core recruitment function | Duration of engagement + 12 months | Contract |
| Candidate IR35 status | HMRC compliance requirement | 7 years | Legal obligation |
| User login / session data | Security and audit | 90 days | Legitimate interests |
| Audit log (all actions) | Regulatory compliance, dispute resolution | 7 years (2555 days per settings) | Legal obligation |
| IntelliMatch score snapshots | AI scoring immutability (FRD §52.5) | Duration of JD + 12 months | Contract |
| DocuSign RTR signed documents | Contract evidence | 7 years | Legal obligation |
| Stripe billing data | Financial compliance | 7 years | Legal obligation |
| IP addresses in audit log | Security monitoring | 90 days then nullified | Legitimate interests |

**Data minimisation:** FFN collects only fields required for the contingent workforce lifecycle. Scoring factors use anonymised skill codes, not free-text that could identify protected characteristics.

---

## 3. Risk Assessment

| Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|
| Unauthorised cross-tenant data access | Low | High | Medium | RLS enforced at DB layer on all 42 tables; verified in automated test suite |
| AI scoring bias on protected characteristics | Low | High | Medium | Scoring factors are skill/experience based; no demographic inputs; override audit trail |
| Breach of candidate CV data | Low | High | Medium | Storage bucket private, service-role-only access; Supabase encryption at rest |
| Inadequate erasure on GDPR request | Low | High | Medium | Automated erasure job (gdprErasure.ts) covers all 42 tables; 72h SLA |
| Vendor sub-processor breach | Low | High | Medium | DPAs with all 9 vendors; EU-region Supabase instance |
| JWT token interception | Very Low | High | Medium | HTTPS only; short-lived JWT; Supabase session management |
| Insider threat (FlexAdmin abuse) | Very Low | High | Medium | FlexAdmin actions fully audited; no client-side data bypass |

**Overall risk level: MEDIUM — ACCEPTABLE with implemented mitigations**

---

## 4. Data Subject Rights Implementation

| Right | Implementation | SLA |
|---|---|---|
| Right of Access (Art. 15) | GET /api/gdpr/export?userId=X → JSON download | 30 days |
| Right to Erasure (Art. 17) | POST /api/gdpr/erasure → BullMQ job nullifies all PII | 72 hours |
| Right to Rectification (Art. 16) | Profile edit via authenticated screens | Immediate |
| Right to Restrict Processing (Art. 18) | Account suspension via FlexAdmin | Immediate |
| Right to Portability (Art. 20) | Same as Art. 15 — JSON export | 30 days |
| Right to Object (Art. 21) | Email support@hirenowwithflex.us | 30 days |

---

## 5. Sub-Processors

| Vendor | Role | DPA | Region | Transfer Mechanism |
|---|---|---|---|---|
| Supabase Inc. | Database, Auth, Storage, Realtime | Supabase DPA (ToS) | EU West (London) | UK adequacy / SCCs |
| Vercel Inc. | Frontend hosting, CDN, serverless | Vercel DPA | EU (Frankfurt) | SCCs |
| Render Inc. | BullMQ worker hosting | Render DPA (ToS) | EU (Frankfurt) | SCCs |
| Upstash Inc. | Redis queue | Upstash DPA | EU | SCCs |
| Resend Inc. | Transactional email | Resend DPA | US | SCCs |
| Anthropic Inc. | Claude AI API (VMS parsing, smart write, IntelliMatch) | Anthropic DPA | US | SCCs |
| OpenAI Inc. | Embeddings API (pgvector bench index) | OpenAI DPA | US | SCCs |
| Stripe Inc. | Subscription billing, payment processing | Stripe DPA | EU | SCCs |
| DocuSign Inc. | RTR e-signature | DocuSign DPA | EU | SCCs |

**Note:** Anthropic and OpenAI process job description text and skill descriptions only. No candidate PII is sent to AI APIs. Candidate names, emails, and CVs are never included in AI prompts.

---

## 6. Conclusion

Processing is necessary, proportionate, and conducted with appropriate safeguards. Risk level is MEDIUM-ACCEPTABLE. This DPIA will be reviewed annually and upon any material change to processing activities.

**DPO Contact:** dpo@hirenowwithflex.us (to be established)
**Review Date:** 2027-05-21

*Document produced: WBS #39 — 2026-05-21*
