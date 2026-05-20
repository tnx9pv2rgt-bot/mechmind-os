# Service Level Agreement (SLA) — Nexo Gestionale

**Versione:** 1.0  
**Data entrata in vigore:** 2026-05-03  
**Fornitore:** Nexo Gestionale S.r.l.  
**Applicabile a:** Tutti i piani a pagamento (Starter, Professional, Enterprise)

---

## 1. Uptime Garantito

Il Fornitore garantisce una disponibilità del servizio pari al **99.9%** su base mensile, corrispondente a un massimo di **43.8 minuti di inattività non pianificata al mese** (8.7 ore/anno).

### Misurazione

- Strumento: monitoraggio indipendente tramite UptimeRobot o Better Uptime
- Endpoint monitorato: `https://api.nexo-gestionale.com/health`
- Intervallo di campionamento: 1 minuto
- Calcolo: `Uptime% = (minuti_totali - minuti_downtime) / minuti_totali × 100`

### Definizione di Downtime

Il "downtime" è il periodo in cui il servizio non risponde con HTTP 2xx sull'endpoint `/health` per più di 2 campionamenti consecutivi (2 minuti), **escludendo** le finestre di manutenzione programmata.

---

## 2. Livelli di Severità e Tempi di Risposta

| Livello | Definizione | Tempo di risposta | MTTR target |
|---------|-------------|-------------------|-------------|
| **P0** | Sistema completamente non disponibile — tutti i tenant irraggiungibili | **15 minuti** | **1 ora** |
| **P1** | Funzione core rotta: prenotazioni, fatture, autenticazione, pagamenti | **30 minuti** | **4 ore** |
| **P2** | Degradazione parziale: latenza >2s p95, funzione secondaria non disponibile | **2 ore** | **24 ore** |

I tempi di risposta si applicano 24/7/365 per P0 e P1; orario lavorativo (09:00–18:00 CET, lunedì–venerdì) per P2.

---

## 3. Penali (Service Credit)

In caso di mancato rispetto dell'uptime garantito, il Cliente ha diritto a un credito sul canone mensile:

| Uptime effettivo | Credito mensile |
|------------------|-----------------|
| 99.0% – 99.89%   | 5% del canone mensile |
| 98.0% – 98.99%   | 10% del canone mensile |
| 95.0% – 97.99%   | 20% del canone mensile |
| < 95.0%          | 30% del canone mensile |

**Per ogni 0.1% aggiuntivo sotto il 99.9%: credito aggiuntivo del 5%.**

### Procedura di richiesta

Il Cliente deve richiedere il credito entro **30 giorni** dall'evento tramite email a `support@nexo-gestionale.com`, allegando la data/ora e la durata del disservizio. I crediti vengono applicati alla fattura del mese successivo.

---

## 4. Supporto

| Canale | Disponibilità | Tempo di risposta |
|--------|--------------|-------------------|
| Email (`support@nexo-gestionale.com`) | Lun–Ven 09:00–18:00 CET | Entro **4 ore** lavorative |
| Telefono dedicato (P0/P1) | 24/7 | Immediato (messaggio di emergenza) |
| Portale ticket | 24/7 (apertura) | Secondo SLA livello |
| Statuspage pubblica | `https://status.nexo-gestionale.com` | Aggiornato ogni 15 min durante incidenti |

---

## 5. Escalation Path

```
1. Email support@nexo-gestionale.com
      ↓ (nessuna risposta entro 15 min per P0, 30 min per P1)
2. Telefonata al numero di emergenza (comunicato in fase di onboarding)
      ↓ (nessuna risposta entro 30 min — solo P0)
3. Escalation al CEO con notifica diretta
```

L'escalation automatica è gestita tramite Sentry Alert → email on-call → PagerDuty.

---

## 6. Manutenzione Programmata

Le finestre di manutenzione programmata sono **escluse** dal calcolo del downtime, a condizione che:

- La manutenzione sia annunciata con **almeno 48 ore di anticipo** via email e statuspage
- La durata non superi **4 ore per finestra**
- Siano limitate a un massimo di **2 finestre al mese**
- Vengano eseguite preferibilmente in orario notturno (02:00–06:00 CET)

---

## 7. Esclusioni

Il Fornitore non è responsabile per inattività causata da:

- **Forza maggiore**: eventi naturali, guerra, pandemie, guasti infrastrutturali di terze parti (AWS, Cloudflare) non imputabili al Fornitore
- **Azioni del Cliente**: configurazioni errate, abuso delle API, superamento dei rate limit
- **Reti esterne**: connettività internet del Cliente, DNS del Cliente
- **Attacchi DDoS**: durante attacchi attivi di scala superiore alla capacità di mitigazione standard
- **Versioni software deprecate**: moduli disattivati con preavviso di 90 giorni

---

## 8. Diritti di Portabilità e Exit (EU Data Act)

In conformità all'EU Data Act (applicabile dal 12 settembre 2025):

- Il Cliente ha diritto di esportare **tutti i propri dati** in formato machine-readable (JSON/CSV/ZIP) tramite `GET /v1/gdpr/export-full` o la UI self-service in `/dashboard/settings/portability`
- Il preavviso minimo di recesso è **2 mesi**
- Il Fornitore fornisce **assistenza alla migrazione** per 30 giorni successivi alla cessazione del contratto
- I dati sono cancellati entro **90 giorni** dalla cessazione, salvo obblighi legali

---

## 9. Misura e Reporting

- **Statuspage pubblica**: disponibile in tempo reale su `https://status.nexo-gestionale.com`
- **Report mensile SLA**: inviato via email entro il 5 del mese successivo, contenente uptime effettivo, incidenti, cause e crediti maturati
- **Dati di monitoraggio**: conservati per 12 mesi e disponibili su richiesta

---

## 10. Modifica del SLA

Il Fornitore può modificare questo SLA con **30 giorni di preavviso** scritto. Se il Cliente non accetta le modifiche, può recedere dal contratto entro il periodo di preavviso senza penali.

---

## 11. Limitazione di Responsabilità

I crediti SLA costituiscono il rimedio esclusivo per mancato rispetto degli uptime. La responsabilità complessiva del Fornitore per violazioni SLA è limitata al **canone mensile del mese in cui si è verificata la violazione**.

---

*Documento legale soggetto a revisione da parte di consulente legale prima della firma con clienti enterprise.*  
*Riferimento normativo: EU Data Act 2025, GDPR Art. 28, DORA 2025.*
