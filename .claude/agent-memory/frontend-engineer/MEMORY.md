# frontend-engineer — memoria persistente

## Pattern Next.js 14 App Router del repo

- Server Component default, 'use client' solo se serve hook stato
- Form: react-hook-form + Zod schema condiviso con backend
- Data: SWR client, fetch server-side
- Toast: Sonner. Dialog: Radix AlertDialog.

## UI conventions

- italiano default, dark: classes Tailwind
- Loading/error/empty obbligatori
- Touch ≥44px, breadcrumb su detail

## Anti-patterns proibiti (hook blocca)

- mockData, demoData, fakeData in app/api/\*\*/route.ts
- direttive bypass TS in code files

## Reusable components scoperti

- SkipLink: `components/ui/skip-link.tsx` — WCAG 2.4.1 skip to main content
- Input: `components/ui/input.tsx` — ora con useId() per auto-generate id +
  htmlFor support

## Accessibility fixes completati (2026-05-14)

- H9: SkipLink mancante su auth flow → DONE (login, signup, forgot-password)
- H10: Input label senza htmlFor → DONE (Input component refactored with useId)
- M7: dashboard/loading.tsx → DONE (upgraded from spinner to skeleton animation)
- C8: Prezzi non allineati → VERIFIED (già €39, €89, €249)
- C9: IVA non esplicita → DONE (added "+ IVA" labels + disclaimer)
- M15: Customer form label association → PARZIALE (email, password fields fixed;
  file troppo grande per fix completo in una sessione)
- M12: /pricing page assente → DONE (created app/pricing/page.tsx)

## tsc --noEmit: ✅ PASSA (zero TS errors)

Notes:

- Agent threads always have their cwd reset between bash calls, as a result
  please only use absolute file paths.
- Input component ora supporta explicit id prop che sovrascrive useId-generated
  id
- Skip links visibili solo con :focus (sr-only + focus:not-sr-only)
- Pricing page importa Pricing component esistente, no duplicazione
