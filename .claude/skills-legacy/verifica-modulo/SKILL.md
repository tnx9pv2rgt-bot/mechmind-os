---
name: valuta-modulo
description: Valuta se un modulo è pronto per i test (punteggio qualità).
allowed-tools: ["Bash(node *)","Bash(find *)","Bash(grep *)","Bash(ls *)"]
disable-model-invocation: true
effort: low
argument-hint: "<modulo>"
arguments: modulo
---

# Verifica Modulo — Scoring 0-100

Esegui l'analisi statica del modulo prima di generare test:

```bash
cd "/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
node scripts/verify-module.mjs "$ARGUMENTS"
node scripts/verify-module.mjs "$ARGUMENTS" --json
```

## Categorie di scoring

| Categoria | Punti | Criteri |
|-----------|-------|---------|
| **STRUTTURA** | 30 | Ogni .service.ts e .controller.ts DEVE avere .spec.ts |
| **DATABASE** | 25 | Model Prisma (+10), tenantId field (+10), query sicure |
| **STATE MACHINE** | 20 | validateTransition (+10), transizioni invalide testate (+10) |
| **MOCK QUALITY** | 15 | TENANT_ID const (+7), assertion con tenantId (+8) |
| **FRONTEND** | 10 | Pagina Next.js (+5), API route proxy (+5) |

**Score ≥ 70** → Generazione APPROVATA  
**Score < 70** → Elenca priorità fix

## Coverage Threshold (Atomic Workflow)

Dopo generazione Jest, coverage DEVE raggiungere:
- **Statements ≥ 90%**
- **Branches ≥ 90%**

Se coverage insufficiente:
- ❌ RAM workspace rimosso (atomic rollback)
- Nessun file su disco cambia
- Devi migliorare i test e ritentare

## Usando /genera-test

```
/genera-test booking
→ Verifica score 81/100 ✅
→ Trova 2 service
→ Preview file
→ Chiede conferma
→ Genera spec.ts per entrambi
→ Aggiorna MODULI_NEXO.md
```

Con `--force`: ignora score < 70 (non raccomandato)  
Con `--dry-run`: preview senza API call
