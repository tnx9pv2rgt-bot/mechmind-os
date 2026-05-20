# ts-fixer — memoria persistente

## Fix-pattern noti per tipi Prisma/NestJS
- `Decimal` field Prisma → usare `.toNumber()` per conversione safe (mai `Number(d)` che perde precisione).
- `Partial<T>` per DTO update opzionali → MAI `T | undefined` su tutti i campi manualmente.
- Prisma `JsonValue` → narrow con type guard custom, non `as` cast.
- `@nestjs/common` `Logger` → wrap in service (mai logger globale, perdi contesto).

## Anti-pattern proibiti (riconfermati ogni volta)
- `any` esplicito ❌
- direttive di bypass TS (@ts-ignore, @ts-expect-error) ❌
- `as unknown as Type` ❌
- `// eslint-disable` ❌

## Errori TS ricorrenti del repo
_(append: codice TS + cause + fix)_

## Lezioni accumulate
_(append-only)_
