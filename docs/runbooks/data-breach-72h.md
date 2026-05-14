# Runbook: Data Breach Notification (GDPR Art. 33) — 72h

**Trigger:** Accesso non autorizzato a dati personali, leak, ransomware, SQL
injection confermata. **Deadline Garante:** 72 ore dalla scoperta. **Owner:**
DPO + CTO

## T+0: Scoperta (entro 1h)

1. [ ] Isolare il sistema compromesso (disconnect from network se necessario)
2. [ ] Creare issue P0 su GitHub/Linear: "SECURITY INCIDENT - [DATA]"
3. [ ] Notificare via Slack #security-incident: CTO + DPO + CEO
4. [ ] NON cancellare log — preservare evidenza
5. [ ] Screenshot/export log rilevanti in folder sicura

**Checklist ispezione:**

- [ ] Verificare access log: `tail -n 500 /var/log/auth.log`
- [ ] Controllare processi anomali: `ps aux | grep -E 'curl|wget|nc'`
- [ ] Estrarre query Prisma sospette dai log di database
- [ ] Conservare pacchetti di rete catturati (tcpdump se disponibile)

## T+1h: Valutazione (entro 4h)

1. [ ] Identificare: quali dati? quanti interessati? quale periodo?
   - Query:
     `SELECT COUNT(DISTINCT tenantId) FROM [TABELLA] WHERE createdAt BETWEEN T1 AND T2`
   - Estrarre lista interessati:
     `SELECT email, firstName, lastName FROM User WHERE ...`

2. [ ] Classificare: PII esposta?
   - Email (moderato rischio)
   - Targa/VIN (moderato)
   - IBAN/Carta credito (ALTO rischio — notifica obbligatoria)
   - Codice Fiscale (ALTO rischio — notifica obbligatoria)
   - Password hash (dipende da algoritmo: bcrypt OK, MD5 CRITICO)

3. [ ] Valutare rischio complessivo:
   - **ALTO:** PII sensibili (IBAN, CF, password plaintext) + > 100 interessati
   - **MEDIO:** Email + targa + < 100 interessati
   - **BASSO:** Email solamente

4. [ ] Se ALTO RISCHIO → notifica Garante obbligatoria entro 72h

**Tabella severity:**

| Dati esposti       | < 10    | 10-100  | > 100   |
| ------------------ | ------- | ------- | ------- |
| Email solo         | BASSO   | BASSO   | MEDIO   |
| Email + targa      | BASSO   | MEDIO   | ALTO    |
| IBAN / CF          | ALTO    | ALTO    | ALTO    |
| Password plaintext | CRITICO | CRITICO | CRITICO |

## T+4h: Contenimento

1. [ ] Revocare access token compromessi
   - Blacklist tutti JWT emessi prima di T0:
     `UPDATE JwtBlacklist SET revoked=true WHERE issuedAt < NOW() - INTERVAL '1 hour'`
   - Invalidare tutti refresh token:
     `DELETE FROM RefreshToken WHERE createdAt < NOW() - INTERVAL '24 hours'`

2. [ ] Forzare password reset per utenti interessati
   - Email template: `docs/legal/breach-notification-template.md`
   - Comando: `npm run script:force-password-reset -- --userIds=[LIST]`

3. [ ] Patch vulnerabilità (se identificata)
   - Commit fix su branch `security/breach-YYYY-MM-DD`
   - Deploy in staging PRIMA di produzione
   - Test: curl endpoint con SQL injection payload

4. [ ] Backup dati pre-incident (per forensics)
   - `pg_dump mechmind > /secure/backup/mechmind-T0.sql`
   - Trasferire in secure location (non su server compromesso)

5. [ ] Disabilitare/limitare accessi sospetti
   - Revocare API key compromesse
   - Ruotare secret JWT
   - Killare sessioni attive: `DELETE FROM Session WHERE userId IN (...)`

## T+24h: Notifica Garante (se alto rischio)

**Canale:** Portale telematico Garante Privacy URL:
https://www.garanteprivacy.it/web/guest/notifica-data-breach

**Contenuto obbligatorio:**

```
NOTIFICA VIOLAZIONE DATI PERSONALI — Art. 33 GDPR

Titolare del trattamento:
  Nome: MechMind Srl
  Sede: Via [INDIRIZZO]
  Email: [CONTATTO]

Responsabile della protezione dei dati (DPO):
  Nome: [NOME_DPO]
  Email: [DPO_EMAIL]
  Telefono: [DPO_TEL]

1. DATA E ORA SCOPERTA DELLA VIOLAZIONE:
   Data: [YYYY-MM-DD]
   Ora: [HH:MM] CET

2. NATURA E CIRCOSTANZE DELLA VIOLAZIONE:
   Tipo: [ACCESSO_NON_AUTORIZZATO | PERDITA_DATI | DISTRUZIONE | CRITTOGRAFIA_RANSOMWARE]

   Descrizione:
   [DESCRIZIONE LIBERA, max 2000 caratteri]

   Causa identificata:
   [Es. SQL injection in endpoint /api/v1/bookings/export]

3. CATEGORIE E NUMERO APPROSSIMATIVO DI INTERESSATI:
   Numero stimato: [N] persone

   Categorie di dati:
   - Email: [ ] Sì [ ] No
   - Numero di targa: [ ] Sì [ ] No
   - Codice Fiscale: [ ] Sì [ ] No
   - IBAN/Dati bancari: [ ] Sì [ ] No
   - Password hash: [ ] Sì [ ] No (algoritmo: [bcrypt | MD5 | ...])
   - Altro: [SPECIFICARE]

4. CONSEGUENZE PROBABILI DELLA VIOLAZIONE:
   [Descrizione impatto per gli interessati]

   Esempi:
   - Rischio di furto d'identità (CF esposto)
   - Rischio di frode bancaria (IBAN esposto)
   - Compromissione della riservatezza (email + targa)

5. MISURE ADOTTATE O PROPOSTE PER RIMEDIARE:

   Misure ADOTTATE (già completate):
   - [ ] Isolamento sistema compromesso
   - [ ] Patch vulnerabilità [DESCRIZIONE]
   - [ ] Revoca token di accesso
   - [ ] Password reset forzato
   - [ ] Notifica interessati

   Misure PROPOSTE (in corso):
   - [ ] Penetration test esterno entro [DATA]
   - [ ] Audit DPIA aggiornata
   - [ ] Implementazione 2FA obbligatoria
   - [ ] Encryption at-rest per sensibili

6. PERSONE DI CONTATTO:
   CTO: [NOME] - [EMAIL] - [TEL]
   DPO: [NOME] - [EMAIL] - [TEL]

Allegati:
- Cronologia esatta dell'incidente (timeline.txt)
- Risultati analisi forense (optional)
- Attestazione patch/remediation (optional)
```

**Invio:**

1. Compilare form online del Garante
2. Upload documento PDF con informazioni sopra
3. Conservare ricevuta di ricezione
4. DPO monitora risposte Garante (email)

## T+48h: Notifica agli Interessati (se rischio elevato)

**Canale:** Email

**Destinatari:** Utenti interessati

**Soggetto:** Notifica violazione dati personali — Nexo Gestionale

**Template email:**

```
Egregio/a [NOME_UTENTE],

Le scriviamo per informarvi di una violazione che ha coinvolto i dati personali a voi relativi.

COSA È SUCCESSO?
[DATA]: È stato rilevato un accesso non autorizzato a [SPECIFICARE TIPO DATI].
La nostra investigazione ha determinato che [DESCRIZIONE INCIDENTE].

QUALI DATI SONO STATI ESPOSTI?
I dati personali coinvolti sono:
- Email
- Numero di targa
- [ALTRI DATI]

Non sono stati esposti: password (criptate), dati bancari.

COSA STIAMO FACENDO?
1. Abbiamo immediatamente isolato il sistema interessato
2. Abbiamo implementato una patch di sicurezza
3. Abbiamo revocato tutti i token di accesso compromessi
4. Abbiamo avviato un audit esterno di sicurezza

COSA DOVETE FARE VOI?
1. Cambiate la vostra password Nexo immediatamente
2. Se usate la stessa password altrove, cambiatela anche su quei siti
3. Monitorate il vostro conto bancario e l'estratto conto (sebbene IBAN non sia stato esposto)
4. Se notate attività sospette, contattateci subito

CONTATTI:
- Email: security@mechmind.it
- Telefono: [NUMERO]
- Modulo di supporto: https://mechmind.it/security-incident

Per ulteriori informazioni sulla violazione, consultate la nostra pagina:
https://mechmind.it/security/breach-2026-05-14

Cordiali saluti,
MechMind Srl
Autorità Garante Protezione Dati Personali
```

**Tracciamento invii:**

- Utilizzare Resend API con tracking pixel
- Log:
  `SELECT COUNT(*) FROM BreachNotificationLog WHERE sentAt > NOW() - INTERVAL '48h'`
- Target: 100% consegna entro T+48h

## T+72h: Report Finale al Garante

**Aggiornare** la notifica iniziale con sezione "Follow-up":

```
FOLLOW-UP REPORT — 72h After Initial Notification

1. CAUSE IDENTIFICATE:
   [ANALISI TECNICA DETTAGLIATA]
   Esempio:
   - Vulnerabilità: SQL injection in endpoint POST /api/v1/vehicles/import
   - Vector: Cookie malformato non validato da middleware
   - Scope: 1,247 record di veicoli esposti
   - Timeline: [DATA_INIZIO] → [DATA_SCOPERTA]

2. CORREZIONI IMPLEMENTATE:
   - Commit: abc1234 — Validate all cookies with Joi schema
   - Review PR#5678 da [REVIEWER]
   - Test: npm run test -- --testNamePattern="cookie.*injection"
   - Coverage: 100% branch coverage sul codice affetto
   - Deployment: 2026-05-14 15:30 CET in produzione

3. MISURE PREVENTIVE FUTURE:
   - [ ] Input validation su tutti endpoint entro [DATA]
   - [ ] WAF (AWS WAF) deployment entro [DATA]
   - [ ] Penetration test trimestrale
   - [ ] SAST automatizzato in CI/CD (Semgrep already enabled)

4. COOPERAZIONE CON FORZE DELL'ORDINE:
   - [ ] Denuncia querela: SÌ / NO
   - [ ] Numero pratica Polizia Postale: [SE_APPLICABILE]
   - [ ] Data denuncia: [DATA]

5. CONFORMITÀ GDPR POST-INCIDENT:
   - [ ] DPIA aggiornata
   - [ ] Registro trattamenti aggiornato
   - [ ] Politica privacy aggiornata
   - [ ] Informativa Art. 13/14 aggiornata

Allegati:
- forensic-report.pdf (analisi tecnica post-incidente)
- timeline.csv (cronologia evento)
- patch-validation.md (test della correzione)
```

## Post-Incident (entro 2 settimane)

1. [ ] **Post-mortem scritto** → `docs/incident-reports/[DATA]-breach.md`
   - Timeline dettagliata (minuto per minuto)
   - Root cause analysis
   - Human factors (chi ha fatto cosa)
   - Cosa ha funzionato, cosa no

2. [ ] **DPIA aggiornata** (se necessario)
   - Se nuovi dati trattati, aggiornare DPIA
   - Se misure di sicurezza cambiate, documentare

3. [ ] **Test penetration esterno** (se richiesto da Garante)
   - Engagement con agenzia esterna (es. DefiSec, Secure Network)
   - Scope: Full application + infrastructure
   - Timeline: entro 30 giorni

4. [ ] **Aggiornamento registro trattamenti**
   - File: `docs/legal/register-of-processing.md`
   - Aggiungere entry per incident

5. [ ] **Comunicazione interna stakeholder**
   - Update board of directors (CDA)
   - Update assicurazione cyber (se presente)
   - Update customer advisory board

6. [ ] **Revisione questa runbook**
   - Cosa potevamo fare meglio?
   - Timing corretti?
   - Contatti giusti coinvolti?

## Escalation

**Se incidente non contenibile in 72h:** → Contattare Garante Privacy per
estensione deadline Email: segreteria.garante@gpdp.it Oggetto: Richiesta
estensione termine Art. 33 GDPR

**Se ransom/estorsione:** → Coinvolgere Polizia Postale SUBITO Non pagare ransom
senza consultazione forze dell'ordine

**Se dati medici/finanziari:** → Notificare anche autorità di settore

- BANKIT (Banca d'Italia) per dati finanziari
- Garante SSN per dati sanitari

## Contatti di Emergenza

| Ruolo     | Nome      | Email   | Telefono | Note                  |
| --------- | --------- | ------- | -------- | --------------------- |
| CTO       | [NOME]    | [EMAIL] | [TEL]    | Decisioni tecniche    |
| DPO       | [NOME]    | [EMAIL] | [TEL]    | Notifiche Garante     |
| CEO       | [NOME]    | [EMAIL] | [TEL]    | Comunicazione esterna |
| Legal     | [NOME]    | [EMAIL] | [TEL]    | Aspetti legali        |
| Insurance | [AGENZIA] | [EMAIL] | [TEL]    | Cyber policy          |

---

**Ultima revisione:** 2026-05-14 **Proprietario:** DPO + CTO **Frequenza
revisione:** annuale o post-incidente
