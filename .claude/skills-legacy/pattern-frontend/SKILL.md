---
name: pattern-frontend
description: Pattern frontend Next.js per MechMind. Consulta quando crei pagine lista, form, dettaglio. Reference per SWR, react-hook-form, toast, dark mode.
allowed-tools: [Read, Grep]
user-invocable: false
paths: ["frontend/app/**/*.tsx", "frontend/components/**/*.tsx"]
---

# Frontend Patterns — MechMind OS

## Pagina Lista
- `useSWR` per fetch dati (MAI mock data)
- Paginazione server-side (page + limit params)
- Loading state: skeleton o spinner
- Error state: messaggio + bottone retry
- Empty state: icona + messaggio "Nessun elemento trovato"
- Search con debounce 300ms
- Filtri (status, date range)
- Dark mode: `dark:bg-[#1c1c1e]`, `dark:text-[#ececec]`

## Pagina Form
- `react-hook-form` + `zodResolver`
- Zod schema con messaggi errore in italiano
- `isSubmitting` per prevenire doppio submit
- `toast.success()` / `toast.error()` dopo submit (sonner)
- Bottone submit: `disabled={isSubmitting}` + spinner
- Reset form dopo successo
- Redirect dopo creazione

## Pagina Dettaglio
- Breadcrumb con link a lista
- Badge stato colorato
- Bottone Modifica (dialog o inline)
- Bottone Elimina con `ConfirmDialog` (Radix AlertDialog) — MAI `window.confirm()`
- Toast dopo ogni azione
- Loading/error states

## Regole universali
- Testi UI TUTTI in italiano
- Dark mode su OGNI componente (`dark:` Tailwind classes)
- Responsive: `sm:` `md:` `lg:` `xl:` breakpoint
- Touch target minimo 44px su mobile
- Toast: `sonner` (`toast.success`, `toast.error`, `toast.info`)
- Eliminazioni: `ConfirmDialog` (Radix) — MAI `window.confirm()`
- Fetch: SWR con `revalidateOnFocus: false` su liste grandi
- ZERO mock data in route API o componenti

## Colori dark mode
```
bg-page:    dark:bg-[#1c1c1e]
bg-card:    dark:bg-[#2c2c2e]
bg-input:   dark:bg-[#2f2f2f]
text:       dark:text-[#ececec]
text-muted: dark:text-[#636366]
border:     dark:border-[#424242]
```

Vedi `examples/` per codice corretto.
