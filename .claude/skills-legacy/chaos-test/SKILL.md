---
name: test-caos
description: Simula guasti (Redis, encryption, race condition) per testare la robustezza del sistema.
type: testing
category: robustness
user-invocable: true
argument-hint: "[--scenario redis|encryption|booking|webhook|all] [--duration 60] [--report]"
effort: max
timeout: 900
---

# Chaos Testing Framework

Simula failure conditions critiche per verificare resilienza sistema.

## Scenari

```bash
/chaos-test --scenario redis --report
/chaos-test --scenario all --duration 120
```

## Failure Modes Testati

### 1. Redis Down
- Backup pub/sub con fallback in-memory
- Timeout graceful su BullMQ
- Health check replica

### 2. Encryption Key Corrupted
- ENCRYPTION_KEY env var sbagliato
- PII diventa illeggibile
- Sistema logga CRITICAL e rifiuta operazioni

### 3. Race Condition (Booking)
- Simula advisory lock timeout
- Verifica che SERIALIZABLE transaction blocchi
- Concorrenza 100 richieste simul.

### 4. Webhook Signature Invalid
- Stripe webhook con firma falsa
- Sistema rifiuta e logga security event

## Report

```markdown
# CHAOS_TEST_REPORT.md

## Scenario: Redis Down
⚠️ DETECTED: BullMQ stuck (timeout after 30s)
✅ FIXED: Fallback to memory queue active

## Scenario: Encryption Key Corrupted
✅ DETECTED: PII read attempt failed
✅ BLOCKED: EncryptionService rejected bad key

## Scenario: Booking Race
✅ PASSED: 100/100 concurrent → zero race conditions (advisory lock)

## Scenario: Webhook
✅ BLOCKED: Invalid signature rejected

## OVERALL RESILIENCE SCORE
✅ 98% (4/4 scenarios handled correctly)
```

---

**Implementation Notes:**
- Simulations run in fork to avoid affecting main repo
- Database restored after each scenario
- Network jitter can be simulated with `tc` (Linux) or `clumsy` (Windows)
- Report saved to `.claude/telemetry/CHAOS_TEST_REPORT.md`

**Last Updated:** 2026-04-25
