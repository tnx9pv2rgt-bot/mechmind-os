# Nexo Gestionale — Trust Center

**URL pubblico:** https://trust.nexo.it
**Aggiornato:** 2026-05-03
**Contatto sicurezza:** security@nexo.it

---

## Security Posture

### Crittografia

| Layer | Standard | Dettaglio |
|-------|----------|-----------|
| Data at rest (PII) | AES-256-CBC | Tutti i campi PII (nome, telefono, email, CF) crittografati via `EncryptionService` prima di entrare nel DB |
| Data in transit | TLS 1.3 | Tutte le connessioni client↔server e server↔DB |
| Password | bcrypt (rounds 12) | Mai in chiaro, mai loggati |
| JWT | RS256 | Revocabilità via `jti` su Redis; scadenza 15 min (access) / 7 giorni (refresh) |
| Backup DB | AES-256 | Backup cifrati pre-upload S3 |
| Secret management | Variabili d'ambiente | Nessun secret nel codice; gestiti via Render/AWS Secrets Manager |

### Controllo Accessi

- **MFA obbligatorio** per tutti gli account admin e tenant owner (TOTP / WebAuthn)
- **RBAC** granulare: OWNER, ADMIN, MANAGER, TECHNICIAN, VIEWER per ogni tenant
- **Principio del minimo privilegio:** ogni ruolo accede solo alle risorse necessarie
- **Row-Level Security (RLS):** PostgreSQL filtra automaticamente per `tenant_id` a livello DB
- **Session revocation:** logout forza revoca JWT su Redis (blacklist `jti`)
- **Access review:** trimestrale su tutti gli account privilegiati

### Isolamento Multi-Tenant

- Ogni tenant ha dati completamente separati a livello applicativo e DB (RLS PostgreSQL)
- `tenantId` presente in ogni query Prisma — verificato da audit automatico (Semgrep custom rules)
- Nessuna query cross-tenant possibile da API pubblica
- Test di isolamento nel CI/CD pipeline (jest + Semgrep SAST)

### Monitoring e Incident Response

| Sistema | Coverage |
|---------|----------|
| Sentry (errors + performance) | Backend NestJS + Frontend Next.js — real-time error tracking, session replay |
| OpenTelemetry | Distributed tracing, p95/p99 latency per endpoint |
| Structured logging (pino) | JSON logs, retention 90 giorni |
| Uptime monitoring | Betteruptime — statuspage pubblico |
| Vulnerability scanning | Semgrep SAST + npm audit in ogni CI/CD run |
| Penetration test | Annuale (pianificato Q4 2026) |

**MTTR target:** <1 ora per incidenti P0 (vedi [Incident Response Runbook](runbooks/incident-response.md))

### Backup e Business Continuity

- **Backup PostgreSQL:** ogni 6 ore, retention 30 giorni, cifrati AES-256 su S3
- **RTO target:** 4 ore | **RPO target:** 6 ore
- **DR drill:** trimestrale (vedi [DR Drill Schedule](runbooks/dr-drill-schedule.md))
- **Multi-AZ:** deploy su Render (eu-west region) con automatic failover

---

## Compliance

### SOC 2 Type II
**Stato:** 🔄 In corso — avvio maggio 2026

| Fase | Periodo | Stato |
|------|---------|-------|
| Gap assessment + Onboarding Vanta | Maggio 2026 | 🔄 In corso |
| Remediation controlli | Maggio–Giugno 2026 | ⏳ Pianificato |
| Observation period (6 mesi) | Luglio–Dicembre 2026 | ⏳ Pianificato |
| Audit fieldwork | Gennaio–Febbraio 2027 | ⏳ Pianificato |
| Report emissione | Marzo 2027 | ⏳ Pianificato |

Trust Services Criteria in scope: **Security (CC)**, **Availability (A)**, **Confidentiality (C)**

Il report SOC 2 Type II sarà disponibile su richiesta per clienti enterprise con NDA firmato.

### GDPR (Regolamento UE 2016/679)
**Stato:** ✅ Conforme

- **Lawful basis:** contratto (Art. 6.1.b) per dati operativi; consenso (Art. 6.1.a) per marketing
- **Data minimization:** raccogliamo solo dati necessari all'erogazione del servizio
- **Right to erasure:** endpoint `POST /v1/gdpr/delete` — cancellazione asincrona entro 30 giorni
- **Right to portability:** endpoint `GET /v1/gdpr/export-full` — export ZIP entro 72 ore
- **Data retention:** dati operativi 7 anni (obbligo fiscale IT); dati marketing 2 anni
- **DPA disponibile:** [Data Processing Agreement](DPA.md)
- **Sub-processor list:** AWS (hosting), Render (deploy), Stripe (pagamenti), Resend (email), Twilio (SMS)

### EU Data Act (Regolamento UE 2023/2854)
**Stato:** ✅ Conforme (dal 12 settembre 2025)

- **Switching rights:** export dati in formato standard (JSON/CSV) senza vincolo vendor
- **Interoperabilità:** API REST documentata (OpenAPI 3.0), nessun lock-in proprietario

### PCI DSS 4.0.1
**Stato:** ⚠️ SAQ A (Stripe handles card data)

- Nexo non tocca mai i dati carta — Stripe gestisce tutto (certificato PCI Level 1)
- Webhook Stripe verificati via HMAC (`crypto.timingSafeEqual`)
- MFA obbligatorio per tutti gli utenti che accedono all'area fatturazione

---

## Vulnerability Disclosure

**Programma:** Responsible Disclosure (non bug bounty al momento)

**Come segnalare:**
1. Invia email a **security@nexo.it** con oggetto `[VULN] <descrizione breve>`
2. Includi: steps to reproduce, impatto stimato, proof-of-concept (se disponibile)
3. **Non pubblicare** la vulnerabilità prima di 90 giorni dalla segnalazione (coordinated disclosure)

**SLA risposta:**
- Acknowledgement: entro **24 ore**
- Triage e severity assessment: entro **72 ore**
- Fix per P0/Critical: entro **7 giorni**
- Fix per P1/High: entro **30 giorni**

**Scope in-scope:**
- `*.nexo.it` — tutte le superfici web e API
- App mobile (quando disponibile)

**Out-of-scope:** social engineering, phishing, denial-of-service, attacchi a infrastruttura terze parti (AWS, Stripe).

**Hall of Fame:** i ricercatori che segnalano vulnerabilità critiche saranno ringraziati pubblicamente (con consenso).

---

## Subprocessor List

| Fornitore | Scopo | Sede | DPA |
|-----------|-------|------|-----|
| Amazon Web Services (AWS) | Hosting, S3 backup, CloudFront CDN | EU (Irlanda) | [DPA AWS](https://aws.amazon.com/agreement/) |
| Render | Deploy applicazione | EU (Frankfurt) | [DPA Render](https://render.com/privacy) |
| Stripe | Processamento pagamenti | USA (Irlanda per EU) | [DPA Stripe](https://stripe.com/privacy) |
| Resend | Email transazionale | USA | [DPA Resend](https://resend.com/privacy) |
| Twilio | SMS notifiche | USA | [DPA Twilio](https://www.twilio.com/legal/privacy) |
| OpenAI | AI diagnostica veicoli | USA | [DPA OpenAI](https://openai.com/policies/privacy-policy) |
| Sentry | Error monitoring | USA | [DPA Sentry](https://sentry.io/privacy/) |

Tutti i trasferimenti extra-UE avvengono tramite **Standard Contractual Clauses (SCC)** o **adequacy decision**.

---

## Contatti

| Ruolo | Contatto |
|-------|---------|
| Security issues | security@nexo.it |
| Privacy / GDPR | privacy@nexo.it |
| General | hello@nexo.it |
| DPO | dpo@nexo.it |

**Indirizzo:** Nexo Gestionale Srl — [indirizzo da completare]
**P.IVA:** [da completare prima del lancio]
