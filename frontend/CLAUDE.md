## FRONTEND (Next.js 14) — regole path-scoped

Caricato on-demand quando Claude lavora su `frontend/**`.

## Architettura
- App Router (`app/`), no `pages/`.
- Server Components di default. `"use client"` solo se serve.
- Data fetch: SWR client-side, `fetch` server-side.
- Form: `react-hook-form` + Zod.
- Stile: Tailwind + Radix UI (shadcn). Toast: Sonner. Dialog: Radix AlertDialog.

## API routes (anti-mock NON NEGOZIABILE)
- `app/api/*/route.ts` → SOLO `proxyToNestJS({ backendPath: 'v1/<resource>' })`.
- MAI `mockData`, `demoData`, `fakeData`, `DEMO_DATA`, `isDemoMode`, `getDemoData`.
- Backend down → 502, mai fallback con dati finti. Hook `guard-write.sh` blocca a livello settings.

## Componenti
- UI primitives: `components/ui/` (shadcn).
- Feature: `components/<feature>/`.
- Hook custom: `hooks/`.

## UI/UX
- Italiano. Dark mode + responsive su ogni pagina.
- Touch target ≥44px. Loading/error/empty obbligatori.
- Breadcrumb su pagine di dettaglio.

## Comandi rapidi
```bash
cd frontend && npm run dev                   # :3000
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npx playwright test           # E2E
```
