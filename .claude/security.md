# Sicurezza 2026

paths: "backend/src/**"
OWASP Top 10:2025, GDPR, PCI DSS 4.0.1 obbligatori.
tenantId in ogni query Prisma. Segreti mai hardcodati. PII solo EncryptionService AES-256-CBC.
Webhook: verifica HMAC-SHA256 prima di elaborare. Rate limiting su endpoint pubblici.
Test sicurezza: controllo accessi, eccezioni, PII, accanto ai test funzionali.
