---
paths:
  - "frontend/**/*.ts"
  - "frontend/**/*.tsx"
---
# Frontend Rules (Next.js 14)

## Patterns
- App Router (app/ directory), no pages/ router
- Server Components by default, `"use client"` only when needed
- Data fetching: tRPC + @tanstack/react-query
- Forms: react-hook-form + zod schemas
- State: zustand for global state
- Styling: TailwindCSS + Radix UI primitives

## Components
- UI primitives in `components/ui/` (shadcn pattern)
- Feature components in `components/<feature>/`
- Custom hooks in `hooks/`
- Types in `types/` or `lib/types/`

## Testing
- Jest for unit tests: `cd frontend && npm run test`
- Playwright for E2E: `cd frontend && npm run test:e2e`

## i18n
- Use i18next for all user-facing strings
- Translation files in `frontend/i18n/`
- Never hardcode Italian/English strings in components

## Accessibility
- WCAG 2.1 AA compliance required
- Use semantic HTML + Radix UI for a11y
- All interactive elements need keyboard support
