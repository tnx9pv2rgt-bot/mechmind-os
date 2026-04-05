---
globs:
  - "frontend/**/*.ts"
  - "frontend/**/*.tsx"
---
# Frontend Rules (Next.js 14)

## Patterns
- App Router (app/ directory), no pages/ router
- Server Components by default, `"use client"` only when needed
- Data fetching: SWR per client-side, fetch per server-side
- Forms: react-hook-form + Zod schemas
- Styling: TailwindCSS + Radix UI primitives (shadcn)
- Toast: Sonner
- Dialogs: Radix AlertDialog

## API Routes
- SOLO proxy al backend NestJS: `proxyToNestJS({ backendPath: 'v1/[resource]' })`
- MAI mock data, demo data, fake data
- Backend non risponde → errore 502

## Components
- UI primitives in `components/ui/` (shadcn pattern)
- Feature components in `components/<feature>/`
- Custom hooks in `hooks/`

## UI
- Tutta in italiano
- Dark mode + responsive su ogni pagina
- Touch target minimo 44px
- Loading/error/empty states obbligatori
- Breadcrumb su pagine di dettaglio
