# Post-Mortem: [TITOLO INCIDENTE]

**Data incidente:** YYYY-MM-DD
**Durata:** HH:MM - HH:MM (X minuti)
**Severity:** CRITICAL / WARNING
**Alert:** [nome dell'alert che ha triggerato]
**Autore:** [nome]
**Revisore:** [nome]

---

## Impatto

- **Clienti affetti:** X officine / X% del traffico
- **Funzionalita' impattate:** [lista]
- **Revenue perso:** EUR X (se calcolabile)
- **SLO impattato:** [metrica] — budget rimanente: X min/mese

## Timeline

| Ora | Evento |
|-----|--------|
| HH:MM | Primo segnale (alert firing / segnalazione cliente) |
| HH:MM | Incidente rilevato da [chi] |
| HH:MM | Prima diagnosi: [causa sospettata] |
| HH:MM | Fix applicato: [descrizione] |
| HH:MM | Verifica: [come confermato che funziona] |
| HH:MM | Incidente risolto |
| HH:MM | Comunicazione ai clienti (se applicabile) |

## Root Cause

[Causa vera dell'incidente — NON il sintomo. Esempio: "Il pool di connessioni Prisma era limitato a 2 in produzione, causando timeout quando il traffico ha superato 50 req/sec" e NON "Il server era lento".]

## Cosa ha funzionato bene

- [Es: L'alert ha triggerato entro 2 minuti]
- [Es: Il runbook ha guidato la diagnosi corretta]
- [Es: Il rollback ha risolto in 3 minuti]

## Cosa non ha funzionato

- [Es: Il runbook non includeva il check per la migration]
- [Es: Non c'era un canale di comunicazione per avvisare i clienti]
- [Es: Il monitoring non tracciava le connessioni DB attive]

## Azioni correttive

| Azione | Owner | Deadline | Status |
|--------|-------|----------|--------|
| [Es: Aumentare pool_limit a 10] | [nome] | YYYY-MM-DD | TODO |
| [Es: Aggiungere alert per connessioni DB] | [nome] | YYYY-MM-DD | TODO |
| [Es: Aggiornare runbook con nuovo check] | [nome] | YYYY-MM-DD | TODO |

## Lezioni apprese

1. [Lezione principale]
2. [Lezione secondaria]

---

*Questo post-mortem e' blameless. L'obiettivo e' migliorare il sistema, non trovare colpevoli.*
