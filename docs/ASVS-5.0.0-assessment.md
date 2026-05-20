# OWASP ASVS 5.0.0 — Self-Assessment Nexo Gestionale

**Data:** 2026-05-03
**Owner:** Giovanni Romano
**Standard:** OWASP ASVS 5.0.0 (rilasciato maggio 2025)
**Scope:** Backend NestJS + Frontend Next.js (multi-tenant SaaS automotive)

---

## Delta vs ASVS 4.x — Novità Critiche

| Categoria | Cambiamento | Impatto Nexo |
|-----------|-------------|-------------|
| CWE rimossi | ASVS 5.0 usa OWASP CRE invece di CWE diretti | Semgrep `p/owasp-top-ten` rimane mappato correttamente |
| ~40 nuovi requisiti | API security, AI/LLM, supply chain, OAuth 2.1 | 3 gap identificati (vedi sotto) |
| OAuth 2.1 obbligatorio | PKCE obbligatorio, implicit flow vietato | ✅ N/A (uso JWT RS256, non OAuth) |
| LLM security (nuovo) | Prompt injection, output sanitization | ⚠️ Gap parziale su ai-diagnostic |
| Supply chain (rafforzato) | SBOM, lockfile integrità, pre-install hooks | ✅ Semgrep attivo + gitleaks pre-commit |
| HTTP headers aggiornati | CSP Level 3, COOP, COEP | ⚠️ Gap COOP/COEP in next.config.js |

---

## Semgrep SAST Scan — Risultati (2026-05-03)

```bash
semgrep --config=p/owasp-top-ten --quiet backend/src/
```

**1 finding (falso positivo documentato):**

```
backend/src/middleware/auth.ts:355
  javascript.express.security.cors-misconfiguration.cors-misconfiguration
  res.header('Access-Control-Allow-Origin', origin);
```

**Analisi:** Falso positivo confermato. L'`origin` viene impostato come CORS header SOLO dopo
validazione whitelist (`allowedOrigins.includes(origin)`) alle righe 342-351.
Se l'origine non è in whitelist → 403. Il pattern è corretto e sicuro.

**Decisione:** `ACCEPTED_PATTERN` — whitelist validation precede il set dell'header.
Documento in `.audit-decisions.jsonl` del modulo middleware.

---

## Assessment per Livello (L1 / L2 / L3)

### LIVELLO 1 — Base (tutti i SaaS)

| Requisito | Descrizione | Stato |
|-----------|-------------|-------|
| V1.1 — Architettura | Componenti separati, principio minimo privilegio | ✅ PASS |
| V2.1 — Password | bcrypt rounds ≥ 12, no password in log | ✅ PASS (bcrypt r12) |
| V2.2 — MFA | MFA disponibile per tutti gli account | ✅ PASS (TOTP + WebAuthn) |
| V3.1 — Session | JWT con scadenza, revocabilità via jti | ✅ PASS (RS256, Redis blacklist) |
| V4.1 — Access Control | Autorizzazione su ogni endpoint | ✅ PASS (JwtAuthGuard + RolesGuard) |
| V5.1 — Input validation | DTOs class-validator su tutti gli endpoint | ✅ PASS |
| V6.1 — Crittografia | AES-256, no MD5/SHA1 per sicurezza | ✅ PASS (AES-256-CBC) |
| V7.1 — Logging | Log strutturato, no PII nei log | ✅ PASS (pino, EncryptionService) |
| V8.1 — Data protection | PII cifrate a riposo | ✅ PASS (EncryptionService) |
| V9.1 — Comunicazioni | TLS 1.3 obbligatorio | ✅ PASS |
| V10.1 — Codice malevolo | No backdoor, no hard-coded credential | ✅ PASS (gitleaks, semgrep) |
| V11.1 — Business Logic | State machine per transizioni | ✅ PASS (validateTransition) |
| V12.1 — File upload | Validazione tipo/dimensione | ✅ PASS (nestjs/platform-express limits) |
| V13.1 — API | Autenticazione su tutte le API private | ✅ PASS |
| V14.1 — Config | No secret in codebase | ✅ PASS (ConfigService + .env) |

**L1 Score: 15/15 ✅**

---

### LIVELLO 2 — Standard (SaaS B2B con dati sensibili)

| Requisito | Descrizione | Stato |
|-----------|-------------|-------|
| V2.3 — Autenticatore | Recupero account sicuro, no hint password | ✅ PASS |
| V2.4 — Credential | Politica password (min 12 char, breach check) | ⚠️ PARZIALE — breach check (HaveIBeenPwned) non implementato |
| V3.3 — Session binding | Session legata a IP/UA (opzionale per UX) | ⚠️ SKIP documentato — impatto UX mobile |
| V4.2 — Tenant isolation | RLS PostgreSQL + tenantId in ogni query | ✅ PASS (RLS + Semgrep custom rules) |
| V6.2 — Algoritmi | IV casuale per ogni cifratura | ✅ PASS (crypto.randomBytes(16)) |
| V6.3 — Gestione chiavi | Rotazione chiavi documentata | ⚠️ PARZIALE — procedura in runbook ma non automatizzata |
| V7.2 — Log eventi sicurezza | Auth failures, privilege escalation loggati | ✅ PASS (audit log su mutations) |
| V7.3 — Log protection | Log immutabili, retention ≥ 1 anno | ⚠️ GAP — retention attuale 90 giorni (SOC 2 richiede 1 anno) |
| V8.2 — Privacy | GDPR right-to-erasure implementato | ✅ PASS (POST /gdpr/delete) |
| V9.2 — TLS | Certificate pinning o HSTS preload | ✅ PASS (HSTS max-age=31536000; includeSubDomains; preload) |
| V11.2 — Business Logic | Anti-automation (rate limiting) | ✅ PASS (@Throttle + Redis store) |
| V13.2 — RESTful API | HTTP verb enforcement, CORS whitelist | ✅ PASS |
| V14.2 — Dipendenze | Dipendenze aggiornate, npm audit | ✅ PASS (CI npm audit --audit-level=high) |

**L2 Score: 10/13 (3 gap documentati) ⚠️**

---

### LIVELLO 3 — Avanzato (enterprise, fintech, GDPR Art.32)

| Requisito | Descrizione | Stato |
|-----------|-------------|-------|
| V2.6 — Secret lookup | OTP/TOTP lookup tables protette | ✅ PASS (Redis TTL 300s, single-use) |
| V3.7 — Difese session | Re-autenticazione per operazioni critiche | ⚠️ PARZIALE — solo su cambio password |
| V6.4 — Gestione segreti | HSM o equivalente per chiavi produzione | ⚠️ PARZIALE — AWS Secrets Manager (non HSM) |
| V7.4 — Correlazione log | Request ID per correlazione tra servizi | ✅ PASS (OpenTelemetry trace ID) |
| V10.2 — Integrità deploy | Build provenance (SLSA) | ✅ PASS (actions/attest-build-provenance@v2) |
| V14.3 — Ambiente | Dependency pinning, lockfile committato | ✅ PASS (package-lock.json committato) |

**L3 Score: 4/6 (2 gap documentati) ⚠️**

---

## Gap Prioritizzati

### GAP-1 — Log retention 90 giorni (SOC 2 richiede 1 anno)
**Severità:** ALTA  
**ASVS:** V7.3 (L2)  
**Fix:** Configurare log retention Render/CloudWatch a 365 giorni  
**Effort:** 30 minuti (config Render dashboard)  
**Blocca SOC 2:** Sì — observation period richiede 1 anno di log

### GAP-2 — HaveIBeenPwned breach check mancante
**Severità:** MEDIA  
**ASVS:** V2.4 (L2)  
**Fix:** Integrare `k-anonymity` API di HIBP su cambio password / registrazione  
**Effort:** 2 ore  
**Blocca SOC 2:** No, ma raccomandato da NIST SP 800-63B

### GAP-3 — COOP/COEP headers mancanti
**Severità:** MEDIA  
**ASVS:** V14.4 (L2) — nuova in ASVS 5.0  
**Fix:** Aggiungere `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` a `next.config.js`  
**Effort:** 15 minuti  
**Nota:** Può rompere Google OAuth iframe — testare prima

### GAP-4 — AI/LLM output sanitization (nuovo in ASVS 5.0)
**Severità:** MEDIA  
**ASVS:** V50 LLM Security (nuovo capitolo ASVS 5.0)  
**Modulo:** `ai-diagnostic` — integrazione OpenAI per diagnosi veicoli  
**Fix:** Aggiungere sanitizzazione output LLM prima della presentazione; bloccare prompt injection via system prompt defense  
**Effort:** 4 ore  

### GAP-5 — Re-autenticazione per operazioni critiche (parziale)
**Severità:** BASSA (L3 only)  
**ASVS:** V3.7 (L3)  
**Attuale:** Solo cambio password richiede re-auth  
**Fix:** Aggiungere re-auth per: cancellazione account, export GDPR completo, modifica fattura emessa  
**Effort:** 1 giorno  

---

## Controlli Già Conformi (punti di forza)

- ✅ **Tenant isolation completo** — RLS PostgreSQL + tenantId enforcement + Semgrep custom rules
- ✅ **Crittografia PII** — AES-256-CBC con IV casuale, EncryptionService centralizzato
- ✅ **JWT revocability** — jti blacklist su Redis, scadenza 15 min access / 7 giorni refresh
- ✅ **SLSA Level 3** — build provenance attestation su ogni merge a main
- ✅ **Supply chain** — gitleaks pre-commit + Semgrep CI + npm audit bloccante su critical
- ✅ **State machine** — validateTransition() su booking e invoice (ASVS V11.1)
- ✅ **HSTS preload** — max-age=31536000, includeSubDomains, preload
- ✅ **MFA obbligatorio** — TOTP + WebAuthn per admin e tenant owner (PCI DSS 4.0.1)
- ✅ **Webhook HMAC** — crypto.timingSafeEqual + length check (ASVS V1.5)
- ✅ **Advisory lock** — booking race condition prevenuta (ASVS V11.2)

---

## Prossimi Step

1. **Immediato (30 min):** GAP-1 — log retention 365 giorni su Render (sblocca SOC 2 observation)
2. **Questa settimana (2 ore):** GAP-2 — HIBP breach check su registrazione/cambio password
3. **Questa settimana (15 min):** GAP-3 — COOP/COEP headers (testare con Google OAuth)
4. **Mese 1 (4 ore):** GAP-4 — AI/LLM output sanitization per ai-diagnostic
5. **Mese 2 (1 giorno):** GAP-5 — Re-autenticazione operazioni critiche (L3, non urgente)

---

*Basato su: OWASP ASVS 5.0.0 (maggio 2025), Semgrep p/owasp-top-ten, NIST SP 800-63B rev3, PCI DSS 4.0.1, GDPR Art.32*
