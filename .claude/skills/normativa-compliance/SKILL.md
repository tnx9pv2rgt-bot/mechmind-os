---
name: normativa-compliance
description: "Knowledge base compliance normativa: FatturaPA XML SDI, GDPR EU 2016/679, PCI DSS 4.0.1, OWASP Top 10:2025. Si attiva automaticamente su moduli invoice/payment/gdpr/auth."
user-invocable: false
disable-model-invocation: false
effort: low
allowed-tools: ["Read"]
paths: ["backend/src/invoice/**", "backend/src/payment-link/**", "backend/src/gdpr/**", "backend/src/auth/**", "backend/src/subscription/**"]
---

# Compliance Reference — Nexo Gestionale

## 1. FatturaPA (Decreto MEF 2014 + Circolare AgE 2019)

### Struttura XML SDI

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FatturaElettronica versione="FPR12" 
  xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>PIVA_MITTENTE</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario> <!-- B2C: 0000000 -->
    </DatiTrasmissione>
    
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>PARTITA_IVA</IdCodice>
        </IdFiscaleIVA>
        <RegimeFiscale>RF01</RegimeFiscale> <!-- RF01=Ordinario -->
      </DatiAnagrafici>
    </CedentePrestatore>
  </FatturaElettronicaHeader>
  
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento> <!-- TD01=Fattura -->
        <Divisa>EUR</Divisa>
        <Data>2026-04-25</Data>
        <Numero>2026/001</Numero>
        <ImportoTotaleDocumento>122.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Tagliando auto</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>100.00</PrezzoUnitario>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>100.00</ImponibileImporto>
        <Imposta>22.00</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</FatturaElettronica>
```

### Codici TipoDocumento
| Codice | Tipo |
|--------|------|
| TD01 | Fattura |
| TD04 | Nota di credito |
| TD05 | Nota di debito |
| TD20 | Autofattura |

### Codici RegimeFiscale
| Codice | Regime |
|--------|--------|
| RF01 | Ordinario |
| RF19 | Forfettario |
| RF02 | Contribuenti minimi |

### Art.226 EU VAT — Menzioni obbligatorie
- Data fattura
- Numero progressivo
- P.IVA cedente + cessionario (se B2B)
- Descrizione beni/servizi
- Imponibile + aliquota IVA + imposta
- Totale

---

## 2. GDPR EU 2016/679

### Articoli Critici per Nexo

| Art. | Obbligo | Implementazione |
|------|---------|-----------------|
| Art.5 | Minimizzazione dati | Solo dati necessari, `select` esplicito |
| Art.13/14 | Informativa privacy | Cookie policy + privacy notice |
| Art.17 | Diritto all'oblio | `deletedAt` + anonymize PII |
| Art.20 | Portabilità | `GET /v1/gdpr/export/:id` JSON |
| Art.25 | Privacy by Design | EncryptionService AES-256, RLS |
| Art.30 | Registro attività | AuditLog su ogni mutazione PII |
| Art.32 | Sicurezza | AES-256-CBC, TLS 1.3, bcrypt |
| Art.33 | Notifica breach | Entro 72h a Garante Privacy |
| Art.34 | Notifica interessati | Se breach ad alto rischio |

### Dati Personali Identificati (PII)
- `email`, `phone`, `name`, `surname`
- `address`, `city`, `postalCode`
- `fiscalCode`, `vatNumber`
- `iban`, `creditCard`
- `licensePlate` (dati veicolo → indirettamente PII)
- `ipAddress` nei log

### Retention Legale
- Fatture/dati fiscali: **10 anni** (DPR 633/72 art.39)
- Dati prenotazioni: **3 anni** (legittimo interesse)
- Log accessi: **12 mesi** (raccomandazione EDPB)
- Dati marketing: fino a **revoca consenso**

---

## 3. PCI DSS 4.0.1

### Requirements Applicabili a Nexo

**Req.1**: Rete sicura (TLS 1.2+ obbligatorio)

**Req.3**: Protezione dati cardholder
- **MAI** memorizzare CVV, PIN, dati banda magnetica
- PAN (numero carta) → solo tokenizzato via Stripe
- Nexo NON deve toccare dati carta — tutto via Stripe.js

**Req.4**: Crittografia in transito
- TLS 1.3 su tutti gli endpoint
- HSTS header obbligatorio
- No HTTP redirect → HTTPS

**Req.6**: Software sicuro
- Dependency audit (`npm audit`)
- Semgrep SAST in CI
- OWASP Top 10 coverage test

**Req.10**: Audit log
- Tutti gli accessi ai dati payment DEVONO essere loggati
- Log immutabili (append-only)
- Retention: 12 mesi online, 3 anni archivio

**Req.12**: Webhook Stripe
```typescript
// OBBLIGATORIO: verifica firma
stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
// Se lancia → 400 Bad Request (mai 200 su firma invalida)
```

---

## 4. OWASP Top 10:2025

| # | Categoria | Nexo Rischio | Mitigazione |
|---|-----------|-------------|-------------|
| A01 | Broken Access Control | ALTO | tenantId su ogni query, RLS PostgreSQL |
| A02 | Cryptographic Failures | ALTO | AES-256-CBC PII, bcrypt password, TLS 1.3 |
| A03 | Injection | MEDIO | Prisma ORM (no raw SQL), class-validator DTO |
| A04 | Insecure Design | MEDIO | State machine validateTransition(), advisory lock |
| A05 | Security Misconfiguration | MEDIO | Security headers middleware, CORS strict |
| A06 | Vulnerable Components | MEDIO | npm audit in CI, Dependabot |
| A07 | Auth Failures | ALTO | JWT con jti, rate limiting, bcrypt ≥12 rounds |
| A08 | Software Integrity | ALTO | Stripe webhook signature, npm lockfile |
| A09 | Logging Failures | MEDIO | AuditLog su mutazioni, no PII nei log |
| A10 | SSRF | BASSO | No fetch verso URL utente-controllati |

### Security Headers Obbligatori
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Rate Limiting
```typescript
// Throttler NestJS — configurazione raccomandata
ThrottlerModule.forRoot([
  { ttl: 60_000, limit: 100 },   // 100 req/min default
  { ttl: 60_000, limit: 5 },     // 5 req/min su /auth/login
])
```

---

## 5. Checklist Pre-Deploy Compliance

```
FATTTURAPA:
  [ ] XML valida contro XSD ufficiale AgE
  [ ] TipoDocumento corretto (TD01/TD04/TD05)
  [ ] P.IVA cedente presente
  [ ] Art.226 menzioni complete

GDPR:
  [ ] Tutti i campi PII crittografati (EncryptionService)
  [ ] Soft-delete su ogni tabella PII
  [ ] Export endpoint funzionante
  [ ] Erasure endpoint funzionante
  [ ] AuditLog su ogni mutazione

PCI DSS:
  [ ] Zero dati carta memorizzati
  [ ] Webhook Stripe verifica firma
  [ ] TLS 1.3 configurato
  [ ] Audit log pagamenti

OWASP:
  [ ] tenantId su ogni query Prisma
  [ ] Security headers middleware attivo
  [ ] Rate limiting configurato
  [ ] No raw SQL
  [ ] JWT con jti per revocabilità
```
