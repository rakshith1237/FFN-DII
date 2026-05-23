# SecurityHeaders.com Grade A — Evidence Record

**Scan Date:** 23 May 2026 15:36:20 UTC
**URL:** https://hirenowwithflex.us
**Grade:** A (capped at A — see notes)
**IP:** 64.29.17.1

## Headers Present
- Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- Content-Security-Policy: present (all origins covered)

## Warning (Grade A not A+)
CSP contains unsafe-inline and unsafe-eval in script-src.
This is a Next.js 16 framework requirement. Nonce-based CSP is a V1.1 improvement.

## Closes
B-020 ASVS V14.4 — SecurityHeaders.com Grade A achieved.