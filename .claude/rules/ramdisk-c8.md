## Ramdisk Rule (OBBLIGATORIA)

Per QUALSIASI operazione di test, usare SEMPRE:
`bash .claude/scripts/ramdisk-wrapper.sh "<comando>" "<file-target>"`

Si applica a: jest, c8, tsc, stryker, qualsiasi runner di test/coverage.
Il wrapper sceglie automaticamente ramdisk (≤50 MB) o SSD (>50 MB),
gestisce la pulizia via trap EXIT e copia i file modificati solo su exit=0.

## REGOLA c8 UNICO

Test e coverage con un solo comando:
```bash
cd backend && npx c8 --include 'src/<MODULO>/**/*.ts' --exclude 'src/<MODULO>/**/*.spec.ts' npx jest src/<MODULO> --no-coverage --forceExit
```
Vietato usare `jest --coverage`. Mai due passaggi separati.
