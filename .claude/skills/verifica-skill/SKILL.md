---
name: Verifica Skill & Hook Integrity
description: Audit testabilità, sintassi e robustezza di skill e hook
type: quality-assurance
category: infrastructure
user-invocable: true
argument-hint: "[--full|--quick] [--report-path PATH]"
effort: medium
timeout: 300
---

# Verifica Skill & Hook Integrity

Audit NASA-level: ShellCheck, sintassi YAML, test funzionali, metriche di robustezza.

## Comandi

```bash
/verifica-skill --full
/verifica-skill --quick
/verifica-skill --full --report-path ./HEALTH_REPORT.md
```

## Output

Report `HEALTH_SKILLS.md` con:
- ✅ ShellCheck su tutti gli hook
- ✅ Validazione YAML su tutte le skill
- ✅ Test funzionali su stop-quality-gate.sh
- ✅ Test funzionali su task-completed.sh
- ✅ Metriche di copertura argomenti

## Dettagli

### 1. ShellCheck
Esegui `shellcheck` su tutti i file `.sh` in `.claude/hooks/`. Fa che non ci siano errori SC2086, SC2046, SC1091 (common bash pitfalls).

### 2. YAML Validation
Per ogni `SKILL.md`:
- Controlla `---` iniziale e finale
- Valida campi obbligatori: `name`, `description`, `type`
- Valida `user-invocable` è booleano
- Se `user-invocable: true`: controlla `argument-hint` esista
- Se `disable-model-invocation: true`: controlla `model` e `context` esistono

### 3. Test Funzionali

#### stop-quality-gate.sh
```bash
# Test 1: File TS con errori → deve bloccare (exit 2)
echo 'let x: number = "string";' > /tmp/test-err.ts
git add /tmp/test-err.ts
echo '{}' | ./stop-quality-gate.sh
[ $? -eq 2 ] && echo "✅ Test 1" || echo "❌ Test 1"

# Test 2: File TS pulito → deve passare (exit 0)
echo 'let x: number = 42;' > /tmp/test-ok.ts
git add /tmp/test-ok.ts
echo '{}' | ./stop-quality-gate.sh
[ $? -eq 0 ] && echo "✅ Test 2" || echo "❌ Test 2"

# Test 3: Nessun file TS → skip (exit 0)
git reset HEAD /tmp/test-*.ts
echo '{}' | ./stop-quality-gate.sh
[ $? -eq 0 ] && echo "✅ Test 3" || echo "❌ Test 3"
```

#### task-completed.sh
```bash
# Test: Detetta mancanza spec per nuovo service
# Crea un service senza spec, verifica che hook lo rilevi
# Hook deve loggare "SPEC MANCANTE" su stderr
```

### 4. Metriche di Robustezza

- Numero di funzioni non testate in hook
- Copertura argomenti skill (ogni skill ha argument-hint?)
- Timeout definiti per skill pesanti?
- Cross-platform compatibility (no osascript hardcoded)

## Report Finale

```markdown
# HEALTH_SKILLS.md

## ShellCheck
✅ All hooks pass ShellCheck (0 warnings)

## YAML Validation
- ✅ verifica-skill/SKILL.md
- ✅ genera-test/SKILL.md
- ❌ custom-hook/SKILL.md: missing `argument-hint`

## Functional Tests
- ✅ stop-quality-gate.sh: Test 1-5 PASS
- ✅ task-completed.sh: Test 1-3 PASS

## Robustness
- ⚠️ notify.sh uses osascript (non-portable)
- ✅ stop-quality-gate.sh has timeout handling
- ✅ All skills with effort: max have timeout defined

## OVERALL SCORE
✅ 92% (46/50 checks passed)
```

---

**Failure Modes:**
- ShellCheck warnings → STOP
- YAML syntax invalid → STOP
- Test failures → log and continue
- Report always generated

**Last Updated:** 2026-04-25
