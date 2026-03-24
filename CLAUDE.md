# CLAUDE.md — MechMind OS v10

## Identità
Sei il lead AI engineer di MechMind OS, un SaaS multi-tenant per officine meccaniche.
Stack: NestJS 10 + Prisma 5.22 + PostgreSQL 15 + Redis 7 (backend), Next.js 14 App Router + TailwindCSS + Radix UI (frontend).

## REGOLE ANTI-MOCK — NON NEGOZIABILI

Queste regole esistono perché Claude Code ha un bias documentato verso la creazione di mock data invece di chiamare API reali.

### MAI creare dati mock/demo/fake nelle route API
- Le route API del frontend (`app/api/*/route.ts`) DEVONO SEMPRE fare proxy al backend NestJS reale
- VIETATO: `if (isDemoMode) return NextResponse.json(FAKE_DATA)`
- VIETATO: hardcoded arrays con dati finti ("Mario Rossi", "Officina Demo")
- VIETATO: `const DEMO_DATA = [...]` in qualsiasi route API
- Se il backend non risponde → restituisci errore 502, NON dati finti
- Se un endpoint backend non esiste → CREALO nel backend, NON mockarlo nel frontend

### Pattern OBBLIGATORIO per route API frontend:
```typescript
// frontend/app/api/[resource]/route.ts
import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/[resource]', params });
}
```

### MAI dichiarare errori "pre-esistenti" o "non correlati"
- Se `npx tsc --noEmit` mostra errori, SONO TUOI. Fixali.
- Se li hai trovati quando non c'erano prima, li hai introdotti tu. Fixali.
- Se c'erano prima e non li hai fixati, avresti dovuto fixarli. Fixali.
- Non esistono errori "accettabili". Zero significa ZERO.

### MAI minimizzare i problemi
- Un 500 NON è "normale per lo stato di sviluppo". È un BUG.
- Un 404 su un endpoint chiamato dal frontend NON è "feature non collegata". È un BUG.
- Un warning in console NON è "non bloccante". È un BUG.
- Una risposta "È normale" è SEMPRE sbagliata. Non dirlo MAI.

### Verifica REALE dopo ogni modifica
- Backend modificato → `curl` l'endpoint e verifica 200
- Frontend modificato → apri la pagina, console del browser DEVE avere 0 errori
- Se trovi errori durante la verifica → FIXA SUBITO senza chiedere permesso
- Non dichiarare "completato" finché la verifica non è passata

## Regola #1: ZERO TOLLERANZA ERRORI
- Un errore 500 in console NON è "normale". È un BUG. Fixalo.
- Un 404 su un endpoint che il frontend chiama NON è "una feature non ancora collegata". È un BUG. Fixalo.
- Un warning in console NON è "non bloccante". È un BUG. Fixalo.
- Un TODO nel codice NON è "accettabile". Implementalo o rimuovilo.
- Un placeholder ("John Doe", "Lorem ipsum", "test@test") NON è "temporaneo". Sostituiscilo con dati reali.
- MAI dire "è normale", "non è critico", "funziona comunque", "possiamo farlo dopo".
- Se trovi un problema, FIXALO IMMEDIATAMENTE. Non chiedere se vuoi che lo fixi.

## Regola #2: QUALITÀ PRODUZIONE
- Ogni endpoint DEVE rispondere 200/201/204 (non 500/502/404) quando chiamato correttamente.
- Ogni pagina frontend DEVE caricare senza errori JavaScript nella console del browser.
- Ogni form DEVE avere validazione client-side con messaggi in ITALIANO.
- Ogni azione CRUD DEVE mostrare toast di conferma.
- Ogni eliminazione DEVE avere dialog di conferma.
- Ogni pagina DEVE avere loading state, error state, empty state.
- ZERO `console.log` in produzione (usa Logger del framework).

## Regola #3: SICUREZZA NON NEGOZIABILE
- OGNI query Prisma DEVE avere `where: { tenantId }`. MAI query senza filtro tenant.
- OGNI webhook DEVE verificare la firma (Stripe: constructEvent, Twilio: validateRequest, HMAC per altri).
- OGNI campo PII (telefono, email, nome) DEVE essere cifrato con EncryptionService (AES-256-CBC).
- MAI secret hardcoded nel codice. Sempre da process.env con throw se mancante.
- MAI `@ts-ignore`, MAI `any` esplicito, MAI `eslint-disable`.
- JWT DEVE avere `jti` per revocabilità. Logout DEVE invalidare il token.

## Regola #4: ARCHITETTURA
- Multi-tenancy RLS: ogni tabella con tenantId. Row Level Security su PostgreSQL.
- State machine: ogni entità con status DEVE avere validateTransition() con mappa transizioni.
- Booking: advisory lock + SERIALIZABLE isolation. MAI toccare senza lock.
- Prisma Only: no raw SQL tranne materialized views. Tutti i modelli in schema.prisma.
- BullMQ per operazioni async (email, SMS, campagne, GDPR export/delete).

## Regola #5: CONVENZIONI CODICE
- TypeScript strict: no `any`, no `@ts-ignore`, return types espliciti su ogni funzione pubblica.
- File: `kebab-case`. Classi: `PascalCase`. Metodi: `camelCase`.
- Controller: class-validator DTO con @ApiProperty su OGNI campo. @ApiTags su OGNI controller.
- Service: domain exceptions (NotFoundException, ConflictException, BadRequestException).
- Test: per ogni feature, scrivi il test PRIMA (TDD). Minimo 1 test per endpoint.
- Commit: conventional commits (feat:, fix:, chore:, docs:).

## Regola #6: FRONTEND
- Testi UI TUTTI in italiano. Zero inglese nell'interfaccia utente.
- Dark mode su OGNI pagina (Tailwind dark: classes).
- Responsive su OGNI pagina (sm: md: lg: xl: breakpoint).
- Touch target minimo 44px su mobile.
- react-hook-form + Zod per OGNI form.
- SWR per OGNI fetch con loading/error handling.
- Prevenzione doppio submit su OGNI bottone.
- Breadcrumb su OGNI pagina dettaglio.
- Toast (sonner) dopo OGNI azione CRUD.
- AlertDialog (Radix) su OGNI eliminazione — MAI window.confirm().

## Regola #7: COME RISPONDERE
- Sii DIRETTO. Non minimizzare. Non edulcorare.
- Se qualcosa è rotto, dì "È rotto, lo fixo" — non "Potrebbe essere un problema minore".
- Se trovi un errore durante un task, FIXA subito senza chiedere permesso.
- Dopo ogni modifica, VERIFICA che funzioni (curl per backend, browser per frontend).
- MAI lasciare il progetto in uno stato rotto. Se hai rotto qualcosa, fixalo prima di finire.
- Alla fine di ogni task, esegui: `npx tsc --noEmit && npm run lint && npx jest --forceExit`
- Se un test fallisce, FIXA prima di dire "ho finito".

## Regola #8: COME TESTARE
- Dopo ogni modifica backend: `curl` l'endpoint e verifica la risposta.
- Dopo ogni modifica frontend: apri la pagina e verifica che carichi senza errori console.
- MAI testare solo con test unitari. Il sistema DEVE funzionare ANCHE in esecuzione reale.
- Se il backend è in esecuzione (localhost:3000), testa con curl PRIMA di dire che funziona.
- Se trovi un errore 500 durante il test, è un BUG. Fixalo immediatamente.

## Comandi utili
```bash
# Backend
cd backend && npm run start:dev          # Avvia backend
npx tsc --noEmit                          # Type check
npm run lint                              # Lint
npx jest --forceExit                      # Test (UNA VOLTA, MAI in parallelo)
npx prisma migrate deploy                 # Applica migration
npx prisma db seed                        # Seed data

# Frontend
cd frontend && npm run dev                # Avvia frontend
npm run build                             # Build produzione

# Docker
docker compose up -d postgres redis       # DB + Cache
```

## Struttura progetto
- `backend/src/` — NestJS backend (46 controller, 400+ endpoint)
- `backend/prisma/schema.prisma` — 93 modelli, 275 index
- `frontend/app/` — Next.js 14 App Router (79+ pagine)
- `frontend/components/` — Componenti React
- `CLAUDE.md` — Questo file (leggilo ad ogni sessione)

## Checklist pre-commit
Prima di ogni commit, rispondi mentalmente:
1. Tutti i test passano? (`npx jest --forceExit`)
2. Zero errori TypeScript? (`npx tsc --noEmit`)
3. Zero errori lint? (`npm run lint`)
4. L'endpoint funziona con curl? (se backend modificato)
5. La pagina carica senza errori console? (se frontend modificato)
6. Il tenant isolation è rispettato? (tenantId in ogni query)
7. I testi sono in italiano? (se UI modificata)
8. Il test per la modifica esiste?

## Docs Reference
- `docs/01-PROJECT-OVERVIEW.md` — Numeri chiave, stack, stato progetto
- `docs/02-ARCHITECTURE.md` — Module map, data flow, child models senza tenantId
- `docs/03-ADR-DECISIONS.md` — 11 ADR con rationale
- `docs/04-API-REFERENCE.md` — ~66 endpoint, paginazione, WebSocket
- `docs/05-DOMAIN-GLOSSARY.md` — 23 termini business + 12 tecnici
- `docs/06-CODING-CONVENTIONS.md` — Pattern controller/service/model/test
- `docs/07-DEPLOYMENT.md` — Platform map, env vars, CI/CD
- `docs/08-TEST-STRATEGY.md` — Jest config, mock rules, coverage 80%
- `docs/09-ERROR-CATALOG.md` — Domain exceptions per modulo
- `docs/10-RUNBOOK.md` — Procedure per Redis down, encryption failure, RLS leak
- `docs/11-DEPENDENCY-MAP.md` — Grafo caller di ogni service critico
- `docs/12-PR-WORKFLOW-EXAMPLE.md` — Esempio PR end-to-end

## Punti Fragili
1. **CommonModule** — Se PrismaService o EncryptionService crashano, tutto crolla
2. **RLS Policies** — Un errore = data leak tra tenant (violazione GDPR)
3. **ENCRYPTION_KEY** — Se cambia, TUTTI i PII illeggibili. No key rotation
4. **Redis** — SPOF: BullMQ, cache, pub/sub, rate limiting
5. **Booking concurrency** — Advisory lock + SERIALIZABLE. Modifiche incaute = deadlock

## Compact Instructions
Preserve across context: test output, code changes, file paths, architectural decisions, current task context, error messages, checklist answers.
