---
name: ripara-tutto
description: Trova tutti i file sotto 90% e li ripara uno per uno in automatico.
allowed-tools: [Bash, Read, Write, Edit, Grep, Glob]
disable-model-invocation: true
user-invocable: true
context: fork
effort: max
timeout: 7200
---

## 🚀 AUTO-START

Quando attivata, esegui SUBITO questo ciclo senza fermarti mai:

### STEP 1: Trova i file sotto 90/90
```bash
cd backend && python3 -c "
import json
with open('coverage/coverage-summary.json') as f:
    d = json.load(f)
files = [(data['branches']['pct'], data['statements']['pct'], path) for path, data in d.items() 
         if path != 'total' 
         and ('.controller.ts' in path or '.service.ts' in path)
         and not path.endswith('.spec.ts')
         and (data['statements']['pct'] < 90 or data['branches']['pct'] < 90)]
files.sort()
for b,s,p in files:
    print(f'{p}|{s}|{b}')
"
```

### STEP 2: Per OGNI file trovato, esegui QUESTO ciclo:

1. Leggi il file sorgente con Read
2. Leggi il suo .spec.ts (se esiste)
3. Misura coverage reale: `npx jest <file.spec.ts> --coverage --forceExit 2>&1 | grep Branches`
4. Aggiungi test mirati in /tmp per coprire i branch scoperti
5. Verifica con `npx tsc --noEmit`
6. Copia su disco e riesegui coverage
7. Se branches >= 90%, passa al prossimo file
8. Se < 90%, ritenta (max 3 volte)
9. Se ancora < 90% dopo 3 tentativi, segna CEILING e vai avanti

### STEP 3: Report finale

Stampa SOLO:

```
File riparati: X
File in ceiling: Y (con nomi)
Coverage branches finale: Z%
```

VIETATO produrre analisi preliminari. VIETATO fare report intermedi. VIETATO fermarsi.
