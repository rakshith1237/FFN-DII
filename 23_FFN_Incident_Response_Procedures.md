# FFN Incident Response Procedures
**Document:** 23_FFN_Incident_Response_Procedures.md
**Standard:** AICPA SOC 2 CC7.3 / ISO 27001 A.16
**Prepared by:** Security Engineer (WBS #49)
**Date:** 2026-05-22
**Owner:** Sai Rakshith — security@hirenowwithflex.us

---

## 1. Incident Classification

| Priority | Definition | Examples | Response SLA |
|---|---|---|---|
| P0 — Critical | Platform-wide outage or confirmed data breach | DB unreachable, mass PII exfiltration, ransomware | 15 minutes acknowledgement, 2 hours resolution |
| P1 — High | Significant feature failure or suspected security incident | RLS bypass confirmed, auth service down, payment processing failure | 1 hour acknowledgement, 8 hours resolution |
| P2 — Medium | Non-critical feature degraded or security anomaly | Single tenant BullMQ worker down, elevated error rate, suspicious login pattern | 4 hours acknowledgement, 24 hours resolution |
| P3 — Low | Minor issue, no data or security risk | Cosmetic UI bug, single user report, slow query | Next business day, 72 hours resolution |

---

## 2. Escalation Chain

| Role | Contact | Availability |
|---|---|---|
| Primary Responder | Sai Rakshith | 24/7 (P0/P1) |
| Data Protection Officer | dpo@hirenowwithflex.us | Business hours |
| Supabase Support | support@supabase.com | 24/7 (Pro plan) |
| Vercel Support | vercel.com/support | 24/7 |
| ICO (UK) — data breach notification | ico.org.uk | 72-hour GDPR window |

---

## 3. Response Procedures

### 3.1 Confirmed Data Breach (P0)

1. **Contain:** Immediately revoke all active sessions via Supabase dashboard. Suspend affected tenants via FlexAdmin.
2. **Assess:** Identify breach scope — which tables, which tenants, how many data subjects.
3. **Notify:** If 10+ data subjects affected: notify ICO within 72 hours. Notify affected tenants within 48 hours.
4. **Evidence:** Screenshot x_ffn_audit_log for the incident period. Export to secure storage.
5. **Remediate:** Patch the vulnerability. Re-run RLS test suite (vitest run) to confirm fix.
6. **Review:** Post-incident review within 5 business days. Update RISK_REGISTER.md.

### 3.2 Platform Outage (P0/P1)

1. **Detect:** Vercel status page + Supabase status page + BullMQ worker health.
2. **Communicate:** Post incident status to status page (if established) within 15 minutes.
3. **Restore:** Roll back Vercel deployment to last known good commit if code-caused. Escalate to Supabase/Vercel support if infrastructure-caused.
4. **Verify:** Run TypeScript build + vitest RLS suite post-restoration.
5. **Review:** Update RISK_REGISTER.md with RTO achieved.

### 3.3 Security Anomaly (P1/P2)

1. **Investigate:** Review x_ffn_audit_log for anomalous patterns. Check Vercel function logs.
2. **Isolate:** Suspend the affected user account(s) via FlexAdmin.
3. **Analyse:** Determine if data was accessed. Check RLS test suite integrity.
4. **Remediate:** Reset credentials. Revoke API keys if relevant.
5. **Document:** Add entry to RISK_REGISTER.md.

---

## 4. Incident Log

| ID | Date | Priority | Description | Resolution | RTO Achieved | Status |
|---|---|---|---|---|---|---|
| INC-2026-001 | 2026-05-22 | P3 | Dependabot: 1 moderate npm dependency alert (non-exploitable in FFN context) | Tracked in GitHub Security Advisories; dependency update scheduled | N/A | Open — V2.1 |
| INC-2026-002 | 2026-05-22 | P3 | ZAP active scanner blocked by Cloudflare WAF (F-001 in pentest report) | Expected behaviour — positive security indicator | N/A | Closed |

No P0 or P1 incidents during audit period.

---

## 5. Post-Incident Review Template

After every P0 or P1 incident, complete:

- **Incident ID:** INC-YYYY-NNN
- **Timeline:** Detection → Acknowledgement → Containment → Resolution
- **Root Cause:** (technical description)
- **Impact:** (data subjects affected, downtime minutes, tenants affected)
- **Actions Taken:** (containment, remediation)
- **Lessons Learned:** (process or control gaps identified)
- **Follow-up Tasks:** (with owner and due date)

---

## 6. Testing

Incident response procedures reviewed annually. Tabletop exercise recommended before V2.0 GA.
Next review date: 2027-05-22.

*Document produced: WBS #49 — 2026-05-22*