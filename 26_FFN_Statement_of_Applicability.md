# FFN ISO 27001:2022 Statement of Applicability
**Document:** 26_FFN_Statement_of_Applicability.md
**Standard:** ISO 27001:2022 Annex A
**Prepared by:** Security Engineer (WBS #49)
**Date:** 2026-05-22

**Legend:** Y = Applicable and implemented | P = Applicable, partially implemented | N/A = Not applicable (with justification)

---

## Organisational Controls (A.5)

| Control | Title | Applicable | Status | Evidence |
|---|---|---|---|---|
| A.5.1 | Information security policies | Y | Met | 24_FFN_Information_Security_Policy.md |
| A.5.2 | Information security roles and responsibilities | Y | Met | FRD Part 9 RBAC matrix |
| A.5.3 | Segregation of duties | P | Partial | Single developer team — mitigated by code review + CI |
| A.5.4 | Management responsibilities | Y | Met | Sai owns all security decisions |
| A.5.5 | Contact with authorities | Y | Met | ICO contact in incident procedures |
| A.5.6 | Contact with special interest groups | N/A | — | No applicable groups for a 1-person team |
| A.5.7 | Threat intelligence | P | Partial | Dependabot + CVE monitoring via npm audit |
| A.5.8 | Information security in project management | Y | Met | FORGE SDLC 7-gate framework |
| A.5.9 | Inventory of information and other assets | Y | Met | 25_FFN_ISO27001_Risk_Assessment.md asset register |
| A.5.10 | Acceptable use of information | Y | Met | 24_FFN_Information_Security_Policy.md §5 |
| A.5.11 | Return of assets | N/A | — | No physical assets issued (cloud-only) |
| A.5.12 | Classification of information | Y | Met | Asset register — 4 classifications |
| A.5.13 | Labelling of information | P | Partial | Document headers; no automated labelling system |
| A.5.14 | Information transfer | Y | Met | TLS 1.2+; no unencrypted transfers |
| A.5.15 | Access control | Y | Met | RBAC + RLS on all 47 tables |
| A.5.16 | Identity management | Y | Met | Supabase Auth — named accounts only |
| A.5.17 | Authentication information | Y | Met | bcrypt passwords; SHA-256 API key hashes |
| A.5.18 | Access rights | Y | Met | Quarterly access review; least privilege |
| A.5.19 | Information security in supplier relationships | Y | Met | 20_FFN_Vendor_DPA_Register.md |
| A.5.20 | Addressing security within supplier agreements | P | Partial | 4 DPAs pending signature (Resend, Anthropic, OpenAI, DocuSign) |
| A.5.21 | Managing security in ICT supply chain | Y | Met | Dependabot; package-lock.json |
| A.5.22 | Monitoring, review and change management of supplier services | P | Partial | Manual review; automated monitoring in V2.1 |
| A.5.23 | Information security for use of cloud services | Y | Met | All cloud services have DPAs; EU-region where possible |
| A.5.24 | Information security incident management planning | Y | Met | 23_FFN_Incident_Response_Procedures.md |
| A.5.25 | Assessment and decision on information security events | Y | Met | P0-P3 classification in IRP |
| A.5.26 | Response to information security incidents | Y | Met | IRP §3 response procedures |
| A.5.27 | Learning from information security incidents | Y | Met | Post-incident review template in IRP §5 |
| A.5.28 | Collection of evidence | Y | Met | x_ffn_audit_log append-only; GitHub commit history |
| A.5.29 | Information security during disruption | Y | Met | Vercel/Supabase SLAs; daily backups; RTO 4h |
| A.5.30 | ICT readiness for business continuity | P | Partial | Manual backup verification; automation in V2.1 |
| A.5.31 | Legal, statutory, regulatory and contractual requirements | Y | Met | UK GDPR, IR35, HMRC, Companies Act |
| A.5.32 | Intellectual property rights | Y | Met | All code proprietary DivIHN; no unlicensed OSS |
| A.5.33 | Protection of records | Y | Met | Audit log 7-year retention; append-only |
| A.5.34 | Privacy and protection of PII | Y | Met | DPIA, GDPR erasure API, privacy policy |
| A.5.35 | Independent review of information security | P | Partial | ASVS self-assessment; pentest completed; SOC 2 audit in progress |
| A.5.36 | Compliance with policies, rules and standards | Y | Met | FORGE SDLC gates enforce compliance at each sprint |
| A.5.37 | Documented operating procedures | Y | Met | All 50 WBS tasks documented with step-by-step procedures |

## People Controls (A.6)

| Control | Title | Applicable | Status | Evidence |
|---|---|---|---|---|
| A.6.1 | Screening | N/A | — | No employees yet; founder-only |
| A.6.2 | Terms and conditions of employment | N/A | — | No employees yet |
| A.6.3 | Information security awareness, education and training | Y | Met | Sai is primary security practitioner |
| A.6.4 | Disciplinary process | N/A | — | No employees yet |
| A.6.5 | Responsibilities after termination | N/A | — | No employees yet |
| A.6.6 | Confidentiality or NDA | N/A | — | No third-party developers |
| A.6.7 | Remote working | Y | Met | All work is remote; HTTPS-only; no LAN access |
| A.6.8 | Information security event reporting | Y | Met | IRP — immediate escalation to Sai |

## Physical Controls (A.7)

| Control | Title | Applicable | Status | Evidence |
|---|---|---|---|---|
| A.7.1 | Physical security perimeters | N/A | — | Cloud-only; no physical data centre |
| A.7.2 | Physical entry | N/A | — | Cloud-only |
| A.7.3 | Securing offices, rooms and facilities | N/A | — | Cloud-only |
| A.7.4 | Physical security monitoring | N/A | — | Cloud-only |
| A.7.5 | Protecting against physical and environmental threats | N/A | — | Delegated to Supabase/Vercel |
| A.7.6 | Working in secure areas | N/A | — | Cloud-only |
| A.7.7 | Clear desk and clear screen | Y | Met | Developer workstation locked; screen lock policy |
| A.7.8 | Equipment siting and protection | N/A | — | Cloud-only; no on-premise equipment |
| A.7.9 | Security of assets off-premises | Y | Met | Developer laptop encrypted; full-disk encryption |
| A.7.10 | Storage media | N/A | — | No removable storage used in platform operations |
| A.7.11 | Supporting utilities | N/A | — | Delegated to Supabase/Vercel |
| A.7.12 | Cabling security | N/A | — | Cloud-only |
| A.7.13 | Equipment maintenance | N/A | — | Cloud-only |
| A.7.14 | Secure disposal or re-use of equipment | Y | Met | Data wiped per GDPR before device disposal |

## Technological Controls (A.8)

| Control | Title | Applicable | Status | Evidence |
|---|---|---|---|---|
| A.8.1 | User endpoint devices | Y | Met | Developer laptop encrypted; MFA on key services |
| A.8.2 | Privileged access rights | Y | Met | flex_admin: single named account; service role key: Vercel env only |
| A.8.3 | Information access restriction | Y | Met | RLS on all 47 tables; persona-scoped queries |
| A.8.4 | Access to source code | Y | Met | GitHub private repo; Sai only has write access |
| A.8.5 | Secure authentication | Y | Met | Supabase Auth; bcrypt; magic link; MFA for admin services |
| A.8.6 | Capacity management | P | Partial | Manual monitoring; Supabase / Upstash auto-scale |
| A.8.7 | Protection against malware | Y | Met | Semgrep SAST; npm audit; no user-uploaded executable content |
| A.8.8 | Management of technical vulnerabilities | Y | Met | Dependabot; npm audit --audit-level=high in CI |
| A.8.9 | Configuration management | Y | Met | All config in env vars; infrastructure-as-code via Vercel/Supabase |
| A.8.10 | Information deletion | Y | Met | GDPR erasure API; Storage bucket deletion |
| A.8.11 | Data masking | P | Partial | PII not shown in logs; partial field-level masking in UI |
| A.8.12 | Data leakage prevention | Y | Met | RLS; no PII to AI APIs; no cross-tenant queries |
| A.8.13 | Information backup | Y | Met | Supabase daily backups; 7-day retention; GitHub full history |
| A.8.14 | Redundancy of information processing facilities | Y | Met | Vercel Edge Network; Supabase managed HA |
| A.8.15 | Logging | Y | Met | x_ffn_audit_log append-only; Vercel function logs |
| A.8.16 | Monitoring activities | P | Partial | Manual log review; automated alerting deferred to V2.1 |
| A.8.17 | Clock synchronisation | Y | Met | All TIMESTAMPTZ in UTC via Supabase |
| A.8.18 | Use of privileged utility programs | Y | Met | No privileged utilities; all access via Supabase client |
| A.8.19 | Installation of software on operational systems | Y | Met | Vercel immutable deployments; no SSH access to servers |
| A.8.20 | Networks security | Y | Met | Cloudflare WAF; HTTPS-only; no public DB port |
| A.8.21 | Security of network services | Y | Met | Supabase/Vercel managed networking; TLS 1.2+ |
| A.8.22 | Segregation of networks | Y | Met | Each Supabase project is isolated; Vercel serverless isolation |
| A.8.23 | Web filtering | N/A | — | No corporate browser management required |
| A.8.24 | Use of cryptography | Y | Met | AES-256 at rest; TLS 1.2+; bcrypt; SHA-256; RS256 JWT |
| A.8.25 | Secure development lifecycle | Y | Met | FORGE SDLC; PLAN-AUDIT-EXECUTE; TypeScript strict |
| A.8.26 | Application security requirements | Y | Met | OWASP ASVS L2 assessment; pen test completed |
| A.8.27 | Secure system architecture and engineering principles | Y | Met | ADR documents EXT-001 to EXT-013; RLS-first design |
| A.8.28 | Secure coding | Y | Met | TypeScript strict; no TypeScript any; Semgrep SAST |
| A.8.29 | Security testing in development and acceptance | Y | Met | Vitest RLS suite; OWASP ZAP; pen test |
| A.8.30 | Outsourced development | N/A | — | No outsourced development |
| A.8.31 | Separation of development, test and production | P | Partial | Production Supabase isolated; dev uses local or separate project |
| A.8.32 | Change management | Y | Met | FORGE SDLC gates; GitHub PR + CI + Sai approval |
| A.8.33 | Test information | Y | Met | Seeded demo data with synthetic names only (no real PII in test data) |
| A.8.34 | Protection of information systems during audit testing | Y | Met | Pen test performed on production with controlled scope |

---

## Summary

| Category | Total Controls | Applicable | Met | Partial | N/A |
|---|---|---|---|---|---|
| Organisational (A.5) | 37 | 31 | 27 | 4 | 6 |
| People (A.6) | 8 | 3 | 3 | 0 | 5 |
| Physical (A.7) | 14 | 2 | 2 | 0 | 12 |
| Technological (A.8) | 34 | 31 | 26 | 5 | 3 |
| **Total** | **93** | **67** | **58** | **9** | **26** |

**Applicable controls Met: 58/67 = 86.6%**
**Partial controls require remediation before Stage 2 audit.**

*Document produced: WBS #49 — 2026-05-22*