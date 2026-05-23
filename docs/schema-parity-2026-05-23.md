# Dev/Prod Schema Parity — T-047
Date: 2026-05-23
DEV  (xszzrfmhkpjuryyfzgaf): 42 tables
PROD (mnrwchtpethrbfdivkaa): 52 tables

## Missing in DEV
- x_ffn_agency_factor_override
- x_ffn_api_keys
- x_ffn_approved_headcount
- x_ffn_budget_request
- x_ffn_ir35_sds
- x_ffn_jd_geo_rule
- x_ffn_market_rate
- x_ffn_notification
- x_ffn_offer_counter
- x_ffn_onboarding_document
- x_ffn_sso_config

## Extra in DEV (test artifacts)
+ x_ffn_jd_factor_scenario

## Verdict
ACTION REQUIRED — DEV missing 11 table(s).
