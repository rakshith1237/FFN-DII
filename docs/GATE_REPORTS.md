# FFN Gate Reports

## T-024 — Co-employment Alert Verification
Date: 2026-05-23
Result: PASS

Thresholds verified: 365-day, 548-day, 730-day
Test placement: start_date = now() - 730 days (totalDays=731)
Alerts fired: 3/3
Alert records created in x_ffn_engagement_alert: CONFIRMED
Test data cleaned up: CONFIRMED
offer_id NOT NULL restored: CONFIRMED

Bug found and fixed: engagement page + action-alert.ts + alerts page
used incorrect column name `actioned` — corrected to `is_actioned`.
Fix committed: 5f8ac6b