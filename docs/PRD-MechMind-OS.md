# MechMind OS v10 — Product Requirements Document

> **Classificazione:** Confidenziale | **Stato:** Approvato | **Versione:** 3.1
>
> | Ruolo | Nome | Data |
> |-------|------|------|
> | **Autore** | Giovanni Romano, CEO & Lead Engineer | 2026-03-31 |
> | **Product Owner** | Giovanni Romano | 2026-03-31 |
> | **Engineering Lead** | Giovanni Romano | 2026-03-31 |
> | **Revisori** | — | — |
>
> **Ultimo aggiornamento:** 31 Marzo 2026

---

## Indice

1. [Press Release (formato Amazon)](#1-press-release---formato-amazon)
2. [Il Problema](#2-il-problema)
3. [Perche Ora](#3-perche-ora)
4. [Obiettivi e Metriche di Successo](#4-obiettivi-e-metriche-di-successo)
5. [Non-Goal (cosa NON facciamo)](#5-non-goal---cosa-non-facciamo)
6. [Utenti e Jobs-to-be-Done](#6-utenti-e-jobs-to-be-done)
7. [Panoramica della Soluzione](#7-panoramica-della-soluzione)
8. [Requisiti Funzionali Dettagliati](#8-requisiti-funzionali-dettagliati)
9. [Requisiti Non-Funzionali](#9-requisiti-non-funzionali)
10. [Architettura Tecnica](#10-architettura-tecnica)
11. [Modello di Dati](#11-modello-di-dati)
12. [Alternative Considerate (formato Google)](#12-alternative-considerate---formato-google)
13. [Prioritizzazione MoSCoW](#13-prioritizzazione-moscow)
14. [Piano di Lancio e Milestone](#14-piano-di-lancio-e-milestone)
15. [Modello di Business e Unit Economics](#15-modello-di-business-e-unit-economics)
16. [Rischi e Pre-Mortem (formato Stripe)](#16-rischi-e-pre-mortem---formato-stripe)
17. [Ipotesi e Criteri di Successo (formato Meta)](#17-ipotesi-e-criteri-di-successo---formato-meta)
18. [Domande Aperte](#18-domande-aperte)
19. [FAQ — Clienti](#19-faq---clienti)
20. [FAQ — Stakeholder Interni](#20-faq---stakeholder-interni)
21. [Appendice](#21-appendice)

---

# 1. Press Release — Formato Amazon

> *Scritto come se il prodotto fosse gia stato lanciato con successo. Se non riesci a scriverlo in modo chiaro, il concetto del prodotto non e abbastanza definito. (Jeff Bezos)*

## MechMind OS: Il Sistema Operativo che Trasforma le Officine Meccaniche Italiane in Imprese Digitali

**Roma, Italia — 31 Marzo 2026**

**MechMind OS**, la piattaforma SaaS multi-tenant progettata esclusivamente per le officine meccaniche italiane, annuncia il lancio della versione 10 — il sistema operativo completo che unifica prenotazioni intelligenti, gestione ordini di lavoro, fatturazione elettronica, diagnostica AI, ispezioni digitali e compliance normativa in un'unica piattaforma cloud-native.

### Il Problema

Le 85.000+ officine meccaniche italiane operano ancora con agende cartacee, fogli Excel e software disconnessi degli anni '90. Il risultato: appuntamenti persi, clienti insoddisfatti, zero visibilita sui dati, e un incubo di compliance con GDPR, RENTRI, NIS2 e la nuova regolamentazione EU AI Act. Il titolare medio spende 12+ ore a settimana in attivita amministrative invece di generare ricavi.

### La Soluzione

MechMind OS elimina questa frammentazione offrendo un'unica piattaforma che gestisce l'intero ciclo operativo dell'officina — dalla telefonata del cliente alla fattura incassata — con intelligenza artificiale integrata, compliance europea by-design, e un'interfaccia pensata per chi lavora con le mani unte di grasso, non con i fogli di calcolo.

> *"MechMind OS ha ridefinito il modo in cui gestiamo la nostra officina. Prima perdevamo 3-4 appuntamenti a settimana per sovrapposizioni. Oggi il sistema gestisce tutto: prenotazioni, ordini di lavoro, ricambi, fatture. In 6 mesi abbiamo aumentato il fatturato del 23% e ridotto i tempi amministrativi del 60%."*
>
> — **Marco Bianchi**, titolare di AutoService Milano, 4 meccanici, cliente MechMind Pro

### Come Iniziare

Registrati su mechmind.io. In 15 minuti hai l'officina digitale operativa. Nessuna installazione. Nessun hardware. Prova gratuita di 14 giorni, poi da €49/mese.

---

# 2. Il Problema

## 2.1 Contesto di Mercato

| Dato | Valore | Fonte |
|------|--------|-------|
| Officine meccaniche in Italia | ~85.000 | ISTAT 2025 |
| % che usa software gestionale dedicato | < 15% | Stima settore |
| % che usa ancora agende cartacee | ~45% | Ricerca CNA 2024 |
| Perdita media per no-show/overbooking | €2.400/anno per officina | Analisi interna |
| Tempo settimanale in admin per titolare | 12-15 ore | Interviste utenti |
| Officine multate per non-compliance GDPR | +340% YoY | Garante Privacy 2025 |
| Deadline RENTRI per officine | 2026 Q2 | D.Lgs. 152/2006 |
| Deadline NIS2 per PMI critiche | 2026 Q4 | Direttiva UE 2022/2555 |

## 2.2 Pain Point Validati (Ricerca Utenti — 127 Interviste)

### Pain #1: Caos Operativo (citato dal 89% degli intervistati)
- Prenotazioni su WhatsApp, telefonate, post-it, agenda cartacea
- Nessuna vista unificata degli impegni giornalieri
- Doppia prenotazione sullo stesso ponte sollevatore
- Meccanici che non sanno cosa devono fare la mattina

### Pain #2: Zero Visibilita Finanziaria (citato dal 76%)
- Non sanno quali servizi sono profittevoli
- Nessun tracking dei tempi di lavorazione
- Fatturazione manuale con errori frequenti
- Ricambi ordinati due volte o mai ordinati

### Pain #3: Compliance come Incubo (citato dal 71%)
- GDPR: non sanno cosa devono fare, temono sanzioni
- RENTRI: nuovi obblighi di tracciamento rifiuti, nessun tool
- Fatturazione elettronica Art. 226: template inadeguati
- Nessun audit trail per ispezioni e lavori eseguiti

### Pain #4: Perdita Clienti (citato dal 64%)
- Nessun promemoria automatico per tagliandi
- Zero follow-up post-servizio
- Cliente chiama, nessuno ricorda lo storico
- Nessun portale clienti per trasparenza

## 2.3 Costo dell'Inazione

Per un'officina media con 3 meccanici e €350K di fatturato annuo:

| Voce | Costo Annuo Stimato |
|------|-------------------|
| No-show e overbooking | €2.400 |
| Tempo admin del titolare (12h/sett x €35/h) | €21.840 |
| Ricambi persi/duplicati | €3.200 |
| Clienti persi per mancato follow-up | €8.500 |
| Rischio sanzione GDPR (media PMI) | €12.000 |
| Rischio sanzione RENTRI | €5.000 |
| **Totale costo nascosto** | **€52.940/anno** |

**Il costo di MechMind Pro: €1.188/anno.** ROI: **44:1.**

---

# 3. Perche Ora

## 3.1 Convergenza di 5 Forze

```
                    ┌─────────────────────┐
                    │   REGOLAMENTAZIONE   │
                    │  GDPR enforcement    │
                    │  RENTRI 2026 Q2      │
                    │  NIS2 2026 Q4        │
                    │  EU AI Act 2026      │
                    └─────────┬───────────┘
                              │
    ┌─────────────────┐       │       ┌──────────────────┐
    │   TECNOLOGIA    │───────┼───────│   MERCATO        │
    │  AI generativa  │       │       │  85K officine    │
    │  Voice AI       │       │       │  < 15% digitali  │
    │  PWA mature     │       │       │  Ricambio gen.   │
    └─────────────────┘       │       └──────────────────┘
                              │
    ┌─────────────────┐       │       ┌──────────────────┐
    │   COMPETIZIONE  │───────┘───────│   ECONOMIA       │
    │  Nessun leader  │               │  Margini in calo │
    │  Soluzioni US   │               │  Costo energia   │
    │  No compliance  │               │  Necessita ROI   │
    └─────────────────┘               └──────────────────┘
```

1. **Regolamentazione** — RENTRI entra in vigore Q2 2026, NIS2 a Q4 2026. Le officine DEVONO digitalizzarsi o rischiano sanzioni. Finestra di 12-18 mesi in cui il software diventa obbligatorio, non opzionale.

2. **Maturita tecnologica** — Voice AI (Vapi), PWA, Edge computing rendono possibile oggi quello che 3 anni fa costava 10x. Un'officina puo avere un assistente telefonico AI per €0.15/minuto.

3. **Vuoto competitivo** — Nessun player dominante nel segmento officine italiane. I competitor sono americani (Mitchell, Shopware) senza compliance EU, o italiani legacy (DOS-based) senza cloud. Finestra di first-mover advantage di ~18 mesi.

4. **Ricambio generazionale** — Figli di meccanici che ereditano l'officina e vogliono digitalizzare. Cresciuti con smartphone, si aspettano software moderno.

5. **Pressione economica** — Margini in calo, costi energetici in aumento. Le officine devono ottimizzare o chiudere. Il software non e piu un lusso, e sopravvivenza.

---

# 4. Obiettivi e Metriche di Successo

## 4.1 North Star Metric

> **Numero di ordini di lavoro completati con successo al mese attraverso MechMind OS**

Questa metrica cattura: adozione (il tool e usato), valore (genera ricavi per il cliente), retention (continuano a usarlo).

## 4.2 Obiettivi Primari (OKR — 12 Mesi)

| Objective | Key Result | Target | Baseline | Owner |
|-----------|-----------|--------|----------|-------|
| **O1: Dominare il mercato italiano** | KR1: Officine attive paganti | 500 | 70 | Growth |
| | KR2: NPS | > 65 | 52 | Product |
| | KR3: Churn mensile | < 3% | 5.2% | CS |
| **O2: Diventare indispensabile** | KR4: WAU/MAU (stickiness) | > 60% | 42% | Product |
| | KR5: OdL completati/mese (piattaforma) | 25.000 | 2.500 | Product |
| | KR6: Tempo medio primo valore (TTFV) | < 48h | 7 giorni | Onboarding |
| **O3: Eccellenza tecnica** | KR7: Uptime | 99.95% | 99.95% | Eng |
| | KR8: API latency p95 | < 150ms | 120ms | Eng |
| | KR9: Zero incidenti sicurezza P1 | 0 | 0 | Security |
| **O4: Sostenibilita economica** | KR10: MRR | €52.000 | €5.930 | Revenue |
| | KR11: LTV/CAC | > 3:1 | 2.8:1 | Finance |
| | KR12: Gross Margin | > 80% | 78% | Finance |

## 4.3 Guardrail Metrics (NON devono peggiorare)

| Metrica | Soglia di Allarme | Azione |
|---------|-------------------|--------|
| Error rate API | > 0.1% | Freeze deploy, hotfix |
| Tempo risposta ticket | > 4h (business hours) | Escalation automatica |
| Test coverage | < 95% | Block merge |
| GDPR compliance score | < 100% | P0 immediato |
| Customer effort score (CES) | > 3/7 | UX review |

---

# 5. Non-Goal — Cosa NON Facciamo

> *La sezione Non-Goal e la sezione con il piu alto leverage di un PRD. Allinea il team piu degli obiettivi stessi.* — Shreyas Doshi (ex-Stripe, ex-Google)

| # | Non-Goal | Perche |
|---|----------|--------|
| 1 | **Non costruiamo un ERP generico** | Siamo verticali sulle officine meccaniche. Non carrozzerie, non concessionarie, non gomme. La verticalizzazione e il nostro vantaggio. |
| 2 | **Non supportiamo mercati non-EU (per ora)** | La compliance EU e un differenziatore. Diluirlo per il mercato US/Asia ridurrebbe il vantaggio senza aggiungere revenue significativo nei prossimi 18 mesi. |
| 3 | **Non costruiamo un marketplace ricambi** | Il business model e SaaS, non marketplace. L'integrazione con fornitori esistenti (fornitori locali, Autodoc API) e sufficiente. |
| 4 | **Non facciamo hardware proprio** | OBD reader, stampanti, tablet: usiamo hardware di terze parti. Zero CAPEX hardware, focus sul software. |
| 5 | **Non offriamo consulenza fiscale/legale** | Il software facilita la compliance, ma non sostituisce il commercialista. Nessun rischio di responsabilita professionale. |
| 6 | **Non costruiamo un CRM generico** | Customer 360 e pensato per il contesto officina (veicoli, storico lavorazioni, VIN), non per vendite B2B generiche. |
| 7 | **Non supportiamo self-hosting** | Cloud-only. Riduce complessita ops, garantisce aggiornamenti uniformi, semplifica sicurezza. |
| 8 | **Non facciamo white-label (per ora)** | Focus sul brand MechMind. White-label richiede risorse di supporto che non abbiamo. Rivisitabile a >500 clienti. |

---

# 6. Utenti e Jobs-to-be-Done

> *Struttura JTBD: "Quando [situazione], voglio [motivazione], cosi posso [risultato atteso]."* — Clayton Christensen

## 6.1 Persona Primaria: Marco, Titolare di Officina

```
┌──────────────────────────────────────────────────────────────┐
│  MARCO BIANCHI — Titolare, AutoService Milano               │
│  Eta: 42 | Officina: 4 meccanici | Fatturato: €420K/anno    │
│                                                              │
│  "Passo piu tempo al telefono e al computer che sotto       │
│   le macchine. Non e per questo che ho aperto l'officina."  │
│                                                              │
│  Frustrazioni:                                               │
│  - 3h/giorno al telefono per appuntamenti                   │
│  - Non sa se il mese sta andando bene fino a fine mese      │
│  - Ha paura delle sanzioni GDPR/RENTRI                      │
│  - I clienti vanno dalla concorrenza perche "piu moderna"   │
│                                                              │
│  Obiettivi:                                                  │
│  - Liberare tempo per supervisione tecnica                  │
│  - Aumentare fatturato senza assumere                       │
│  - Essere in regola senza impazzire                         │
│  - Modernizzare l'immagine dell'officina                    │
└──────────────────────────────────────────────────────────────┘
```

### Jobs-to-be-Done di Marco

| # | Situazione | Motivazione | Risultato |
|---|-----------|-------------|-----------|
| J1 | Quando un cliente chiama per prenotare | Voglio che il sistema gestisca la disponibilita automaticamente | Cosi non perdo appuntamenti e non faccio overbooking |
| J2 | Quando un veicolo entra in officina | Voglio vedere immediatamente lo storico completo | Cosi posso dare una stima accurata e veloce |
| J3 | Quando un meccanico finisce un lavoro | Voglio che la fattura si generi automaticamente | Cosi incasso prima e senza errori |
| J4 | Quando e lunedi mattina | Voglio vedere il cruscotto della settimana | Cosi so esattamente cosa aspettarmi in termini di carico e ricavi |
| J5 | Quando il Garante Privacy chiede documentazione | Voglio esportare tutto con un click | Cosi non rischio sanzioni da €20K+ |
| J6 | Quando un cliente non torna da 6 mesi | Voglio che il sistema lo ricontatti automaticamente | Cosi recupero clienti dormienti senza sforzo |

## 6.2 Persona Secondaria: Laura, Receptionist

```
┌──────────────────────────────────────────────────────────────┐
│  LAURA ROSSI — Receptionist, AutoService Milano              │
│  Eta: 28 | Ruolo: Front-desk | Esperienza tech: media       │
│                                                              │
│  "Rispondo a 40 telefonate al giorno. Meta sono per         │
│   chiedere 'a che punto e la mia macchina?'"                │
│                                                              │
│  Frustrazioni:                                               │
│  - Telefono che squilla senza sosta                         │
│  - Clienti irritati per mancanza di aggiornamenti           │
│  - Deve chiedere ai meccanici lo stato dei lavori           │
│  - Errori di trascrizione appuntamenti                      │
└──────────────────────────────────────────────────────────────┘
```

| # | Situazione | Motivazione | Risultato |
|---|-----------|-------------|-----------|
| J7 | Quando il telefono squilla e sono gia occupata | Voglio che l'AI risponda e prenoti | Cosi non perdo il cliente |
| J8 | Quando un cliente chiede lo stato del lavoro | Voglio trovarlo in 2 secondi | Cosi do una risposta professionale e veloce |
| J9 | Quando devo mandare un preventivo | Voglio generarlo dal template con un click | Cosi non perdo 20 minuti a scriverlo a mano |

## 6.3 Persona Secondaria: Luca, Meccanico Senior

```
┌──────────────────────────────────────────────────────────────┐
│  LUCA FERRARI — Meccanico Senior                             │
│  Eta: 35 | Specializzazione: Diagnostica elettronica         │
│                                                              │
│  "Non voglio un altro software. Voglio sapere cosa devo     │
│   fare oggi, avere i ricambi pronti, e non perdere tempo."  │
│                                                              │
│  Frustrazioni:                                               │
│  - Ricambi non disponibili, lavoro fermo                    │
│  - Non sa cosa lo aspetta la mattina                        │
│  - Nessun modo di documentare ispezioni velocemente         │
│  - Le informazioni del veicolo sono su fogli sparsi         │
└──────────────────────────────────────────────────────────────┘
```

| # | Situazione | Motivazione | Risultato |
|---|-----------|-------------|-----------|
| J10 | Quando arrivo la mattina | Voglio vedere la mia lista lavori ordinata | Cosi inizio subito senza aspettare istruzioni |
| J11 | Quando ispeziono un veicolo | Voglio documentare con foto dal telefono | Cosi il cliente vede i problemi e approva i lavori |
| J12 | Quando mi serve un ricambio | Voglio sapere se e in magazzino in tempo reale | Cosi non fermo il lavoro per cercarlo |

## 6.4 Persona Terziaria: Giulia, Fleet Manager

| # | Situazione | Motivazione | Risultato |
|---|-----------|-------------|-----------|
| J13 | Quando gestisco 50+ veicoli aziendali | Voglio una vista unificata della manutenzione | Cosi prevedo i costi e evito fermi |
| J14 | Quando devo fare report al management | Voglio dati aggregati automatici | Cosi non passo 2 giorni su Excel |
| J15 | Quando un veicolo si guasta inaspettatamente | Voglio alert predittivi basati su OBD | Cosi prevedo i problemi prima che accadano |

---

# 7. Panoramica della Soluzione

## 7.1 Visione Prodotto

> **MechMind OS e il sistema operativo dell'officina meccanica moderna: una piattaforma unica che trasforma ogni touchpoint — dalla telefonata del cliente alla fattura incassata — in un processo digitale, intelligente e conforme.**

## 7.2 Principi di Design

| # | Principio | Implicazione |
|---|-----------|-------------|
| 1 | **Mani sporche, interfaccia pulita** | Touch target 44px, UI minimale, zero clutter. Un meccanico con le mani unte deve poter usare il tablet. |
| 2 | **Italiano prima di tutto** | Ogni stringa, ogni label, ogni messaggio di errore in italiano corretto. Nessun "Save", solo "Salva". |
| 3 | **Compliance invisibile** | L'utente non deve sapere cos'e il GDPR. Il sistema lo protegge automaticamente. |
| 4 | **Dati, non intuizioni** | Ogni decisione dell'officina supportata da dati reali: KPI, trend, benchmark di settore. |
| 5 | **Zero training** | Se serve un manuale, il design ha fallito. Onboarding guidato, non documentazione. |
| 6 | **Offline-first mentality** | L'officina e un capannone con WiFi instabile. PWA con cache, sync quando torna la connessione. |
| 7 | **API-first, UI-second** | Ogni funzionalita esiste prima come API. La UI e un client dell'API. Questo abilita integrazioni future. |

## 7.3 Architettura Funzionale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MECHMIND OS v10                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  PRENOTARE   │  │   LAVORARE   │  │  FATTURARE  │  │ CRESCERE │ │
│  │             │  │              │  │             │  │          │ │
│  │ Booking AI  │  │ Work Orders  │  │ Invoicing   │  │Analytics │ │
│  │ Calendar    │  │ DVI/Inspect  │  │ Estimates   │  │Marketing │ │
│  │ Voice AI    │  │ Parts Mgmt   │  │ Payments    │  │Reviews   │ │
│  │ Reminders   │  │ OBD Diag     │  │ Art.226 VAT │  │Campaigns │ │
│  │ Portal      │  │ Prod Board   │  │ Accounting  │  │Benchmark │ │
│  │ Kiosk       │  │ Pred. Maint  │  │ Payroll     │  │Fleet     │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └────┬─────┘ │
│         │                │                  │               │       │
│  ┌──────┴────────────────┴──────────────────┴───────────────┴─────┐ │
│  │                    PIATTAFORMA CORE                            │ │
│  │                                                               │ │
│  │  Auth & RBAC │ Multi-Tenancy RLS │ Notifications │ Audit Log │ │
│  │  Encryption  │ Event Streaming   │ File Storage  │ Search    │ │
│  │  GDPR Engine │ RENTRI Module     │ NIS2 Security │ AI Act    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    INFRASTRUTTURA                             │ │
│  │  PostgreSQL 15 (RLS) │ Redis 7 │ BullMQ │ S3 │ Vercel Edge │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 7.4 Flusso Utente Principale (Happy Path)

```
Cliente chiama          Sistema                         Officina
    │                      │                                │
    │──── Telefonata ─────>│                                │
    │                      │── Voice AI risponde            │
    │                      │── Verifica disponibilita       │
    │                      │── Crea prenotazione            │
    │<── Conferma SMS ─────│                                │
    │                      │── Notifica receptionist ──────>│
    │                      │                                │
    │──── Arrivo ─────────>│                                │
    │                      │── Check-in kiosk/reception     │
    │                      │── Crea ordine di lavoro ──────>│
    │                      │                                │── Meccanico assegnato
    │                      │                                │── Ispezione digitale
    │<── Link ispezione ───│                                │── Foto + findings
    │──── Approva lavori ─>│                                │
    │                      │                                │── Esecuzione lavori
    │                      │                                │── Ricambi da magazzino
    │                      │                                │── Tracking tempo
    │                      │── Lavoro completato            │
    │<── Notifica pronto ──│                                │
    │                      │── Genera fattura automatica    │
    │──── Paga ───────────>│── Stripe payment              │
    │<── Fattura PDF ──────│                                │
    │                      │── Aggiorna storico veicolo     │
    │                      │── Calcola prossimo tagliando   │
    │                      │── Schedule reminder automatico │
    │                      │                                │
    │  [6 mesi dopo]       │                                │
    │<── "E' ora del       │                                │
    │     tagliando!" ─────│                                │
    │──── Prenota online ─>│                                │
    └                      └                                └
```

---

# 8. Requisiti Funzionali Dettagliati

## 8.1 Modulo Prenotazioni (Booking Engine)

### 8.1.1 Requisiti Core

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| B-001 | Il sistema deve permettere la creazione di prenotazioni con data, ora, servizio, veicolo e cliente | Must | ✅ GA |
| B-002 | Il sistema deve prevenire overbooking tramite advisory lock PostgreSQL con isolamento SERIALIZABLE | Must | ✅ GA |
| B-003 | Il sistema deve inviare conferma automatica via SMS (Twilio) e email (Resend) | Must | ✅ GA |
| B-004 | Il sistema deve supportare prenotazioni ricorrenti (es. tagliando ogni 6 mesi) | Should | ✅ GA |
| B-005 | Il sistema deve gestire slot di disponibilita per meccanico e per ponte sollevatore | Must | ✅ GA |
| B-006 | Il sistema deve supportare prenotazione vocale tramite Voice AI (Vapi) | Should | ✅ GA |
| B-007 | Il sistema deve mostrare una vista calendario (giornaliera, settimanale, mensile) | Must | ✅ GA |
| B-008 | Il sistema deve gestire no-show con politica configurabile (blacklist, penale) | Could | ✅ GA |
| B-009 | Il sistema deve supportare lista d'attesa quando tutti gli slot sono pieni | Could | 🔜 Planned |
| B-010 | Il portale clienti deve permettere self-booking con conferma automatica o manuale | Should | ✅ GA |

### 8.1.2 State Machine — Prenotazione

```
                    ┌──────────┐
                    │ RESERVED │ (slot bloccato, attesa conferma)
                    └────┬─────┘
                         │ confirm()
                    ┌────▼─────┐
              ┌─────│CONFIRMED │──────────┐
              │     └────┬─────┘          │
              │          │ checkIn()      │ cancel()
              │     ┌────▼─────┐     ┌────▼──────┐
              │     │IN_PROGRESS│     │ CANCELLED │
              │     └────┬─────┘     └───────────┘
              │          │ complete()
              │     ┌────▼─────┐
              │     │COMPLETED │
              │     └────┬─────┘
              │          │ invoice()
              │     ┌────▼─────┐
              └─────│ INVOICED │
                    └──────────┘
```

### 8.1.3 Concurrency Model

```
Client A ──┐                              ┌── Client B
            │                              │
            ▼                              ▼
     ┌──────────────┐              ┌──────────────┐
     │ POST /booking│              │ POST /booking│
     └──────┬───────┘              └──────┬───────┘
            │                              │
     ┌──────▼───────────────────────────────┐
     │      PostgreSQL Advisory Lock        │
     │      pg_advisory_xact_lock(slot_id)  │
     │                                      │
     │  Client A: ✅ Acquires lock          │
     │  Client B: ⏳ Waits (SERIALIZABLE)  │
     │                                      │
     │  Client A: INSERT booking → COMMIT   │
     │  Client B: Checks → Slot taken → 409│
     └──────────────────────────────────────┘
```

## 8.2 Modulo Ordini di Lavoro (Work Orders)

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| WO-001 | Creazione OdL da prenotazione con auto-import dati cliente/veicolo | Must | ✅ GA |
| WO-002 | Assegnazione meccanico con vista carico di lavoro | Must | ✅ GA |
| WO-003 | Tracking tempo lavorazione per meccanico (start/stop/pause) | Must | ✅ GA |
| WO-004 | Aggiunta ricambi da magazzino con decremento automatico scorte | Must | ✅ GA |
| WO-005 | State machine: open → in_progress → completed → invoiced | Must | ✅ GA |
| WO-006 | Production board (vista Kanban per officina) | Should | ✅ GA |
| WO-007 | Allegati foto (before/after) con upload S3 | Should | ✅ GA |
| WO-008 | Firma digitale del meccanico alla chiusura | Could | ✅ GA |
| WO-009 | Notifica automatica al cliente quando OdL completato | Must | ✅ GA |
| WO-010 | Template "canned jobs" (lavori predefiniti con tempi e ricambi standard) | Should | ✅ GA |

## 8.3 Modulo Ispezioni Digitali (DVI)

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| DVI-001 | Template ispezione configurabili per tipo veicolo | Must | ✅ GA |
| DVI-002 | Checklist con stati: OK / Attenzione / Critico | Must | ✅ GA |
| DVI-003 | Foto per ogni finding con annotazioni | Must | ✅ GA |
| DVI-004 | Generazione automatica preventivo da findings critici | Should | ✅ GA |
| DVI-005 | Invio report ispezione al cliente via link (no login required) | Must | ✅ GA |
| DVI-006 | Approvazione lavori consigliati dal cliente via portale | Should | ✅ GA |
| DVI-007 | Storico ispezioni per veicolo (confronto nel tempo) | Could | ✅ GA |

## 8.4 Modulo Fatturazione e Pagamenti

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| INV-001 | Generazione fattura da OdL (manodopera + ricambi) | Must | ✅ GA |
| INV-002 | Conformita Art. 226 Direttiva IVA EU (campi obbligatori) | Must | ✅ GA |
| INV-003 | Calcolo IVA automatico (22% standard, aliquote ridotte) | Must | ✅ GA |
| INV-004 | Pagamento online via Stripe (carta, bonifico) | Must | ✅ GA |
| INV-005 | Esportazione fatture per commercialista (CSV/PDF) | Must | ✅ GA |
| INV-006 | Promemoria pagamento automatico (scadenze) | Should | ✅ GA |
| INV-007 | Note di credito | Should | ✅ GA |
| INV-008 | Preventivi con conversione in fattura | Must | ✅ GA |
| INV-009 | Report finanziario (fatturato, incassato, scaduto) | Should | ✅ GA |
| INV-010 | Payment link inviabile via SMS al cliente | Should | ✅ GA |

## 8.5 Modulo Magazzino Ricambi (Parts & Inventory)

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| PARTS-001 | Catalogo ricambi con codice, descrizione, prezzo, fornitore | Must | ✅ GA |
| PARTS-002 | Tracking scorte in tempo reale con soglie minime | Must | ✅ GA |
| PARTS-003 | Alert automatico sotto-scorta (email + notifica in-app) | Must | ✅ GA |
| PARTS-004 | Movimenti magazzino con audit trail completo | Must | ✅ GA |
| PARTS-005 | Ordini di acquisto a fornitore | Should | ✅ GA |
| PARTS-006 | Calcolo margine su ricambi (costo vs prezzo vendita) | Should | ✅ GA |
| PARTS-007 | Barcode/SKU scanning (camera del telefono) | Could | 🔜 Planned |
| PARTS-008 | Multi-location inventory (per officine multi-sede) | Could | ✅ GA |

## 8.6 Modulo Analytics e Dashboard

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| AN-001 | Dashboard KPI real-time: fatturato, OdL, prenotazioni, utilization | Must | ✅ GA |
| AN-002 | Grafici trend (giornaliero, settimanale, mensile, annuale) | Must | ✅ GA |
| AN-003 | Performance per meccanico (produttivita, qualita, tempi) | Should | ✅ GA |
| AN-004 | Analisi profittabilita per tipo servizio | Should | ✅ GA |
| AN-005 | Export dati in CSV/Excel/PDF | Must | ✅ GA |
| AN-006 | Benchmarking vs. medie di settore | Could | ✅ GA |
| AN-007 | Anomaly detection (alert per metriche fuori norma) | Could | ✅ GA |
| AN-008 | CEO Dashboard (vista C-level aggregata) | Could | ✅ GA |
| AN-009 | Conversion funnel (lead → prenotazione → OdL → fattura) | Should | ✅ GA |

## 8.7 Modulo Clienti (Customer 360)

| ID | Requisito | Priorita | Stato |
|----|----------|----------|-------|
| CU-001 | Anagrafica cliente completa (nome, tel, email, indirizzo, CF/P.IVA) | Must | ✅ GA |
| CU-002 | PII criptati con AES-256-GCM (EncryptionService) | Must | ✅ GA |
| CU-003 | Veicoli associati (multipli per cliente) con VIN, targa, modello | Must | ✅ GA |
| CU-004 | Storico completo: prenotazioni, OdL, fatture, ispezioni | Must | ✅ GA |
| CU-005 | Preferenze notifica (email, SMS, push) con consent GDPR | Must | ✅ GA |
| CU-006 | Tag e segmentazione per campagne marketing | Should | ✅ GA |
| CU-007 | Import massivo clienti (CSV) con deduplicazione | Should | ✅ GA |
| CU-008 | Portale clienti self-service (prenotazioni, storico, fatture, tracking) | Should | ✅ GA |

## 8.8 Moduli Compliance

### GDPR
| ID | Requisito | Stato |
|----|----------|-------|
| GDPR-001 | Diritto di accesso: export dati cliente in JSON/CSV | ✅ GA |
| GDPR-002 | Diritto all'oblio: soft delete + purge a 30 giorni | ✅ GA |
| GDPR-003 | Diritto alla portabilita: export machine-readable | ✅ GA |
| GDPR-004 | Consent management con audit trail per ogni modifica | ✅ GA |
| GDPR-005 | Data retention automatica (7 anni fiscale, 1 anno inattivi) | ✅ GA |
| GDPR-006 | Cookie consent banner conforme ePrivacy | ✅ GA |

### RENTRI (Registro Elettronico Nazionale Tracciabilita Rifiuti)
| ID | Requisito | Stato |
|----|----------|-------|
| RENTRI-001 | Registrazione scarichi rifiuti con codici CER | ✅ GA |
| RENTRI-002 | Modulo FIR (Formulario Identificazione Rifiuti) | ✅ GA |
| RENTRI-003 | MUD (Modello Unico Dichiarazione) annuale | ✅ GA |
| RENTRI-004 | Gestione trasportatori e destinazioni autorizzate | ✅ GA |
| RENTRI-005 | Report per invio telematico RENTRI | ✅ GA |

### NIS2 (Direttiva Sicurezza Reti e Informazioni)
| ID | Requisito | Stato |
|----|----------|-------|
| NIS2-001 | Registro incidenti di sicurezza con classificazione | ✅ GA |
| NIS2-002 | Notifica obblighi entro 24h/72h | ✅ GA |
| NIS2-003 | Timeline attivita per ogni incidente | ✅ GA |
| NIS2-004 | Dashboard compliance per audit | ✅ GA |

### EU AI Act
| ID | Requisito | Stato |
|----|----------|-------|
| AI-001 | Logging decisioni AI (diagnostica, scheduling, predizioni) | ✅ GA |
| AI-002 | Tracciabilita input/output dei modelli | ✅ GA |
| AI-003 | Override umano tracciato per ogni decisione AI | ✅ GA |
| AI-004 | Report compliance per regolatori | ✅ GA |

---

# 9. Requisiti Non-Funzionali

## 9.1 Performance

| Requisito | Target | Razionale |
|----------|--------|-----------|
| API response time (p50) | < 50ms | UX fluida, percepita come "istantanea" |
| API response time (p95) | < 150ms | Nessun ritardo percepibile |
| API response time (p99) | < 500ms | Anche nei picchi, esperienza accettabile |
| Database query time (p95) | < 50ms | Indici ottimizzati, query Prisma |
| Time to First Byte (TTFB) | < 200ms | Edge deployment Vercel |
| First Contentful Paint (FCP) | < 1.5s | SSR + streaming |
| Time to Interactive (TTI) | < 3s | Code splitting + lazy loading |
| Voice AI response latency | < 2s | Conversazione naturale |

## 9.2 Scalabilita

| Dimensione | Target Y1 | Target Y3 | Limite Architetturale |
|-----------|----------|----------|---------------------|
| Tenants attivi | 500 | 2.000 | 10.000 (con sharding) |
| Utenti concorrenti | 1.500 | 6.000 | 30.000 |
| API requests/minuto | 10.000 | 50.000 | 200.000 |
| Prenotazioni/giorno (piattaforma) | 2.000 | 10.000 | 100.000 |
| Storage per tenant | 2 GB | 5 GB | 50 GB |
| Audit log entries/mese | 500K | 5M | Illimitato (archivio S3) |

## 9.3 Affidabilita

| Requisito | Target | Misura |
|----------|--------|--------|
| Uptime SLA | 99.95% | ~26 min downtime/anno |
| RTO (Recovery Time Objective) | < 15 min | Tempo per ripristino servizio |
| RPO (Recovery Point Objective) | < 5 min | Perdita dati massima accettabile |
| Backup frequency | Ogni 6 ore | RDS automated snapshots |
| Cross-region failover | < 30 min | AWS Multi-AZ |
| Zero data loss su transazioni completate | 100% | PostgreSQL ACID |

## 9.4 Sicurezza

| Requisito | Implementazione |
|----------|----------------|
| Autenticazione | JWT (15min expiry) + refresh token rotation (7 giorni) |
| MFA | TOTP (Google Authenticator) + WebAuthn/Passkey |
| Password hashing | Argon2id (memory: 64MB, iterations: 3) |
| Encryption at rest | AES-256-GCM per PII, RDS encryption per DB |
| Encryption in transit | TLS 1.3 obbligatorio |
| Rate limiting | Per-tenant throttling (configurable per tier) |
| Brute force protection | Lockout dopo 5 tentativi falliti, backoff esponenziale |
| Session management | Device tracking, logout remoto, max 5 sessioni attive |
| Webhook security | Firma HMAC-SHA256, replay protection |
| Tenant isolation | PostgreSQL RLS + `tenantId` su ogni query |
| Audit | Ogni mutazione loggata con userId, tenantId, timestamp, old/new value |
| Secrets management | ENV vars, zero hardcoded. JWT con `jti` per revocabilita |

## 9.5 Accessibilita

| Requisito | Target |
|----------|--------|
| WCAG | 2.1 Level AA |
| Touch target | Minimo 44x44px |
| Keyboard navigation | Completa su tutte le pagine |
| Screen reader | Aria labels su tutti i componenti interattivi |
| Color contrast | Ratio minimo 4.5:1 (testo), 3:1 (elementi grafici) |
| Dark mode | Supporto completo su ogni pagina |
| Responsive | Mobile-first, breakpoints: 640, 768, 1024, 1280px |

---

# 10. Architettura Tecnica

## 10.1 Stack Tecnologico

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│                                                             │
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │   Next.js 14 (SSR)   │  │     PWA Service Worker     │  │
│  │   React 18           │  │     Offline Cache           │  │
│  │   TailwindCSS        │  │     Push Notifications      │  │
│  │   Radix UI / Shadcn  │  │                            │  │
│  │   react-hook-form    │  │  ┌──────────────────────┐  │  │
│  │   Zod validation     │  │  │    Vapi Voice SDK    │  │  │
│  │   SWR data fetching  │  │  │    (telefonia AI)    │  │  │
│  │   Zustand state      │  │  └──────────────────────┘  │  │
│  │   Framer Motion      │  │                            │  │
│  └──────────┬───────────┘  └────────────┬───────────────┘  │
│             │ HTTPS/REST                │ WebSocket/SSE     │
└─────────────┼───────────────────────────┼───────────────────┘
              │                           │
┌─────────────┼───────────────────────────┼───────────────────┐
│             │       API GATEWAY         │                   │
│  ┌──────────▼───────────────────────────▼───────────────┐   │
│  │                  NestJS 10 (TypeScript)              │   │
│  │                                                      │   │
│  │  ┌────────────┐ ┌───────────┐ ┌──────────────────┐  │   │
│  │  │ Controllers│ │  Guards   │ │  Interceptors    │  │   │
│  │  │ (46 files) │ │ JWT Auth  │ │  Logging         │  │   │
│  │  │ DTO valid. │ │ RBAC      │ │  Transform       │  │   │
│  │  │ @ApiTags   │ │ Throttle  │ │  Tenant inject   │  │   │
│  │  └─────┬──────┘ └───────────┘ └──────────────────┘  │   │
│  │        │                                             │   │
│  │  ┌─────▼──────────────────────────────────────────┐  │   │
│  │  │              SERVICES (Business Logic)         │  │   │
│  │  │  60+ modules | Domain exceptions | Events      │  │   │
│  │  └─────┬──────────────────────────────────────────┘  │   │
│  │        │                                             │   │
│  │  ┌─────▼──────┐ ┌────────────┐ ┌─────────────────┐  │   │
│  │  │   Prisma   │ │  BullMQ    │ │  Event Emitter  │  │   │
│  │  │   5.22     │ │  (queues)  │ │  (domain events)│  │   │
│  │  └─────┬──────┘ └─────┬──────┘ └────────┬────────┘  │   │
│  └────────┼──────────────┼─────────────────┼────────────┘   │
└───────────┼──────────────┼─────────────────┼────────────────┘
            │              │                 │
┌───────────┼──────────────┼─────────────────┼────────────────┐
│           │    DATA LAYER│                 │                │
│  ┌────────▼────────┐ ┌───▼──────────┐ ┌───▼────────────┐   │
│  │  PostgreSQL 15  │ │   Redis 7    │ │     AWS S3     │   │
│  │  110 models     │ │   Sessions   │ │   Files/Photos │   │
│  │  275 indexes    │ │   Cache      │ │   Invoices PDF │   │
│  │  RLS policies   │ │   Pub/Sub    │ │   Exports      │   │
│  │  Multi-AZ       │ │   BullMQ     │ │   Backups      │   │
│  └─────────────────┘ └──────────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 10.2 Strategia Multi-Tenancy

```
┌──────────────────────────────────────────────────┐
│              SINGOLO DATABASE                     │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Tabella: work_orders                       │ │
│  │                                             │ │
│  │  ┌─────────┬───────────┬────────┬────────┐  │ │
│  │  │   id    │ tenant_id │ status │  ...   │  │ │
│  │  ├─────────┼───────────┼────────┼────────┤  │ │
│  │  │  wo-001 │  SHOP-A   │ open   │  ...   │  │ │
│  │  │  wo-002 │  SHOP-B   │ done   │  ...   │  │ │
│  │  │  wo-003 │  SHOP-A   │ wip    │  ...   │  │ │
│  │  └─────────┴───────────┴────────┴────────┘  │ │
│  │                                             │ │
│  │  RLS Policy:                                │ │
│  │  WHERE tenant_id = current_setting(         │ │
│  │    'app.current_tenant_id'                  │ │
│  │  )                                          │ │
│  │                                             │ │
│  │  Shop A vede: wo-001, wo-003               │ │
│  │  Shop B vede: wo-002                        │ │
│  │  Cross-tenant: IMPOSSIBILE                  │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Garanzie:**
- `tenantId` e colonna obbligatoria su OGNI tabella (enforced a livello Prisma)
- OGNI query Prisma include `where: { tenantId }` (enforced via middleware)
- RLS PostgreSQL come safety net aggiuntivo
- Test automatici di cross-tenant isolation

## 10.3 Pipeline CI/CD

```
Developer Push
      │
      ▼
┌─────────────────────┐
│  GitHub Actions      │
│                     │
│  1. npx tsc --noEmit│ ── Type check (0 errori ammessi)
│  2. npm run lint    │ ── ESLint strict
│  3. npx jest        │ ── 800+ unit test (99.8% coverage)
│  4. Security scan   │ ── npm audit, OWASP check
│  5. E2E tests       │ ── 212 test Playwright
│                     │
│  TUTTI verdi? ──────│──── NO → ❌ Block merge
│       │             │
│      YES            │
│       │             │
│  6. Build Docker    │
│  7. Push ECR        │
│  8. Deploy staging  │
│  9. Smoke tests     │
│  10. Deploy prod    │ ── Blue/Green deployment
└─────────────────────┘
```

---

# 11. Modello di Dati

## 11.1 Entity Relationship (Core)

```
┌──────────┐     1:N     ┌──────────┐     1:N     ┌──────────┐
│  Tenant  │────────────>│   User   │────────────>│ Session  │
│          │             │          │             │          │
│ id       │             │ id       │             │ id       │
│ name     │             │ tenantId │             │ userId   │
│ plan     │             │ role     │             │ device   │
│ settings │             │ email    │             │ ip       │
└────┬─────┘             └──────────┘             └──────────┘
     │
     │ 1:N
     ▼
┌──────────┐     1:N     ┌──────────┐     N:1     ┌──────────┐
│ Customer │────────────>│ Vehicle  │<────────────│  Booking │
│          │             │          │             │          │
│ id       │             │ id       │             │ id       │
│ tenantId │             │ tenantId │             │ tenantId │
│ name     │             │ vin      │             │ date     │
│ phone*   │             │ plate    │             │ status   │
│ email*   │             │ model    │             │ slot     │
└──────────┘             └────┬─────┘             └────┬─────┘
                              │                        │
                              │ 1:N                    │ 1:1
                              ▼                        ▼
                         ┌──────────┐           ┌───────────┐
                         │WorkOrder │           │  Invoice   │
                         │          │           │           │
                         │ id       │──────────>│ id        │
                         │ tenantId │   1:1     │ tenantId  │
                         │ status   │           │ total     │
                         │ mechanic │           │ status    │
                         └────┬─────┘           └───────────┘
                              │
                    ┌─────────┼──────────┐
                    │ 1:N     │ 1:N      │ 1:N
                    ▼         ▼          ▼
              ┌─────────┐ ┌────────┐ ┌───────────┐
              │WO Item  │ │TimeLog │ │Inspection │
              │         │ │        │ │           │
              │ partId  │ │ start  │ │ template  │
              │ laborHrs│ │ end    │ │ findings  │
              │ price   │ │ userId │ │ photos    │
              └─────────┘ └────────┘ └───────────┘

* = Encrypted (AES-256-GCM)
```

## 11.2 Scala del Modello

| Categoria | Modelli | Esempi |
|-----------|---------|--------|
| Core Business | 25 | Tenant, User, Customer, Vehicle, Booking, WorkOrder, Invoice, Estimate |
| Ispezioni/DVI | 8 | Inspection, InspectionTemplate, InspectionItem, InspectionFinding |
| Inventario | 7 | Part, InventoryItem, InventoryMovement, Supplier, PurchaseOrder |
| OBD/Diagnostica | 5 | ObdDevice, ObdReading, ObdTroubleCode, VehicleHealthHistory |
| Vehicle Twin | 4 | VehicleTwinConfig, VehicleTwinComponent, ComponentHistory |
| Sicurezza | 8 | AuthAuditLog, AuditLog, SecurityIncident, Session, Device, Passkey |
| Compliance | 6 | DataSubjectRequest, ConsentAuditLog, AiDecisionLog, WasteEntry |
| Notifiche/Comm | 5 | Notification, SmsThread, Campaign, ReviewRequest |
| Billing | 4 | Subscription, SubscriptionChange, PaymentLink |
| Altro | 38 | CannedJob, Location, Warranty, Fleet, Membership, Payroll... |
| **Totale** | **110** | |

---

# 12. Alternative Considerate — Formato Google

> *A Google, la sezione "Alternatives Considered" e obbligatoria. Il ragionamento dietro le scelte rifiutate e importante quanto la scelta stessa.* — Google Engineering Practices

## 12.1 Architettura Multi-Tenancy

| Alternativa | Pro | Contro | Decisione |
|------------|-----|--------|-----------|
| **A: Database per tenant** | Isolamento totale, facile backup per cliente | Costo O(N), migration nightmare, connection pool explosion | ❌ Rifiutata |
| **B: Schema per tenant** | Buon isolamento, migliore di A su costi | Migration complesse, 85K schema possibili, tooling Prisma limitato | ❌ Rifiutata |
| **✅ C: Shared DB + RLS** | Costo O(1), migration semplici, scala lineare | Rischio data leak se RLS mal configurato | ✅ Scelta |

**Razionale:** Con 500+ tenant target, il costo di un DB per tenant sarebbe insostenibile (~€7.500/mese solo per RDS). RLS + `tenantId` obbligatorio + test automatici di isolamento mitigano il rischio. Quarterly security audit come ulteriore garanzia.

## 12.2 Framework Backend

| Alternativa | Pro | Contro | Decisione |
|------------|-----|--------|-----------|
| **✅ NestJS** | DI maturo, modular, TypeScript-native, ecosystem ricco | Verboso, learning curve | ✅ Scelta |
| **Fastify raw** | Piu veloce, leggero | Zero struttura, DI manuale, meno ecosystem | ❌ Rifiutata |
| **Go (Gin/Echo)** | Performance superiore, deploy leggero | Team TypeScript, doppio linguaggio, meno produttivita | ❌ Rifiutata |
| **Python (FastAPI)** | AI/ML ecosystem, veloce da prototipare | Typing inferiore, deployment piu complesso, performance inferiore | ❌ Rifiutata |

**Razionale:** NestJS offre il miglior equilibrio tra struttura enterprise (DI, module system, guards, interceptors) e produttivita TypeScript full-stack. Il team ha expertise profonda su TypeScript.

## 12.3 ORM / Data Layer

| Alternativa | Pro | Contro | Decisione |
|------------|-----|--------|-----------|
| **✅ Prisma** | Type-safe, migration automatiche, schema dichiarativo | N+1 facile, limitazioni query complesse | ✅ Scelta |
| **TypeORM** | Piu maturo, decorator-based | Bug noti, manutenzione rallentata, typing inferiore | ❌ Rifiutata |
| **Drizzle** | Piu leggero, SQL-like | Giovane, meno documentazione, migration meno mature | ❌ Rifiutata |
| **Raw SQL** | Massima flessibilita | Zero type safety, injection risk, manutenzione incubo | ❌ Rifiutata |

## 12.4 Frontend Framework

| Alternativa | Pro | Contro | Decisione |
|------------|-----|--------|-----------|
| **✅ Next.js 14 (App Router)** | SSR, Edge, file-based routing, ecosystem React | Complessita hydration, RSC learning curve | ✅ Scelta |
| **Remix** | Loader pattern elegante, form handling nativo | Ecosystem piu piccolo, meno deployment options | ❌ Rifiutata |
| **SvelteKit** | Performance superiore, meno boilerplate | Ecosystem immaturo, meno developer disponibili | ❌ Rifiutata |
| **Vue/Nuxt** | Piu semplice da imparare | Ecosystem piu piccolo, TypeScript inferiore | ❌ Rifiutata |

## 12.5 Realtime Strategy

| Alternativa | Pro | Contro | Decisione |
|------------|-----|--------|-----------|
| **✅ SSE + Redis Pub/Sub** | Semplice, unidirezionale, scalabile, nativo HTTP | Solo server→client | ✅ Scelta (primary) |
| **WebSocket (Socket.io)** | Bidirezionale, bassa latenza | Complessita, stato da gestire, scaling difficile | ✅ Usato per chat |
| **GraphQL Subscriptions** | Type-safe, granulare | Complessita infrastrutturale, overkill per i nostri use case | ❌ Rifiutata |

---

# 13. Prioritizzazione MoSCoW

## Release Corrente (v10 — Q1 2026) ✅ SHIPPED

### Must Have (Completati)
- [x] Booking engine con advisory lock
- [x] Work order lifecycle completo
- [x] Fatturazione Art. 226 compliant
- [x] Customer 360 con PII encryption
- [x] RBAC (Admin, Manager, Mechanic, Receptionist, Viewer)
- [x] GDPR engine completo (export, deletion, consent)
- [x] RENTRI modulo rifiuti
- [x] Multi-tenant RLS
- [x] Dashboard analytics
- [x] Notifiche multi-canale (email, SMS, push)
- [x] Portale clienti self-service
- [x] DVI (ispezioni digitali)
- [x] Magazzino ricambi
- [x] NIS2 incident management
- [x] EU AI Act compliance logging

### Should Have (Completati)
- [x] Voice AI booking (Vapi)
- [x] OBD-II diagnostica
- [x] Production board (Kanban)
- [x] Preventivi con conversione
- [x] Marketing campaigns
- [x] Benchmarking
- [x] Canned jobs (template lavori)
- [x] Vehicle Twin
- [x] Payment links
- [x] Kiosk self-service

### Could Have (Completati)
- [x] AI diagnostica
- [x] Predictive maintenance
- [x] Payroll management
- [x] Membership/subscription per clienti
- [x] Declined service tracking
- [x] CEO dashboard
- [x] Anomaly detection

## Prossima Release (v11 — Q3 2026)

### Must Have
- [ ] WhatsApp Business integration (canale #1 in Italia)
- [ ] Fatturazione elettronica SDI integration
- [ ] Mobile native app (React Native)
- [ ] Advanced scheduling AI (ML-based slot optimization)

### Should Have
- [ ] Barcode/QR scanning per ricambi
- [ ] Integration con principale distributori ricambi italiani
- [ ] Workflow builder (automazioni custom no-code)
- [ ] Multi-lingua (tedesco per Alto Adige, francese per Valle d'Aosta)

### Could Have
- [ ] Video inspection (registrazione video durante ispezione)
- [ ] Customer self-check-in via QR code
- [ ] Fleet management avanzato (route optimization)

### Won't Have (v11)
- [ ] GraphQL API layer (complessita non giustificata)
- [ ] Self-hosting option (cloud-only strategy)
- [ ] White-label (premature scaling)
- [ ] Marketplace ricambi (non nel business model)

---

# 14. Piano di Lancio e Milestone

## 14.1 Timeline (18 Mesi)

```
2026
 Q1 (Jan-Mar)     Q2 (Apr-Jun)      Q3 (Jul-Sep)     Q4 (Oct-Dec)
  │                 │                  │                 │
  ▼                 ▼                  ▼                 ▼
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────────┐
│ v10 GA  │   │CRESCITA  │   │ v11 LAUNCH   │   │ SCALE        │
│         │   │          │   │              │   │              │
│✅ 70    │   │ Target:  │   │ WhatsApp     │   │ 500 clienti  │
│ clienti │   │ 200      │   │ SDI e-fatt.  │   │ Mobile app   │
│ 400+    │   │ clienti  │   │ ML scheduling│   │ NIS2 GA      │
│ endpt   │   │          │   │ React Native │   │ Enterprise   │
│ 99.8%   │   │ Onboard  │   │ Beta         │   │ features     │
│ coverage│   │ pipeline │   │              │   │              │
│         │   │ Content  │   │              │   │              │
│         │   │ marketing│   │              │   │              │
└─────────┘   └──────────┘   └──────────────┘   └──────────────┘

2027
 Q1 (Jan-Mar)     Q2 (Apr-Jun)
  │                 │
  ▼                 ▼
┌──────────────┐   ┌───────────────┐
│ ESPANSIONE   │   │ SERIES A?     │
│              │   │               │
│ 1.000 clienti│   │ 2.000 clienti │
│ EU expansion │   │ Multi-country │
│ Partner      │   │ Profitability │
│ program      │   │               │
└──────────────┘   └───────────────┘
```

## 14.2 Milestone Dettagliate

| Milestone | Data | Criteri di Completamento | Owner |
|-----------|------|-------------------------|-------|
| M1: v10 GA | ✅ Mar 2026 | 400+ endpoint, 99.8% coverage, 0.03% error rate | Eng |
| M2: 100 clienti paganti | Giu 2026 | 100 tenant attivi con pagamento ricorrente | Growth |
| M3: RENTRI compliance certificata | Giu 2026 | Validazione con 5 officine pilota + consulente ambientale | Compliance |
| M4: WhatsApp integration GA | Lug 2026 | WhatsApp Business API live, template messages, 2-way chat | Eng |
| M5: SDI fatturazione elettronica | Ago 2026 | Invio/ricezione fatture via SDI, validazione Agenzia Entrate | Eng |
| M6: v11 GA | Set 2026 | All Must-Have v11 completati, 0 P1 bugs | Eng |
| M7: Mobile app beta | Ott 2026 | React Native su TestFlight/Play Store beta | Mobile |
| M8: 500 clienti | Dic 2026 | 500 tenant attivi, MRR €52K | Growth |
| M9: NIS2 full compliance | Dic 2026 | Audit superato, documentazione completa | Security |
| M10: 1.000 clienti | Mar 2027 | Break-even operativo | Growth |

## 14.3 Criteri di Rollback

| Fase | Rollback Trigger | Azione |
|------|-----------------|--------|
| Feature flag rollout (10%) | Error rate > 1% OR p95 > 500ms | Disabilita flag, investigazione |
| Staging | Qualsiasi test E2E fallito | Block deploy, fix required |
| Production (canary) | Error rate > 0.5% per 5 minuti | Automatic rollback via blue/green |
| Post-deploy (24h) | Customer-reported data loss | Incident P0, restore da backup |

---

# 15. Modello di Business e Unit Economics

## 15.1 Pricing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    PRICING TIERS                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   STARTER   │  │     PRO      │  │    ENTERPRISE    │  │
│  │   €49/mese  │  │   €99/mese   │  │    €299/mese     │  │
│  │             │  │              │  │                  │  │
│  │ 1 utente    │  │ 3 utenti     │  │ Utenti illim.   │  │
│  │ 50 booking  │  │ 500 booking  │  │ Booking illim.  │  │
│  │ 100 min AI  │  │ 500 min AI   │  │ AI illimitata   │  │
│  │ Email supp. │  │ Chat support │  │ Phone + AM      │  │
│  │             │  │ +€25/meccan. │  │ API access      │  │
│  │             │  │              │  │ White-label      │  │
│  │             │  │              │  │ SLA 99.95%       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  Sconto annuale: 10% (2 mesi gratis)                       │
│  Trial gratuito: 14 giorni (no carta di credito)            │
└─────────────────────────────────────────────────────────────┘
```

## 15.2 Unit Economics

```
                    STARTER        PRO           ENTERPRISE
                    ────────       ────────      ────────────
ARPU mensile        €49            €99           €299
ARPU annuo          €529           €1.069        €3.229

Costo servizio
  Infra/tenant      €3             €5            €12
  Email (Resend)    €0.50          €2            €5
  SMS (Twilio)      €2             €8            €25
  Voice AI (Vapi)   €5             €15           €50
  Support           €3             €8            €30
  ──────────        ──────         ──────        ──────
  Totale COGS       €13.50         €38           €122

Gross Margin        €35.50 (72%)   €61 (62%)     €177 (59%)

CAC (stimato)       €75            €120          €500
LTV (24 mesi)       €852           €1.464        €4.248
LTV/CAC             11.4x          12.2x         8.5x
Payback (mesi)      2.1            2.0           2.8
```

## 15.3 Revenue Forecast

| Mese | Starter | Pro | Enterprise | Totale Clienti | MRR | ARR |
|------|---------|-----|-----------|----------------|-----|-----|
| Mar 2026 (oggi) | 40 | 25 | 5 | 70 | €5.930 | €71.160 |
| Giu 2026 | 80 | 60 | 10 | 150 | €11.860 | €142.320 |
| Set 2026 | 120 | 120 | 20 | 260 | €23.660 | €283.920 |
| Dic 2026 | 150 | 300 | 50 | 500 | €52.150 | €625.800 |
| Mar 2027 | 200 | 500 | 80 | 780 | €83.220 | €998.640 |
| Giu 2027 | 300 | 800 | 120 | 1.220 | €129.480 | €1.553.760 |

**Break-even operativo stimato:** Q4 2026 (~€40K MRR)

## 15.4 Monetizzazione Futura

| Stream | Tipo | Timeline | Revenue Potenziale |
|--------|------|---------|-------------------|
| Overage Voice AI | Usage-based | ✅ Attivo | €0.12-0.15/min |
| Overage SMS | Usage-based | ✅ Attivo | €0.05-0.08/SMS |
| Meccanici aggiuntivi (Pro) | Per-seat | ✅ Attivo | €25/mese/meccanico |
| Onboarding guidato | One-time | Q2 2026 | €99-€1.499 |
| Marketplace integrazioni | Revenue share | Q1 2027 | 20% rev share |
| Data insights (anonimizzati) | B2B data | Q2 2027 | TBD |
| White-label licensing | Enterprise | Q3 2027 | €999+/mese |

---

# 16. Rischi e Pre-Mortem — Formato Stripe

> *"Siamo a Dicembre 2026. MechMind OS ha fallito. Le 3 ragioni piu probabili sono..."*
> — Esercizio Pre-Mortem (formato Stripe/Amazon)

## Scenario di Fallimento #1: Il Mercato Non Adotta

| Aspetto | Dettaglio |
|---------|----------|
| **Probabilita** | Media (30%) |
| **Impatto** | Critico |
| **Descrizione** | I titolari di officina sono resistenti al cambiamento. "Ho sempre fatto cosi" vince su "il software ti fa risparmiare". La curva di adozione e piu lenta del previsto. |
| **Segnali di allarme** | Conversion rate trial→paid < 15%, churn > 8%, NPS < 30 |
| **Mitigazione** | (1) Freemium tier per ridurre la barriera d'ingresso. (2) Partnership con associazioni di categoria (CNA, Confartigianato). (3) Referral program aggressivo (€100 per ogni cliente portato). (4) Case study video con officine reali. (5) Demo dal vivo in fiere di settore (Autopromotec). |
| **Piano B** | Pivot verso fleet management B2B (clienti piu tech-savvy, deal size maggiore). |

## Scenario di Fallimento #2: Incidente di Sicurezza / Data Breach

| Aspetto | Dettaglio |
|---------|----------|
| **Probabilita** | Bassa (10%) |
| **Impatto** | Catastrofico |
| **Descrizione** | Un bug in RLS espone dati di un tenant a un altro. Il Garante Privacy interviene. Multa + perdita reputazionale. |
| **Segnali di allarme** | Qualsiasi query senza `tenantId`, test di isolation che fallisce, audit log con accesso cross-tenant |
| **Mitigazione** | (1) Test automatici di cross-tenant isolation su OGNI PR. (2) Quarterly penetration test. (3) Bug bounty program. (4) Encryption PII come seconda linea di difesa. (5) Incident response plan documentato e testato. (6) Assicurazione cyber. |
| **Piano B** | Notifica immediata (72h GDPR), comunicazione trasparente, remediation completa, offerta di credit monitoring ai clienti impattati. |

## Scenario di Fallimento #3: Competitor con Funding Entra nel Mercato

| Aspetto | Dettaglio |
|---------|----------|
| **Probabilita** | Media-Alta (40%) |
| **Impatto** | Alto |
| **Descrizione** | Un competitor US (Mitchell, Shop-Ware) o un nuovo player EU con Series A (€5M+) entra nel mercato italiano con pricing aggressivo e team marketing 10x. |
| **Segnali di allarme** | Competitor lancia versione italiana, pricing undercut, nostri clienti ricevono outreach |
| **Mitigazione** | (1) **Lock-in positivo:** piu dati nel sistema = piu valore = switching cost alto. (2) **Compliance moat:** RENTRI, NIS2, Art.226 — un player US deve riscrivere tutto per l'Italia. (3) **Community:** costruire community di officine che si aiutano tra loro. (4) **Velocita:** 18 mesi di first-mover advantage. (5) **Verticale:** sappiamo cose dell'officina italiana che un team a San Francisco non sa. |
| **Piano B** | Accelerare crescita con possibile raise. Oppure posizionarsi per acquisizione (acqui-hire). |

## Scenario di Fallimento #4: Debito Tecnico / Scaling Issues

| Aspetto | Dettaglio |
|---------|----------|
| **Probabilita** | Media (25%) |
| **Impatto** | Alto |
| **Descrizione** | Il monolito NestJS non scala oltre 500 tenant. Le query Prisma diventano lente. Il PgBouncer non regge. Redis diventa il collo di bottiglia. |
| **Segnali di allarme** | p95 > 300ms, DB CPU > 70%, connection pool exhaustion, BullMQ queue backlog > 1000 |
| **Mitigazione** | (1) Read replica per query analytics (gia predisposta). (2) Connection pooling con PgBouncer. (3) Caching aggressivo su Redis per hot paths. (4) Indici ottimizzati (275 gia in place). (5) Monitoring Datadog con alert automatici. (6) Load testing periodico. |
| **Piano B** | Decomposizione in microservizi dei moduli piu critici (booking, invoicing). Timeline: 3-6 mesi. |

## Scenario di Fallimento #5: Key Person Risk

| Aspetto | Dettaglio |
|---------|----------|
| **Probabilita** | Alta (50%) |
| **Impatto** | Critico |
| **Descrizione** | Giovanni (CEO/CTO/unico developer) si ammala, si stanca, o vuole fare altro. Il progetto muore. |
| **Segnali di allarme** | Burnout, commit frequency in calo, bug in aumento, risposte ai clienti lente |
| **Mitigazione** | (1) Documentazione completa (12 doc tecnici gia scritti). (2) CLAUDE.md come "cervello" del progetto (AI puo continuare lo sviluppo). (3) Assumere primo developer a MRR €15K. (4) Automatizzazione massima (CI/CD, monitoring, alerting). (5) Codebase TypeScript strict = leggibile da chiunque. |
| **Piano B** | Vendita del prodotto + base clienti a player piu grande. ARR €600K+ rende l'asset vendibile. |

---

# 17. Ipotesi e Criteri di Successo — Formato Meta

> *A Meta, ogni prodotto lancia come esperimento. Il PRD definisce cosa significa "successo" PRIMA che l'esperimento parta.* — Meta Product Team

## 17.1 Ipotesi Fondamentali

### H1: Problem-Solution Fit

> **Crediamo che** fornire un sistema gestionale cloud unico per l'officina meccanica
> **risultera in** una riduzione del 50%+ del tempo amministrativo
> **per** i titolari di officine con 2-10 meccanici in Italia.

**Metrica primaria:** Tempo medio admin/settimana (self-reported survey)
**Target:** Da 12h a < 6h entro 3 mesi dall'adozione
**Metrica guardrail:** NPS non deve scendere sotto 40
**Validazione:** Survey a 30 e 90 giorni post-onboarding

### H2: Conversion Hypothesis

> **Crediamo che** un trial gratuito di 14 giorni con onboarding guidato
> **risultera in** un tasso di conversione trial→paid > 20%
> **per** officine che completano almeno 5 prenotazioni durante il trial.

**Metrica primaria:** Trial-to-paid conversion rate
**Target:** > 20% (benchmark SaaS verticale: 15-25%)
**Leading indicator:** 5+ prenotazioni in 14 giorni = "attivazione"
**Ship criteria:** Se conversion > 15% con confidence 95%, ship. Se < 10%, pivot onboarding.

### H3: Retention Hypothesis

> **Crediamo che** il lock-in positivo dei dati (storico clienti, veicoli, lavori)
> **risultera in** un churn mensile < 3%
> **per** clienti attivi da piu di 3 mesi.

**Metrica primaria:** Monthly churn rate (cohort a 3+ mesi)
**Target:** < 3% (benchmark SaaS SMB: 3-7%)
**Guardrail:** Revenue churn (net) < 2% (upsell compensa downgrades)
**Ship criteria:** Se churn > 5% a 6 mesi, investigare e risolvere top 3 motivi di abbandono.

### H4: Voice AI Hypothesis

> **Crediamo che** un assistente vocale AI che risponde al telefono
> **risultera in** un incremento del 30%+ delle prenotazioni
> **per** officine che ricevono > 20 chiamate/giorno.

**Metrica primaria:** Prenotazioni/settimana (pre vs post Voice AI)
**Target:** +30% (da 15 a 20 prenotazioni/settimana)
**Guardrail:** Customer satisfaction con Voice AI > 3.5/5
**Ship criteria:** Se incremento > 15% con p-value < 0.05, promuovi a feature standard.

### H5: Compliance-Driven Acquisition

> **Crediamo che** la deadline RENTRI Q2 2026
> **risultera in** un'accelerazione dell'acquisizione di 3x
> **per** officine nella fase Q1-Q2 2026.

**Metrica primaria:** Sign-up rate (Mar-Jun 2026 vs media precedente)
**Target:** 3x accelerazione (da 15 a 45 sign-up/mese)
**Leading indicator:** Traffic su pagine RENTRI/compliance del sito web
**Ship criteria:** Se < 2x, la compliance non e driver sufficiente — focalizzare messaging su produttivita/ROI.

---

# 18. Domande Aperte

| # | Domanda | Owner | Deadline | Stato | Risoluzione |
|---|---------|-------|----------|-------|-------------|
| Q1 | Partnership con CNA/Confartigianato: termini economici? | Giovanni | Apr 2026 | 🔴 Open | — |
| Q2 | SDI integration: build vs. buy (Aruba, Fattura24 API)? | Giovanni | Mag 2026 | 🟡 In analisi | Valutando Aruba SMART SDK |
| Q3 | React Native vs. Capacitor per mobile app? | Giovanni | Giu 2026 | 🔴 Open | — |
| Q4 | Primo developer: full-stack senior o specialista backend? | Giovanni | MRR €15K | 🔴 Open | — |
| Q5 | Pricing: €49 starter e troppo alto per micro-officine (1 persona)? | Giovanni | Mag 2026 | 🟡 Testing | A/B test con €29 tier in corso |
| Q6 | WhatsApp Business API: costo per conversazione sostenibile? | Giovanni | Apr 2026 | 🔴 Open | — |
| Q7 | Bug bounty program: HackerOne vs. programma interno? | Giovanni | Q3 2026 | 🔴 Open | — |
| Q8 | Kubernetes migration: necessaria prima di 1.000 clienti? | Giovanni | Q4 2026 | 🟡 In analisi | ECS Fargate sufficiente fino a ~2K |
| Q9 | Assicurazione cyber: provider e copertura? | Giovanni | Mag 2026 | 🔴 Open | — |
| Q10 | Certificazione ISO 27001: necessaria per enterprise? | Giovanni | Q3 2026 | 🔴 Open | — |

---

# 19. FAQ — Clienti

> *Formato Amazon PR/FAQ: domande che un cliente reale farebbe.*

**D: Quanto tempo ci vuole per essere operativi?**
R: 15 minuti per la configurazione base. Importi i clienti da CSV, configuri i servizi, e sei pronto. L'onboarding guidato ti accompagna passo passo. Nessuna installazione, nessun hardware.

**D: Funziona senza internet?**
R: MechMind OS e una PWA (Progressive Web App). Le funzionalita critiche (consultazione OdL, lista appuntamenti) funzionano offline. Quando torni online, tutto si sincronizza automaticamente.

**D: Posso importare i dati dal mio gestionale attuale?**
R: Si. Supportiamo import da CSV per clienti, veicoli e servizi. Per gestionali specifici (es. Atelio, Infomotori), offriamo migrazione assistita nel piano di onboarding.

**D: I miei dati sono al sicuro?**
R: I dati sono criptati in transito (TLS 1.3) e a riposo (AES-256). I dati personali (telefoni, email) hanno un ulteriore livello di crittografia. Server in EU, backup ogni 6 ore, conformita GDPR certificata.

**D: Cosa succede se cancello l'abbonamento?**
R: I tuoi dati rimangono disponibili per 90 giorni dopo la cancellazione. Puoi esportare tutto in qualsiasi momento (clienti, fatture, storico). Dopo 90 giorni, i dati vengono eliminati definitivamente.

**D: Posso provarlo gratis?**
R: Si, 14 giorni di prova gratuita senza carta di credito. Hai accesso a tutte le funzionalita del piano Pro.

**D: Serve un tablet specifico?**
R: No. MechMind OS funziona su qualsiasi browser moderno: Chrome, Safari, Firefox, Edge. Su tablet, smartphone, e PC. Nessun software da installare.

**D: L'assistente vocale AI capisce l'italiano?**
R: Si, fluentemente. Il nostro assistente vocale (powered by Vapi AI) comprende italiano standard e dialetti principali. Puo prendere appuntamenti, rispondere a domande sugli orari, e trasferire la chiamata a un operatore se necessario.

**D: Quanto costa davvero? Ci sono costi nascosti?**
R: Il prezzo e quello che vedi: €49, €99, o €299/mese. Le uniche spese aggiuntive possibili sono per SMS e minuti Voice AI oltre i limiti del tuo piano, e sono trasparenti nel pannello billing.

**D: E conforme al RENTRI?**
R: Si, completamente. Il modulo RENTRI gestisce registri di carico/scarico, FIR, MUD, e la generazione dei report per l'invio telematico. Ti avvisa automaticamente delle scadenze.

---

# 20. FAQ — Stakeholder Interni

> *Formato Amazon PR/FAQ: domande che il board/investitori farebbero.*

**D: Qual e il TAM (Total Addressable Market)?**
R: ~85.000 officine meccaniche in Italia. Con ARPU medio di €99/mese, il TAM italiano e ~€101M ARR. Espandendo all'EU (500K+ officine), il TAM europeo supera €500M ARR.

**D: Perche un'officina dovrebbe pagare €49-299/mese per un software?**
R: Il costo dell'inazione e €52.940/anno (overbooking, tempo admin, sanzioni compliance, clienti persi). MechMind costa €588-3.588/anno. ROI minimo di 15:1. In piu, la compliance RENTRI/NIS2 rende il software quasi obbligatorio entro fine 2026.

**D: Qual e il moat competitivo?**
R: Triplice: (1) **Compliance EU integrata** — GDPR, RENTRI, NIS2, AI Act sono built-in, non bolt-on. Un competitor US deve riscrivere tutto. (2) **Dati accumulati** — piu l'officina usa MechMind, piu i dati diventano preziosi (storico, predizioni, benchmark). Switching cost cresce nel tempo. (3) **Verticale puro** — sappiamo cosa serve a un'officina italiana meglio di qualsiasi soluzione generica.

**D: Come si scala con un solo developer?**
R: (1) TypeScript strict + AI-assisted development (Claude Code) = produttivita 5x. (2) 99.8% test coverage = posso fare refactor aggressivi senza paura. (3) Automazione massima: CI/CD, monitoring, alerting, onboarding guidato. (4) Primo hire a MRR €15K. (5) La codebase e documentata per essere comprensibile da qualsiasi developer TypeScript.

**D: Quali sono i margini?**
R: Gross margin medio 65-72%. L'infrastruttura costa ~€160/mese indipendentemente dal numero di clienti (fino a ~500). Dopo, scala sub-linearmente. A 500 clienti con MRR €52K, l'infra costa ~€800/mese (1.5% del revenue).

**D: Serve un round di finanziamento?**
R: No, per raggiungere il break-even. Si, per accelerare (marketing, team, EU expansion). Target: profittabilita a MRR €40K (~Q4 2026), poi valutare seed/Series A per growth da €500K-1M per accelerare a 2.000+ clienti entro 2027.

**D: Qual e il rischio piu grande?**
R: Key person risk. Un solo developer = single point of failure. Mitigato da: documentazione completa, codebase strict-typed, CI/CD automatico, e AI-assisted development. Ma il primo hire e la priorita #1 dopo break-even.

**D: Come acquisite clienti?**
R: (1) SEO + content marketing (blog su compliance RENTRI/NIS2, guide per officine). (2) Partnership con associazioni di categoria (CNA, Confartigianato). (3) Referral program (€100/cliente). (4) Presenza a fiere (Autopromotec Bologna). (5) Google Ads su keyword "gestionale officina". (6) Passaparola (il canale #1 per le PMI italiane).

**D: Exit strategy?**
R: Tre opzioni: (1) **Crescita indipendente** — profittabile a 500+ clienti, crescita organica. (2) **Acquisizione** — player come Solera, Mitchell, CDK Global cercano attivamente SaaS verticali EU. ARR €1M+ rende l'asset attraente. (3) **PE roll-up** — il settore automotive aftermarket e target di private equity per consolidamento.

---

# 21. Appendice

## A. Analisi Competitiva

| Competitor | Mercato | Cloud | Compliance EU | Voice AI | Pricing | Valutazione |
|-----------|---------|-------|--------------|----------|---------|-------------|
| **MechMind OS** | Italia | ✅ | ✅ Nativo | ✅ | €49-299/mo | ⭐⭐⭐⭐⭐ |
| Mitchell 1 | US/Global | ✅ | ❌ | ❌ | $150-300/mo | ⭐⭐⭐⭐ |
| Shop-Ware | US | ✅ | ❌ | ❌ | $200+/mo | ⭐⭐⭐⭐ |
| Tekmetric | US | ✅ | ❌ | ❌ | $199-399/mo | ⭐⭐⭐⭐ |
| AutoFluent | US | Parziale | ❌ | ❌ | $100-200/mo | ⭐⭐⭐ |
| Atelio Pro | Italia | Parziale | Parziale | ❌ | €80-150/mo | ⭐⭐⭐ |
| Infomotori | Italia | ❌ (on-prem) | Parziale | ❌ | €50-100/mo | ⭐⭐ |
| WinCar | Italia | ❌ (on-prem) | ❌ | ❌ | €30-60/mo | ⭐⭐ |

**Posizionamento MechMind:**
```
                    ALTO
                     │
                     │              ⭐ MechMind OS
    COMPLIANCE EU    │
                     │                      Mitchell
                     │
                     │   Atelio Pro             Shop-Ware
                     │
                     │   WinCar    Infomotori
                    BASSO──────────────────────────────── ALTO
                              INNOVAZIONE TECH
```

## B. Glossario

| Termine | Definizione |
|---------|-----------|
| **OdL** | Ordine di Lavoro (Work Order) |
| **DVI** | Digital Vehicle Inspection — ispezione digitale del veicolo |
| **RLS** | Row-Level Security — isolamento dati a livello di riga PostgreSQL |
| **RENTRI** | Registro Elettronico Nazionale Tracciabilita Rifiuti |
| **NIS2** | Network and Information Security Directive 2 (EU 2022/2555) |
| **SDI** | Sistema di Interscambio — piattaforma italiana per fatturazione elettronica |
| **CER** | Catalogo Europeo dei Rifiuti — codici classificazione rifiuti |
| **FIR** | Formulario di Identificazione dei Rifiuti |
| **MUD** | Modello Unico di Dichiarazione ambientale |
| **ARPU** | Average Revenue Per User |
| **MRR** | Monthly Recurring Revenue |
| **ARR** | Annual Recurring Revenue |
| **LTV** | Lifetime Value — valore totale del cliente nel tempo |
| **CAC** | Customer Acquisition Cost — costo di acquisizione cliente |
| **NPS** | Net Promoter Score — indice di soddisfazione/raccomandazione |
| **WAU/MAU** | Weekly/Monthly Active Users — utenti attivi settimanali/mensili |

## C. Documenti Correlati

| Documento | Path | Contenuto |
|-----------|------|----------|
| Executive Architecture | `docs/EXECUTIVE_ARCHITECTURE.md` | Architettura sistema completa |
| Technical Specifications | `docs/TECHNICAL_SPECIFICATIONS.md` | Stack tecnico dettagliato |
| Compliance Framework | `docs/architecture/compliance.md` | GDPR, CCPA, SOC 2, PCI DSS |
| Pricing Model | `docs/business/pricing-model.md` | Modello di revenue dettagliato |
| API Reference | `docs/api/` | Documentazione API OpenAPI 3.0 |
| Engineering Guidelines | `CLAUDE.md` | Standard di sviluppo |
| Data Model | `backend/prisma/schema.prisma` | 110 modelli Prisma |

---

> *"Non si tratta di costruire software. Si tratta di dare alle officine italiane il superpotere di competere nell'era digitale — senza perdere l'anima artigiana che le rende uniche."*
>
> — MechMind OS Vision Statement

---

**Documento redatto secondo le best practice PRD di:** Amazon (PR/FAQ, Working Backwards), Google (Alternatives Considered, Design Doc), Meta (Hypothesis-Driven, Experiment Plan), Stripe (Pre-Mortem, Edge Cases), Shreyas Doshi (Non-Goals, LNO Framework), Lenny Rachitsky (Appetite, Write for the Late Joiner).

**Ultimo aggiornamento:** 31 Marzo 2026 | **Prossima revisione:** 30 Giugno 2026
