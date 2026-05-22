# FlexForceNow Information Security Policy
**Document:** 24_FFN_Information_Security_Policy.md
**Standard:** ISO 27001:2022 §5.2
**Version:** 1.0
**Date:** 2026-05-22
**Owner:** Sai Rakshith, DivIHN Integration Inc.
**Review Cycle:** Annual (next review: 2027-05-22)

---

## 1. Purpose and Scope

This Information Security Policy establishes the framework for protecting information assets of DivIHN Integration Inc. and its customers using the FlexForceNow platform. It applies to all systems, data, personnel, and third-party sub-processors involved in the delivery of FlexForceNow.

**In scope:** FlexForceNow SaaS platform (hirenowwithflex.us), all customer data, all infrastructure components (Supabase, Vercel, Render, Upstash), all development and operational activities.

---

## 2. Policy Objectives

DivIHN Integration Inc. is committed to:

1. **Confidentiality** — Protecting customer and candidate data from unauthorised disclosure. All data is isolated at the database layer using Row-Level Security. No cross-tenant data access is possible.

2. **Integrity** — Ensuring data accuracy and completeness. Append-only audit logs preserve an immutable record of all significant actions. IntelliMatch scores are immutable once set.

3. **Availability** — Maintaining platform availability consistent with customer commitments. Target: 99.5% monthly uptime. Recovery Time Objective: 4 hours.

4. **Compliance** — Meeting all applicable legal and regulatory obligations including UK GDPR, IR35 legislation, Companies Act 2006, and HMRC requirements.

---

## 3. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| CEO / Lead Engineer (Sai Rakshith) | Owns this policy. Approves all security changes. Primary incident responder. |
| Data Protection Officer | Manages GDPR compliance. Handles data subject requests. Contact: dpo@hirenowwithflex.us |
| All Developers | Follow secure coding standards. Use approved tools. Report suspected incidents immediately. |
| FlexAdmin | Controls tenant access and suspension. Manages GDPR erasure requests. |

---

## 4. Security Principles

**4.1 Least Privilege** — Every persona can access only what their role requires. RBAC enforced at both application and database layers.

**4.2 Defence in Depth** — Security controls operate at multiple layers: Cloudflare WAF (perimeter), Vercel HTTPS (transport), JWT validation (application), RLS (database).

**4.3 Secure by Default** — New tables have RLS enabled with FORCE ROW LEVEL SECURITY. No public access by default. All deny-unless-explicitly-permitted.

**4.4 Encryption** — All data encrypted at rest (AES-256 via Supabase). All data encrypted in transit (TLS 1.2+).

**4.5 Audit Everything** — All significant actions logged in x_ffn_audit_log (append-only, 7-year retention). No audit log deletion possible.

**4.6 Incident Response** — All security incidents classified and responded to per 23_FFN_Incident_Response_Procedures.md.

---

## 5. Acceptable Use

All access to FlexForceNow systems must be for legitimate business purposes only. The following are strictly prohibited:

- Accessing another tenant's data
- Sharing credentials or API keys
- Processing personal data without lawful basis
- Circumventing security controls
- Using the platform for any unlawful purpose

Violations will result in immediate account suspension and may result in legal action.

---

## 6. Third-Party and Supply Chain Security

All sub-processors assessed against GDPR requirements before engagement. Sub-processor list maintained in 20_FFN_Vendor_DPA_Register.md. DPAs required from all sub-processors processing personal data on behalf of customers.

---

## 7. Business Continuity

Database backups: daily (Supabase managed, 7-day retention).
Code repository: GitHub with full history.
Recovery procedures: documented in 22_FFN_SOC2_Evidence_Pack.md §7.2.

---

## 8. Review and Compliance

This policy is reviewed annually by the CEO. All personnel with access to FlexForceNow systems are expected to read and comply with this policy. Non-compliance is treated as a security incident.

---

**Signed:**

Sai Rakshith
Chief Executive Officer, DivIHN Integration Inc.
Date: _______________

*Document version 1.0 — produced WBS #49 — 2026-05-22*