# FFN Gate Reports

## Sprint 3 Gate — WBS #21 — 2026-05-19

**DECISION: CONDITIONAL PASS**

### Passed Tests
| TC | Description | Result |
|---|---|---|
| TC-032 | Mailgun HMAC + known domain ? 200 + pending row | PASS |
| HMAC-001 | Wrong signature ? 403, clean body | PASS |
| TC-NEG-004 | BR-JD-001 dual binding in publish-jd.ts | PASS (code) |
| TC-NEG-006 | Unknown domain ? 200, no notification | PASS |
| SEC-001 | GET /api/vms/inbound ? 405 | PASS |
| SEC-002 | 403 body contains no stack trace or env vars | PASS |
| TypeScript | Root + worker both exit 0 | PASS |
| CI | GitHub Actions CI #28 green | PASS |

### Deferred (B-029) — WBS #22
- TC-034 to TC-040: require real P-Recruiter / P-HM accounts
- TC-INT-001: full end-to-end integration test
- TC-NEG-005: BR-VMS-004 (no non-pending rows yet)

### Bugs Logged
| # | Bug | Priority | Fix Sprint |
|---|---|---|---|
| B-025 | JWT hook — persona_code absent | P2 | Sprint 3 remaining |
| B-027 | 36 vs 37 settings | P2 | Sprint 3 remaining |
| B-028 | VMS failed-domain row not inserting (null tenant_id NOT NULL) | P2 | WBS #22 |
| B-029 | Persona-dependent gate tests deferred | P2 | WBS #22 |
| B-030 | HMAC audit log not persisting (null tenant_id NOT NULL) | P2 | WBS #22 |

### Gate Condition
B-028 and B-030 must be fixed before Sprint 3 is fully closed.
Sprint 4 may begin in parallel.
