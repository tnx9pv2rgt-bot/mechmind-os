# Data Retention Policy — Nexo Gestionale

**Versione:** 1.0 | **Data:** 2026-05-12 | **Riferimento:** GDPR Art. 5(1)(e),
DL 627/2020

---

## Categorie di dati e periodi di retention

| Categoria                         | Periodo                        | Base normativa                     |
| --------------------------------- | ------------------------------ | ---------------------------------- |
| Log di audit (accessi, modifiche) | **365 giorni**                 | GDPR + SOC2 osservation period     |
| Backup database                   | **365 giorni**                 | GDPR Art. 5(1)(e) — accountability |
| Fatture e documenti fiscali       | **10 anni**                    | DPR 633/72 Art. 39 (IVA)           |
| Dati clienti attivi               | Durata contratto + 2 anni      | GDPR Art. 6(1)(b)                  |
| Dati clienti inattivi             | 2 anni dall'ultima interazione | Legittimo interesse                |
| Log di sicurezza (auth, breach)   | **12 mesi**                    | NIS2 Art. 21                       |
| Sessioni JWT (refresh token)      | 30 giorni                      | Minimizzazione dati                |
| Dati RENTRI (rifiuti)             | **3 anni**                     | D.Lgs. 116/2020 Art. 18            |

---

## Backup

- Frequenza: **giornaliero** (automatico)
- Retention: **365 giorni**
- Storage: Supabase (EU region, Frankfurt)
- Encryption: AES-256 at rest
- Test ripristino: trimestrale

---

## Eliminazione sicura

Al termine del contratto:

1. Export dati su richiesta (30 giorni)
2. Eliminazione logica (soft delete) immediata
3. Eliminazione fisica dati entro 90 giorni
4. Certificato di cancellazione su richiesta

_Vedi DPA.md Art. 8 per procedura completa_
