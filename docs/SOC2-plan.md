# SOC 2 Type II — Piano di Avvio Nexo Gestionale

**Data avvio:** 2026-05-03
**Owner:** Giovanni Romano
**Target audit:** Q4 2026 / Q1 2027

---

## Scelta Tool: Vanta

**Raccomandazione: Vanta** (Core, ~$10,000/anno)

| Criterio | Vanta | Drata |
|----------|-------|-------|
| Prezzo entry | $10,000–12,000/anno | $7,500/anno |
| Integrazioni | 400+ | 170+ |
| GitHub | ✅ nativo | ✅ nativo |
| AWS | ✅ nativo | ✅ nativo |
| Stripe | ✅ nativo | ✅ nativo |
| Sentry | ✅ nativo | ⚠️ limitato |
| Velocità a audit | ★★★★★ | ★★★★☆ |
| Supporto startup | ★★★★☆ | ★★★★★ |

**Motivo scelta Vanta:** stack Nexo (GitHub + AWS + Stripe + Sentry) è 100% supportato nativamente → tempo di integrazione minimo. Drata costa meno ma non copre Sentry out-of-the-box e ha meno integrazioni per il nostro stack. A parità di sforzo, Vanta arriva in audit prima.

**Partner certificato:** acquistare tramite partner certificato Vanta per 20-40% di sconto → target ~$7,000–8,000/anno primo anno.

---

## Timeline SOC 2 Type II

```
FASE 1 — Onboarding e Gap Assessment (1 settimana)
  └─ Attivazione account Vanta
  └─ Connessione integrazioni: GitHub, AWS, Stripe, Sentry, Render
  └─ Inventario asset: server, DB, servizi terzi
  └─ Gap report automatico: controlli mancanti vs Trust Services Criteria

FASE 2 — Remediation (6-8 settimane)
  └─ Fix policy mancanti (vendor management, access review, change management)
  └─ Attivazione controlli tecnici (MFA enforcement, log retention 1 anno, backup test)
  └─ Training dipendenti (security awareness — obbligatorio per SOC 2)
  └─ Vendor risk assessment (Stripe, AWS, Render, Resend, Twilio, OpenAI)

FASE 3 — Observation Period (6 mesi — obbligatorio Type II)
  └─ Inizio: luglio 2026
  └─ Fine: dicembre 2026
  └─ Vanta raccoglie evidence automaticamente (commit log, deploy log, access review)
  └─ Review mensile controlli — nessun gap aperto oltre 30 giorni

FASE 4 — Audit Fieldwork (4-6 settimane)
  └─ Auditor: Prescient Assurance / Johanson / A-LIGN (partner Vanta)
  └─ Stima costo audit: $15,000–25,000
  └─ Target: gennaio–febbraio 2027

FASE 5 — Report SOC 2 Type II
  └─ Emissione: marzo 2027
  └─ Pubblicazione su Trust Center: trust.nexo.it
  └─ Validità: 12 mesi (renewal annuale)
```

**Timeline totale:** ~10 mesi (maggio 2026 → marzo 2027)

---

## Trust Services Criteria (TSC) in Scope

| Criterio | Descrizione | Stato attuale |
|----------|-------------|---------------|
| **CC — Common Criteria** | Security, availability, confidentiality | ⚠️ parziale |
| **A — Availability** | Uptime SLA 99.9% | ⚠️ manca statuspage |
| **C — Confidentiality** | PII encryption, access control | ✅ AES-256-CBC |
| ~~PI — Processing Integrity~~ | N/A per ora | — |
| ~~P — Privacy~~ | GDPR copre questo | — |

Scope iniziale: **CC + A + C** (standard per SaaS B2B).

---

## Integrazioni Vanta da Configurare (Giorno 1)

| Sistema | Cosa raccoglie | Priorità |
|---------|---------------|----------|
| GitHub | Commit firmati, branch protection, PR review, code scanning | 🔴 CRITICA |
| AWS | IAM roles, S3 encryption, CloudTrail logs, Security Hub | 🔴 CRITICA |
| Render | Deploy log, environment variables audit | 🔴 CRITICA |
| Stripe | PCI compliance status, webhook security | 🟠 ALTA |
| Sentry | Error monitoring attivo, alert configurati | 🟠 ALTA |
| Google Workspace | MFA, access provisioning/deprovisioning | 🟠 ALTA |
| Slack | Audit log per comunicazioni operative | 🟡 MEDIA |

---

## Policy da Creare (Vanta fornisce template)

- [ ] Information Security Policy
- [ ] Access Control Policy
- [ ] Incident Response Policy (già in `docs/runbooks/incident-response.md`)
- [ ] Change Management Policy
- [ ] Vendor Management Policy
- [ ] Business Continuity / DR Policy (già in `docs/disaster-recovery-plan.md`)
- [ ] Data Classification Policy
- [ ] Acceptable Use Policy
- [ ] Password Policy (MFA obbligatorio)

---

## Costi Stimati Totali

| Voce | Costo |
|------|-------|
| Vanta Core (anno 1, via partner) | ~$8,000 |
| Audit fieldwork (Type II) | ~$20,000 |
| Legal review policy | ~$2,000 |
| **Totale primo anno** | **~$30,000** |
| Vanta anno 2+ (renewal) | ~$9,000–12,000 |

---

## Next Steps Immediati

1. **Registrarsi su vanta.com** → richiedi demo + quota via partner certificato
2. **Nominare CISO/Security Owner** → Giovanni Romano (interim)
3. **Creare `security@nexo.it`** → già nel Trust Center
4. **Onboarding kick-off:** entro 2026-05-10
