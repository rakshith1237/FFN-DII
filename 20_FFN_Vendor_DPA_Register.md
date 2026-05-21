# FFN Vendor DPA Register
**Document:** 20_FFN_Vendor_DPA_Register.md
**WBS:** #39 | Security Engineer
**Date:** 2026-05-21

---

## DPA Status Register

| # | Vendor | Role | DPA Status | Action Required |
|---|---|---|---|---|
| 1 | Supabase Inc. | DB / Auth / Storage | Covered by ToS DPA | None |
| 2 | Vercel Inc. | Frontend hosting | Covered by ToS DPA | None |
| 3 | Render Inc. | Worker hosting | Covered by ToS DPA | None |
| 4 | Upstash Inc. | Redis | Covered by ToS DPA | None |
| 5 | Resend Inc. | Email delivery | Manual sign required - Pending | Sai to sign before V1.0 GA |
| 6 | Anthropic Inc. | Claude AI API | Manual sign required - Pending | Sai to sign before V1.0 GA |
| 7 | OpenAI Inc. | Embeddings API | Manual sign required - Pending | Sai to sign before V1.0 GA |
| 8 | Stripe Inc. | Billing | Covered by ToS DPA | None |
| 9 | DocuSign Inc. | e-Signature | Manual sign required - Pending | Sai to sign before V1.0 GA |

---

## Storage Pattern

Signed DPA PDFs stored in Supabase Storage bucket: gdpr (private, created WBS 39)
Path: gdpr/dpa/{vendor}-dpa-{date}.pdf

## Pending Actions (Sai)

1. Resend DPA: https://resend.com/legal/dpa
2. Anthropic DPA: https://www.anthropic.com/legal/dpa
3. OpenAI DPA: https://openai.com/policies/data-processing-addendum
4. DocuSign DPA: https://www.docusign.com/company/privacy-policy/gdpr

*Document produced: WBS 39 - 2026-05-21*
