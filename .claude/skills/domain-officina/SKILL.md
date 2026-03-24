---
name: domain-officina
description: Dominio business officina meccanica italiana. Si attiva automaticamente quando si lavora su booking, work-order, invoice, estimate, inspection, parts, warranty, maintenance.
allowed-tools: [Read]
---

# Dominio Officina Meccanica — Glossario e Flussi

## Terminologia chiave

| Termine IT | Termine EN | Significato |
|-----------|-----------|-------------|
| Tagliando | Service/Maintenance | Manutenzione periodica programmata |
| DVI | Digital Vehicle Inspection | Ispezione digitale con foto/video |
| OdL | Work Order | Ordine di lavorazione |
| Canned Job | Canned Job | Lavoro predefinito con parti e manodopera |
| Ricambio | Part | Pezzo di ricambio |
| Manodopera | Labor | Costo orario del meccanico |
| Preventivo | Estimate | Stima costi prima della lavorazione |
| FatturaPA | FatturaPA | Fattura elettronica XML per SDI |
| SDI | Sistema di Interscambio | Hub fatturazione elettronica italiano |
| P.IVA | VAT Number | Partita IVA |
| PEC | Certified Email | Posta Elettronica Certificata |
| Regime fiscale | Tax Regime | Regime IVA (ordinario, forfettario, etc.) |
| Bollo | Stamp duty | Imposta di bollo su fatture esenti IVA |
| Revisione | MOT/Inspection | Revisione periodica obbligatoria |
| Carrozzeria | Body shop | Riparazione carrozzeria |
| Gomme/Pneumatici | Tires | Servizio gomme stagionale |

## Flusso tipo officina

```
Prenotazione online/telefonica
    ↓
Accettazione (check-in veicolo)
    ↓
DVI — Ispezione digitale (foto + video)
    ↓
Preventivo al cliente (approvazione)
    ↓
OdL — Ordine di Lavorazione
    ↓
Lavorazione (meccanico assegnato)
    ↓
Controllo qualità
    ↓
Fattura (FatturaPA → SDI)
    ↓
Consegna veicolo (check-out)
```

## Stato prenotazione (Booking)
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
PENDING → CANCELLED
CONFIRMED → CANCELLED

## Stato OdL (Work Order)
DRAFT → IN_PROGRESS → QUALITY_CHECK → COMPLETED → INVOICED
DRAFT → CANCELLED

## Stato fattura (Invoice)
DRAFT → SENT → PAID
DRAFT → CANCELLED
SENT → OVERDUE → PAID

Vedi `references/regole-italia.md` per normativa italiana.
