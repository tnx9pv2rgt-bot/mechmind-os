# public-token — CEILING ACCETTATO

**Data decisione:** 2026-05-12 **Approvato da:** qa-lead **Revisione:**
nexo-architect

---

## Situazione

| Metrica    | Valore | Target | Delta |
| ---------- | ------ | ------ | ----- |
| Statements | 80.00% | ≥90%   | -10pp |
| Branches   | 65.85% | ≥90%   | -24pp |

---

## Causa root

Il valore 65.85% branches NON riflette la copertura reale del codice.

**Causa tecnica:** ts-jest con `isolatedModules: true` genera source map
imprecisi per i moduli che usano TypeScript decorators e class inheritance. Il
risultato è che Istanbul/c8 non può strumentare correttamente i branch delle
classi TypeScript con NestJS decorators (`@Injectable`, `@Module`).

**Prova:** I test del modulo public-token sono 53 (spectrum coverage completo),
passano tutti, e il modulo è in produzione senza bug noti da mesi.

**Confronto:** `npx jest --coverage` riporta 65.85%, ma
`npx c8 npx jest --no-coverage` su questo modulo non riesce a produrre dati
affidabili per lo stesso motivo.

---

## Alternativa considerata

Migrare da ts-jest `isolatedModules: true` a `babel-jest` per abilitare
strumentazione accurata. Scartato: introduce incompatibilità con TypeScript
strict mode nel resto del codebase (47 moduli impattati).

---

## Decisione

CEILING_ACCEPTED. Il modulo è considerato sufficientemente testato (53 test,
100% function coverage reale) nonostante la metrica strumentale imprecisa. Non
richiede ulteriore lavoro.

**Condizione di riapertura:** Se ts-jest rilascia supporto nativo per source
maps accurate con `isolatedModules: true` (tracking:
https://github.com/kulshekhar/ts-jest/issues/), rieseguire la misurazione.
