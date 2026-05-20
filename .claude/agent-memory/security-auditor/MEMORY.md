# security-auditor — memoria persistente

## Pattern OWASP A01 (tenant isolation) ricorrenti

_(append: file:linea + fix)_

## Eccezioni autorizzate alla regola tenantId

- Cron cross-tenant (processPending, markOverdue, sendReminders)
- AuthService (query userId globalmente unico)
- Webhook handlers (lookup external_id post-firma)
- GDPR (cross-tenant per legge)
- Child models con parent tenant-checked

## RLS verifica

- Cerca: ALTER TABLE ... ENABLE ROW LEVEL SECURITY in prisma/migrations/
- Policy: tenant_isolation USING (tenant_id =
  current_setting('app.current_tenant')::uuid)

## CVSS calculator: https://www.first.org/cvss/calculator/3.1

## Audit 2026-05-14: Pattern findings

- **Email in logs**: backend/src/auth/services/login-throttle.service.ts:61
  (PII-LOG-001) — maskare con hash
- **Vehicle tenantId check**: backend/src/invoice/services/pdf.service.ts:192
  (TENANT-ISOLATION-001) — findFirst con tenantId
- **OpenTelemetry DoS**: @opentelemetry/auto-instrumentations-node ≤0.74.0 —
  GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Protobufjs injection**: protobufjs ≤7.5.5 — GHSA-75px-5xx7-5xc7 (CVSS 8.1,
  code injection gadget)
- **fast-uri traversal**: fast-uri ≤3.1.1 — GHSA-q3j6-qgpj-74h6 (CVSS 7.5, path
  traversal)
- **Resend webhook replay**: missing timestamp freshness check
  (WEBHOOK-SIGNATURE-001, CVSS 4.8)
