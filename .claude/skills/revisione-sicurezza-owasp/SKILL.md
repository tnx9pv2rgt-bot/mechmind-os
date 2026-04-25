---
name: revisione-sicurezza-owasp
description: Security review OWASP Top 10:2025 + GDPR 2026 + PCI DSS 4.0.1. Usa per auth, webhook, encryption, tenantId, query, input validation, error handling.
user-invocable: true
argument-hint: "[--type code|commit|all] [--owasp-level a01|a02|a10|all] [--report-path PATH]"
effort: high
timeout: 600
---

# Security Review — OWASP 2025 + GDPR 2026 + PCI DSS 4.0.1

Compliance audit multistandard per MechMind OS (fintech + auto repair SaaS).

## Comandi

```bash
/revisione-sicurezza-owasp --type all
/revisione-sicurezza-owasp --owasp-level a01 --report-path ./SECURITY_AUDIT.md
```

## OWASP Top 10:2025 Checks

### A01:2025 - Broken Access Control
- ✅ RLS policies attive (Supabase/Prisma)
- ✅ Tenant isolation: OGNI query ha `where: { tenantId }`
- ✅ Authorization guard on all endpoints
- ✅ Role-based access (RBAC)
- ❌ Missing tenantId → data leak (CRITICAL)

### A02:2025 - Cryptographic Failures
- ✅ PII encryption: phone, email, firstName, lastName via EncryptionService
- ✅ JWT with `jti` for revocability
- ✅ TLS on all HTTP
- ✅ Password hashing: bcrypt (cost ≥12)
- ❌ PII in logs → CRITICAL

### A03:2025 - Injection
- ✅ Prisma only (no raw SQL)
- ✅ DTOs with class-validator
- ✅ Input sanitization
- ✅ Query parameterization
- ❌ Template injection, command injection → CRITICAL

### A04:2025 - Insecure Design
- ✅ State machine validation (validateTransition)
- ✅ Advisory locks on booking
- ✅ SERIALIZABLE transactions
- ✅ Anti-mock: no fake data, no demo mode
- ⚠️  Design review on new features

### A05:2025 - Security Misconfiguration
- ✅ No hardcoded secrets (all from env)
- ✅ CORS locked to origin
- ✅ Headers: CSP, HSTS, X-Frame-Options
- ✅ No debug endpoints in prod
- ❌ Exposed environment variables → CRITICAL

### A06:2025 - Vulnerable & Outdated Components
- ✅ npm audit clean (via `/revisione-dipendenze`)
- ✅ No GPL/AGPL licenses
- ✅ Transitive dependency audit
- ❌ Outdated lodash, express, etc → HIGH

### A07:2025 - Authentication Failures
- ✅ JwtAuthGuard on protected endpoints
- ✅ Token expiration (15m access, 7d refresh)
- ✅ Token blacklist on logout
- ✅ No credentials in URL
- ❌ Missing 2FA on admin → WARNING

### A08:2025 - Data Integrity Failures
- ✅ Webhook signature verification (Stripe HMAC)
- ✅ Idempotency keys on payment endpoints
- ✅ Audit log on mutations
- ✅ Soft deletes for compliance
- ❌ Unsigned webhook → CRITICAL PAYMENT LOSS

### A09:2025 - Logging & Monitoring Failures
- ✅ Structured logging (JSON format)
- ✅ No PII/tokens in logs
- ✅ Alert on failed auth (threshold 5 in 1m)
- ✅ Metrics collection (Prometheus)
- ⚠️  SIEM integration pending

### A10:2025 - Request Forgery
- ✅ CSRF tokens on forms
- ✅ SameSite=Strict cookies
- ✅ Origin validation
- ✅ Rate limiting (100 req/min per IP)
- ⚠️  Test SSRF vectors

## GDPR 2026 + PCI DSS 4.0.1

### Data Minimization (GDPR 7.5.3)
- ✅ Collect only necessary fields
- ✅ PII purge after retention (30d invoices, 1y booking)
- ❌ Excess fields → audit

### Data Export API (GDPR 8.3.2)
- ✅ `GET /v1/user/export?format=json`
- ✅ All PII exported with encryption
- ❌ Missing → GDPR violation

### Payment Webhook Security (PCI DSS 6.4.1)
- ✅ Stripe signature verified
- ✅ Idempotency enforced
- ✅ Error handling no card data leakage
- ❌ Missing signature → PCI CRITICAL

### Audit Trail (GDPR 5.2 + PCI 6.5.1)
- ✅ Immutable log on mutations
- ✅ User action tracking
- ✅ IP + timestamp on sensitive ops
- ❌ Missing → audit fail

## Report Output

```markdown
# SECURITY_AUDIT_REPORT.md

## OWASP Coverage
✅ A01: Broken Access Control (100%)
✅ A02: Cryptographic Failures (98%)
⚠️  A03: Injection (95% — raw SQL usage in 2 places)
✅ A04: Insecure Design (92%)
...

## GDPR 2026 + PCI DSS
✅ Data minimization: compliant
✅ Data export API: implemented
✅ Webhook security: verified
✅ Audit trail: active

## Blockers (Critical)
❌ NONE detected ✅

## Warnings (High)
⚠️  Missing 2FA on admin users
⚠️  SIEM integration incomplete

## Info
ℹ️  Last audit: 2026-04-25 14:30
ℹ️  Standard: OWASP 2025 + GDPR 2026 + PCI DSS 4.0.1

## OVERALL SECURITY SCORE
✅ 94% (world-class fintech standard)
```

---

**Failure Criteria:**
- A01 (Access Control) failures → exit 2 (data leak risk)
- A02 (Crypto) failures → exit 2 (PII exposed)
- A08 (Webhook) unsigned → exit 2 (payment loss)
- GDPR/PCI violations → exit 2

**Partial execution:** If audit hits network error, report with ⚠️  and continue.

**Last Updated:** 2026-04-25
