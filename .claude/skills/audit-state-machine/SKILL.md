---
name: audit-state-machine
description: "FMEA audit delle state machine booking/work-order/invoice. Verifica transizioni illegali, race condition, advisory lock, compensazioni. Analisi NASA-level con tabella Severity×Probability."
user-invocable: true
disable-model-invocation: false
effort: high
context: fork
allowed-tools: ["Read", "Bash", "Grep", "Glob"]
paths: ["backend/src/booking/**", "backend/src/work-order/**", "backend/src/invoice/**", "backend/src/dvi/**"]
argument-hint: "[booking|work-order|invoice|dvi|all]"
arguments: modulo
---

# State Machine Audit — NASA FMEA Standard

## Obiettivo

Analisi FMEA (Failure Mode and Effects Analysis) di ogni state machine critica.
Target: zero transizioni illegali, zero race condition non gestite, zero stati orfani.

## Moduli State Machine Nexo

```
booking:     PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
             PENDING → CANCELLED, CONFIRMED → CANCELLED

work-order:  DRAFT → IN_PROGRESS → QUALITY_CHECK → COMPLETED → INVOICED
             DRAFT → CANCELLED

invoice:     DRAFT → SENT → PAID
             DRAFT → CANCELLED, SENT → OVERDUE → PAID

dvi:         PENDING → IN_PROGRESS → COMPLETED → APPROVED/REJECTED
```

## STEP 1 — Leggi Sorgenti

```bash
# Trova file state machine
grep -rn "validateTransition\|status.*PENDING\|status.*CONFIRMED\|enum.*Status" \
  backend/src/$ARGUMENTS --include="*.ts" | head -40
```

Leggi con Read:
- `backend/src/$ARGUMENTS/$ARGUMENTS.service.ts`
- Tutti i file con `validateTransition`, `transition`, `setState`

## STEP 2 — FMEA Matrix

Per ogni transizione di stato, compila:

| # | Transizione | Failure Mode | Effetto | Severity (1-10) | Probability (1-10) | RPN (S×P) | Controllo Esistente | Azione Richiesta |
|---|-------------|-------------|---------|-----------------|-------------------|-----------|--------------------|--------------------|
| 1 | PENDING→CONFIRMED | Double-confirm | Doppia fattura | 9 | 3 | 27 | Advisory lock | Verifica idempotenza |
| 2 | IN_PROGRESS→COMPLETED | Skip QUALITY_CHECK | Difetto non rilevato | 8 | 2 | 16 | validateTransition | OK se presente |
| 3 | ... | ... | ... | ... | ... | ... | ... | ... |

**RPN ≥ 20 = CRITICO → blocca merge**
**RPN 10-19 = ALTO → richiede test**
**RPN < 10 = MEDIO/BASSO**

## STEP 3 — Verifica Controlli

### Advisory Lock (solo booking)
```bash
grep -n "advisory\|pg_advisory\|SERIALIZABLE\|FOR UPDATE" \
  backend/src/booking --include="*.ts" -r
```
Deve esistere lock su ogni operazione di confirm/complete.

### validateTransition()
```bash
grep -n "validateTransition\|INVALID_TRANSITION\|InvalidTransitionException" \
  backend/src/$ARGUMENTS --include="*.ts" -r
```
Deve essere chiamato PRIMA di ogni `prisma.*.update({ data: { status } })`.

### Compensazione (Saga Pattern)
```bash
grep -n "catch\|rollback\|compensat\|undo\|revert" \
  backend/src/$ARGUMENTS --include="*.ts" -r
```
Ogni transizione fallita deve avere compensazione.

### Idempotenza
Verifica che operazioni ripetute (retry webhook, doppio click) non causino doppia esecuzione:
```bash
grep -n "idempotent\|upsert\|createOrUpdate\|unique" \
  backend/src/$ARGUMENTS --include="*.ts" -r
```

## STEP 4 — Race Condition Analysis

Pattern pericolosi da cercare:
```bash
# Leggi-Modifica-Scrivi non atomico
grep -n "findFirst.*then.*update\|findUnique.*then.*update" \
  backend/src/$ARGUMENTS --include="*.ts" -r

# Missing transaction
grep -n "prisma\.\w*\.update\|prisma\.\w*\.create" \
  backend/src/$ARGUMENTS --include="*.ts" -r | grep -v "\$transaction"
```

## STEP 5 — Test Coverage State Machine

```bash
cd backend && npx jest src/$ARGUMENTS --coverage --forceExit 2>&1 | \
  grep -E "Statements|Branches"
```

Verifica che esistano test per:
- Ogni transizione valida (happy path)
- Ogni transizione ILLEGALE (deve lanciare eccezione)
- Doppia esecuzione della stessa transizione
- Transizione con stato intermedio corrotto

## STEP 6 — Report FMEA

Output finale:

```
STATE MACHINE AUDIT — $ARGUMENTS
Date: $(date)

FMEA SUMMARY:
  Transizioni analizzate: N
  RPN Critico (≥20): X → [lista]
  RPN Alto (10-19): Y → [lista]
  
RACE CONDITIONS:
  Trovate: X
  Advisory lock: ✅/❌
  Transazioni Prisma: ✅/❌
  
COVERAGE:
  Statements: X%
  Branches: X%
  
VERDICT: ✅ SAFE / ❌ CRITICAL ISSUES FOUND

AZIONI RICHIESTE:
  1. [descrizione fix]
  2. [descrizione fix]
```

## Regole FMEA

- **RPN ≥ 20**: Blocca merge fino a risoluzione
- **Missing validateTransition**: CRITICO — ogni update di status DEVE chiamarla
- **Missing advisory lock su booking**: CRITICO — race condition garantita
- **Missing test per transizione illegale**: ALTO — test coverage insufficiente
- **Missing compensazione**: ALTO — stato inconsistente su failure
