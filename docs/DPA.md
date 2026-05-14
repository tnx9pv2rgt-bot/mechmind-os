# Data Processing Agreement (DPA) — Nexo Gestionale

**Versione:** 1.0  
**Data entrata in vigore:** 2026-05-03  
**Riferimento normativo:** GDPR (Reg. UE 2016/679) Art. 28, EU Data Act 2025,
CCPA 2023

---

## 1. Parti e Ruoli

| Parte                                    | Ruolo GDPR                                        | Definizione                                                                       |
| ---------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Cliente** (officina, flotta, gommista) | **Titolare del Trattamento** (Data Controller)    | Determina le finalità e i mezzi del trattamento dei dati personali                |
| **Nexo Gestionale S.r.l.**               | **Responsabile del Trattamento** (Data Processor) | Tratta i dati personali per conto del Titolare, secondo le istruzioni documentate |

Il Responsabile non tratta i dati per finalità proprie salvo obbligo legale.

---

## 2. Oggetto e Durata

Il presente DPA disciplina il trattamento dei dati personali effettuato da Nexo
Gestionale S.r.l. nell'erogazione dei servizi ERP previsti dal Contratto di
Servizio.

La durata coincide con quella del Contratto di Servizio. Al termine, si
applicano le disposizioni dell'Art. 8 (Cancellazione e Restituzione).

---

## 3. Categorie di Dati Trattati

### 3.1 Dati personali dei clienti finali (PII)

| Categoria                       | Esempi                           | Base giuridica                               |
| ------------------------------- | -------------------------------- | -------------------------------------------- |
| Dati anagrafici                 | Nome, cognome, indirizzo         | Esecuzione del contratto (Art. 6(1)(b) GDPR) |
| Dati di contatto                | Email, numero di telefono        | Esecuzione del contratto                     |
| Dati fiscali                    | Codice Fiscale, Partita IVA      | Obbligo legale (Art. 6(1)(c) GDPR)           |
| Dati del veicolo                | Targa, VIN, km                   | Esecuzione del contratto                     |
| Storico interventi              | Riparazioni, fatture, preventivi | Legittimo interesse / contratto              |
| Dati di pagamento (tokenizzati) | Token Stripe (mai PAN in chiaro) | Esecuzione del contratto + PCI DSS           |

### 3.2 Dati degli utenti del sistema (dipendenti del Cliente)

| Categoria                  | Esempi                               |
| -------------------------- | ------------------------------------ |
| Credenziali di accesso     | Email, hash password (bcrypt)        |
| Log di attività            | Azioni su prenotazioni, fatture      |
| Sessioni di autenticazione | JWT, refresh token (pseudonimizzati) |

### 3.3 Dati NON trattati

- Dati sensibili (art. 9 GDPR): salute, biometria, etnia — **non raccolti**
- Dati di minori — **non raccolti**
- Dati di geolocalizzazione in tempo reale — **non tracciati**

---

## 4. Finalità del Trattamento

Il Responsabile tratta i dati esclusivamente per:

1. Erogare i servizi ERP (prenotazioni, fatturazione, gestione flotte, work
   order)
2. Inviare notifiche operative (conferme appuntamento, promemoria, fatture)
3. Generare report e analytics aggregati per il Titolare
4. Adempiere obblighi legali (conservazione documenti fiscali, GDPR)
5. Supporto tecnico e risoluzione incidenti (accesso limitato e auditato)

---

## 5. Misure Tecniche e Organizzative (Art. 32 GDPR)

### 5.1 Crittografia

| Dato              | Algoritmo                                          | Note                                                       |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| PII a riposo (DB) | **AES-256-CBC** con IV casuale (EncryptionService) | Chiave in variabile d'ambiente, mai in codebase            |
| Trasporto         | **TLS 1.3**                                        | HSTS abilitato, certificato Let's Encrypt / CA commerciale |
| Password utenti   | **bcrypt** (cost factor 12)                        | Mai in chiaro, mai reversibile                             |
| Token pagamento   | Tokenizzazione Stripe (PCI DSS L1)                 | PAN non entra mai nei sistemi Nexo                         |
| Backup            | AES-256 a riposo                                   | S3 con SSE-KMS                                             |

### 5.2 Controllo degli accessi

- Autenticazione JWT con `jti` revocabile + refresh token
- MFA obbligatoria per ruoli admin e accesso ai dati PII
- RBAC: ruoli `OWNER`, `ADMIN`, `TECHNICIAN`, `RECEPTIONIST` con principio del
  minimo privilegio
- Row Level Security (RLS) PostgreSQL: isolamento multi-tenant garantito a
  livello DB
- Log di ogni operazione mutativa su dati personali (audit trail)

### 5.3 Disponibilità e Integrità

- Backup giornalieri automatici con retention 30 giorni
- Point-in-Time Recovery (PITR) su PostgreSQL
- Replica sincrona in standby (Recovery Time Objective < 1 ora)
- Monitoraggio continuo tramite Sentry (error tracking + performance)

### 5.4 Sicurezza applicativa

- OWASP Top 10:2025 compliance (verificata tramite Semgrep SAST in CI/CD)
- Dipendenze monitorate con `npm audit` in pipeline CI
- Test di sicurezza automatizzati ad ogni PR (GitHub Actions)

---

## 6. Sub-Responsabili del Trattamento

Il Titolare autorizza il ricorso ai seguenti sub-responsabili. Il Responsabile
garantisce che i sub-responsabili offrano garanzie equivalenti al presente DPA.

| Sub-responsabile                       | Servizio                                 | Dati condivisi                                     | DPA/Certificazione                                                                                     |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Amazon Web Services**                | Hosting, storage S3, CloudFront CDN      | Tutti i dati del sistema                           | [AWS DPA](https://aws.amazon.com/agreement/data-processing/) — ISO 27001, SOC 2 Type II — EU (Irlanda) |
| **Render (Render Services, Inc.)**     | Deploy applicazione (backend + frontend) | Dati in transito durante deploy                    | [Render DPA](https://render.com/dpa) — SOC 2 Type II — EU (Frankfurt)                                  |
| **Stripe, Inc.**                       | Elaborazione pagamenti                   | Token pagamento, importo                           | [Stripe DPA](https://stripe.com/legal/dpa) — PCI DSS L1 — USA / Irlanda (SCC)                          |
| **Resend, Inc.**                       | Invio email transazionali                | Indirizzo email, contenuto notifica                | [Resend DPA](https://resend.com/legal/dpa) — USA (SCC)                                                 |
| **Twilio, Inc.**                       | Invio SMS notifiche                      | Numero di telefono, testo SMS                      | [Twilio DPA](https://www.twilio.com/legal/data-protection-addendum) — SOC 2 Type II — USA (SCC)        |
| **OpenAI, L.L.C.**                     | AI diagnostica veicoli (ai-diagnostic)   | Descrizioni sintomi veicolo (no PII diretta)       | [OpenAI DPA](https://openai.com/policies/data-processing-addendum) — USA (SCC)                         |
| **Sentry (Functional Software, Inc.)** | Error tracking e APM                     | Stack trace (PII mascherata), user ID anonimizzato | [Sentry DPA](https://sentry.io/legal/dpa/) — SOC 2 Type II — USA (SCC)                                 |

Il Responsabile notificherà al Titolare qualsiasi modifica all'elenco dei
sub-responsabili con **30 giorni di anticipo**, permettendo al Titolare di
sollevare obiezioni motivate.

---

## 7. Trasferimenti Extra-UE

I dati sono trattati primariamente in infrastrutture UE (AWS eu-south-1 Milano o
eu-west-1 Irlanda).

Per i sub-responsabili con sede negli USA (Stripe, Twilio, Sentry, AWS US):

- Trasferimento basato su **Standard Contractual Clauses (SCC)** della
  Commissione Europea (decisione 2021/914)
- Il Responsabile mantiene un registro aggiornato delle SCC in essere

---

## 8. Cancellazione e Restituzione dei Dati

Alla cessazione del Contratto:

1. Il Titolare può esportare tutti i dati tramite `GET /v1/gdpr/export-full`
   (ZIP firmato HMAC) entro 90 giorni dalla cessazione
2. Il Responsabile conserva i dati per **90 giorni** dopo la cessazione per
   consentire l'esportazione
3. Trascorsi 90 giorni, i dati sono **eliminati in modo irreversibile** da tutti
   i sistemi (DB, backup, log), salvo obblighi di conservazione fiscale (10 anni
   per documenti contabili — art. 2220 c.c.)
4. Il Responsabile fornisce attestazione scritta della cancellazione entro 30
   giorni dalla richiesta

---

## 9. Violazioni dei Dati (Data Breach)

In caso di violazione dei dati personali (art. 33-34 GDPR):

1. Il Responsabile notifica il Titolare entro **24 ore** dalla scoperta (via
   email a contatto designato)
2. La notifica contiene: natura della violazione, categorie e numero
   approssimativo di interessati, misure adottate o proposte
3. Il Titolare è responsabile della notifica all'Autorità di controllo (Garante
   Privacy) entro 72 ore e, se necessario, agli interessati
4. Il Responsabile collabora con il Titolare nelle indagini e nelle
   comunicazioni

---

## 10. Diritti degli Interessati

Il Responsabile assiste il Titolare nell'adempimento delle richieste degli
interessati (art. 15–22 GDPR):

| Diritto       | Strumento disponibile                                  |
| ------------- | ------------------------------------------------------ |
| Accesso       | Export via `GET /v1/gdpr/export-full`                  |
| Portabilità   | Export ZIP in formato JSON/CSV (EU Data Act)           |
| Rettifica     | API PATCH su customer/vehicle/invoice                  |
| Cancellazione | `POST /v1/gdpr/delete` — anonimizzazione irreversibile |
| Limitazione   | Blocco processing via flag `processingRestricted`      |
| Opposizione   | Gestito via ticket di supporto entro 30 giorni         |

---

## 11. Registro dei Trattamenti (Art. 30 GDPR)

Il Responsabile mantiene un registro interno dei trattamenti effettuati per
conto di tutti i Titolari, disponibile su richiesta dell'Autorità di controllo.

---

## 12. Istruzioni del Titolare

Il Titolare può impartire istruzioni scritte al Responsabile in merito al
trattamento dei dati. Il Responsabile informa il Titolare se, a suo avviso,
un'istruzione viola il GDPR o altre normative applicabili.

---

## 13. Audit e Ispezioni

Il Titolare ha il diritto di effettuare audit o ispezioni (anche tramite
revisore terzo) con preavviso di **14 giorni**, a proprie spese e senza
interferire con le operazioni del Responsabile. Il Responsabile può richiedere
la firma di un NDA prima dell'accesso a sistemi o documentazione interna.

---

## 14. Responsabile della Protezione dei Dati (DPO)

Nexo Gestionale ha designato un Responsabile della Protezione dei Dati
raggiungibile a:  
**Email DPO:** `privacy@nexo-gestionale.com`

---

_Questo documento è un template operativo. Deve essere revisionato da un
consulente legale GDPR prima della firma con clienti enterprise o con
trattamento di dati in volume significativo._

---

## APPENDICE — Processo di firma per cliente beta

**Prima dell'attivazione di ogni cliente beta:**

- [ ] Cliente riceve DPA.md via email (formato PDF con firma digitale)
- [ ] Cliente firma e restituisce DPA firmato (accettabile: firma elettronica
      avanzata o wet ink scannerizzata)
- [ ] Nexo Gestionale S.r.l. firma e restituisce copia firmata
- [ ] DPA firmato archiviato in: `[Cartella sicura CRM/Drive]`
- [ ] Data firma registrata nel sistema

**Nota GDPR Art. 28(9):** Il DPA può essere in formato elettronico. **Nota beta
privata:** Per fase beta (<10 clienti), sufficiente scambio email con documento
allegato.

_Versione: 1.0 — 2026-05-12_
