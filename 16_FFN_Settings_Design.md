# FFN Settings Design — V1.0 Beta
**Document:** 16_FFN_Settings_Design.md
**WBS:** #36 | Sprint 12-13
**FRD Reference:** Section 96
**Date:** 2026-05-21

---

## 1. Architecture Overview

FFN uses a 3-tier settings hierarchy stored in `x_ffn_setting`:

| Tier | Scope | key | Override by |
|---|---|---|---|
| 3 | Platform (global defaults) | tier=3, tenant_id=null, user_id=null | flex_admin only |
| 2 | Tenant (per org) | tier=2, tenant_id=X, user_id=null | p_super_admin / a_super_admin |
| 1 | User (per person) | tier=1, tenant_id=X, user_id=Y | the user themselves |

Resolution order: User (tier=1) → Tenant (tier=2) → Platform (tier=3). First found wins.

---

## 2. getSetting() Resolver

```typescript
getSetting(key: string, opts?: { userId?: string; tenantId?: string }): Promise<string | null>
```

Algorithm:
1. Check in-memory cache (Map<string, { value, expiresAt }>). If hit and not expired: return cached.
2. If opts.userId: query tier=1 WHERE user_id=userId AND key=key
3. If opts.tenantId: query tier=2 WHERE tenant_id=tenantId AND key=key
4. Query tier=3 WHERE key=key (platform default)
5. Cache result with 5-min TTL. Return value or null.

---

## 3. All 37 Settings Keys

| # | Key | Type | Default | Group | Min Tier Override |
|---|---|---|---|---|---|
| 1 | session_timeout_minutes | integer | 480 | Auth | tenant |
| 2 | max_concurrent_sessions | integer | 1 | Auth | tenant |
| 3 | invite_link_expiry_hours | integer | 72 | Auth | tenant |
| 4 | audit_retention_days | integer | 2555 | Audit | tenant |
| 5 | mode_d_threshold | integer | 3 | VMS | tenant |
| 6 | agency_sla_hours | integer | 48 | Agency | tenant |
| 7 | tier_hold_window_hours_default | integer | 24 | Agency | tenant |
| 8 | ha_approval_required | boolean | true | Headcount | tenant |
| 9 | ha_approver_role | string | p_super_admin | Headcount | tenant |
| 10 | override_allowed | boolean | true | Override | tenant |
| 11 | technical_fit_dimension_weight_default | integer | 60 | Scoring | tenant |
| 12 | auxiliary_fit_dimension_weight_default | integer | 40 | Scoring | tenant |
| 13 | offer_rec_strong_threshold_default | integer | 80 | Scoring | tenant |
| 14 | offer_rec_recommend_threshold_default | integer | 60 | Scoring | tenant |
| 15 | offer_rec_borderline_threshold_default | integer | 40 | Scoring | tenant |
| 16 | anonymous_panel_mode_default | boolean | false | Interview | tenant |
| 17 | scorecard_deadline_hours | integer | 48 | Interview | tenant |
| 18 | bench_first_enforcement | string | required | Bench | tenant |
| 19 | market_rate_enabled | boolean | true | Market Rate | tenant |
| 20 | market_rate_min_records | integer | 10 | Market Rate | tenant |
| 21 | max_submission_quota_per_recruiter | integer | 10 | Submission | tenant |
| 22 | default_submission_quota | integer | 3 | Submission | tenant |
| 23 | default_rtr_expiry_days | integer | 7 | RTR | tenant |
| 24 | payment_terms_default | string | net_30 | Finance | tenant |
| 25 | ttf_benchmark_days_stage_1 | integer | 2 | TTF | tenant |
| 26 | ttf_benchmark_days_stage_2 | integer | 5 | TTF | tenant |
| 27 | ttf_benchmark_days_stage_3 | integer | 7 | TTF | tenant |
| 28 | ttf_benchmark_days_stage_4 | integer | 5 | TTF | tenant |
| 29 | ttf_benchmark_days_stage_5 | integer | 3 | TTF | tenant |
| 30 | co_employment_alert_threshold_days | integer | 730 | Compliance | tenant |
| 31 | auto_rebench_on_conclusion | boolean | false | Placement | tenant |
| 32 | timesheet_overdue_reminder_days | integer | 5 | Timesheet | tenant |
| 33 | sla_breach_notification_hours | integer | 24 | Notifications | tenant |
| 34 | calendar_gap_threshold_days | integer | 14 | Calendar | tenant |
| 35 | analytics_export_anonymize_agencies | boolean | false | Analytics | tenant |
| 36 | onboarding_task_template_version | integer | 1 | Onboarding | tenant |
| 37 | offboarding_task_template_version | integer | 1 | Offboarding | tenant |

---

## 4. Super Admin Edit Rules

- P-SA can edit tier=2 rows for their own tenant (partner settings)
- A-SA can edit tier=2 rows for their own tenant (agency settings)
- flex_admin can edit tier=3 rows (platform defaults)
- Editing creates or updates the tier=2 row. Platform default (tier=3) is never deleted.
- UI shows: current resolved value + source badge (Platform / Tenant / User)

---

*Document produced: WBS #36 · 2026-05-21*
