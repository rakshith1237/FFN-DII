# FFN Gate Reports

---

## Sprint 3 Gate — WBS #21 — 2026-05-19
**Persona:** QA Lead + Security Engineer
**Decision:** CONDITIONAL PASS
**Commit:** bee1701

---

### Group A — Verified (6 criteria)

| TC | Description | Result | Evidence |
|---|---|---|---|
| HMAC-001 | Wrong signature ? 403, clean body, no data leak | PASS | PowerShell (403) Forbidden exception |
| TC-032 | Known domain ? x_ffn_vms_inbox row, parse_status=pending, vms_mode=A | PASS | SQL row id=57eef0b1 confirmed |
| TC-NEG-004 | BR-JD-001 dual binding check in publish-jd.ts | PASS | Select-String lines 48+52 |
| TC-NEG-006 | Unknown domain ? 200 returned, zero notifications | PASS | HTTP 200 confirmed |
| ZAP-PASSIVE | GET ? 405, 403 body=clean JSON only | PASS | PowerShell (405) exception |
| TYPESCRIPT | Root exit 0, Worker exit 0, CI #28 green | PASS | Terminal + GitHub Actions |

### Group B — Deferred to WBS #22 (infrastructure-blocked, not code-defect-blocked)

| TC | Description | Blocker | Resolution |
|---|---|---|---|
| TC-033 | BullMQ ? Claude API ? extracted_data + confidence_map | Render worker not deployed | Deploy worker in WBS #22 |
| TC-034 | VMS Inbox filter tabs render with correct counts | No P-Recruiter account | Create via invite in WBS #22 |
| TC-035 | Green/amber rows by confidence threshold | No parsed inbox record | Follows TC-033 |
| TC-036 | Accept disabled when job_title absent | No P-Recruiter session | Follows TC-034 |
| TC-037 | Accept enabled when job_title + start_date present | No P-Recruiter session | Follows TC-034 |
| TC-038 | Accept ? Draft JD created, toast shown | No P-Recruiter session | Follows TC-034 |
| TC-039 | All 8 JD form sections render and save | No P-HM account | Create via invite in WBS #22 |
| TC-040 | AI Smart Write updates Tiptap editor | No P-HM session | Follows TC-039 |
| TC-NEG-005 | acceptVmsItem on rejected item ? BR-VMS-004 error | No rejected inbox records | Follows TC-038 |
| TC-INT-001 | Full end-to-end: Mailgun ? Inbox ? Accept ? JD ? Publish | All above blockers | Final test in WBS #22 |
| ZAP-DOCKER | Full OWASP ZAP baseline scan | Docker not installed | Install Docker Desktop in WBS #22 |

### Bug Register — Final Status

| # | Bug | Root Cause | Status |
|---|---|---|---|
| B-025 | JWT hook no-op — persona_code absent from JWT | Supabase hook free-tier limitation | Open — WBS #22 |
| B-027 | 36 settings seeded vs 37 canonical | 37th key not identified in FRD | Open — WBS #22 |
| B-028 | x_ffn_vms_inbox failed-domain row not inserting | null tenant_id NOT NULL constraint | CLOSED — ALTER TABLE applied, row confirmed in DB |
| B-029 | Persona-dependent gate tests deferred | No real P-SA/P-HM/P-Rec accounts | Open — WBS #22 |
| B-030 | x_ffn_audit_log HMAC failure not persisting | null tenant_id NOT NULL constraint | CLOSED — ALTER TABLE applied, audit row confirmed in DB |

### Gate Condition
B-029 must close in WBS #22 before Sprint 3 is fully signed off.
B-028 and B-030 are CLOSED as of commit bee1701.

### Sign-off
Recorded by: QA Lead + Security Engineer
Approved by: Sai Rakshith (DivIHN Integration Inc.)
Date: 2026-05-19
