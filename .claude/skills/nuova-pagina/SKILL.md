---
name: nuova-pagina
description: Crea una nuova pagina frontend Next.js. Usa quando chiesto di aggiungere pagina, vista, schermata, o "crea pagina per X".
allowed-tools: [Read, Write, Grep, Glob, "Bash(npx tsc *)"]
---

# Nuova Pagina — Checklist OBBLIGATORIA

## Requisiti su OGNI pagina:
- Testi UI in italiano (zero inglese)
- Loading state (skeleton/spinner)
- Error state (messaggio chiaro + retry)
- Empty state (illustrazione + messaggio)
- Breadcrumb (se dettaglio)
- SWR per fetch
- Dark mode (`dark:` classes)
- Responsive (`sm:` `md:` `lg:`)
- Touch target 44px minimo

## Se ha form:
- `react-hook-form` + `zod`
- Errori in italiano
- Prevenzione doppio submit
- Toast dopo submit

## Se ha azioni CRUD:
- Toast dopo create/update
- `AlertDialog` (Radix) su eliminazione — MAI `window.confirm()`

## Route API:
- Proxy al backend reale — ZERO mock data

## Verifica:
- Console browser: 0 errori
- Network: 0 richieste 404/500
