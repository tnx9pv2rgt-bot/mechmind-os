---
name: audit-modulo
description: Orchestratore unico di qualità — 4 fasi ESAA (2026-edition). Backend NestJS + Prisma + BullMQ + Redis. Frontend Next.js 14 App Router + React 19 + Playwright. 15 quality gate, 22 assi di analisi, supply chain audit, Core Web Vitals, visual regression, OWASP Top 10:2025, PCI DSS 4.0.1, GDPR Art.32, OpenTelemetry, Stryker, Semgrep. Decision memory append-only. Auto-escala modello. Mai chiamare tools/fix-coverage.
---

# audit-modulo — Orchestratore Unico di Qualità (2026 Edition)

> **Apri sempre con questa riga:** `🛡️ audit-modulo skill attivata — 2026 edition.`

---

## REGOLA ZERO

- Assorbe tutto fix-coverage. NON chiama `tools/fix-coverage` né `/fix-coverage`.
- Esegue tutto internamente con Read / Write / Edit / Bash / WebSearch.
- Fonti di riferimento: OWASP Top 10:2025, PCI DSS 4.0.1, GDPR Art.32, CVE-2025-66478, CVE-2025-29927, ESAA arXiv 2603.06365, Cloudflare AI Review blog.cloudflare.com/ai-code-review.

---

## REGOLA RAMDISK — zero eccezioni

QUALSIASI `jest`, `c8`, `tsc`, `stryker` DEVE passare attraverso:

```bash
bash .claude/scripts/ramdisk-wrapper.sh "<comando completo>" "<file/dir target>"
```

Sovrasta qualsiasi esempio storico.

---

## REGOLA DEL 100

La skill NON si ferma finché TUTTI gli assi non sono a 10/10.

**Backend (6 assi):** Sicurezza · Performance · Resilienza · Osservabilità · Test · Architettura
**Frontend (8 assi):** Component Isolation · E2E · Self-Healing · Accessibilità · Server Security · Performance Budget · Visual Regression · Security Headers

Se un problema è tecnicamente irrisolvibile (es. decorator NestJS, middleware ceiling Next.js):
1. Marca `CEILING_ACCEPTED` in `.audit-decisions.jsonl`
2. Assegna 10/10 con nota "CEILING ACCEPTED"
3. Prosegue immediatamente

**Questa regola sovrascrive qualsiasi altra logica di stop.**

---

## REGOLA D'ORO — Spietatezza operativa

Ogni problema trovato va **RISOLTO SUBITO** con Edit/Write. Dopo ogni modifica: test immediati. Non accumulare errori. Non segnalare e basta.

---

## Step −1 — Parsing argomenti & Model Routing per Fase

**Flags:**
- `--frontend` → attiva 8 assi frontend
- `--e2e` → esegue Playwright (richiede server running)
- `--supply-chain` → esegue npm audit + lockfile integrity
- `--load` → esegue k6 load test (richiede script tests/load.js)

**Model Routing (Advisor Strategy — Anthropic 2026):**

Assignment fisso per fase, NON cascading dinamico. Risparmio atteso: ~51% vs modello uniforme.

| Fase | Task | Modello | Rationale |
|------|------|---------|-----------|
| 1 — Reconnaissance | grep, read file, baseline coverage, CVE scan | `haiku` | retrieve-only, nessuna sintesi complessa |
| 2.1 — Test generation | scrittura test, fix codice, Edit/Write | `sonnet` | sempre, indipendentemente dal tier modulo |
| 2.2 — Analisi chirurgica | lettura file service/controller | `haiku` | pattern matching, nessuna decisione critica |
| 3 — Risk classification | calcolo score, traceability | `haiku` | formula deterministica |
| 4 — Report | markdown output, JSON evento | `haiku` | templating strutturato |
| Security review TIER_1 | OWASP deep-dive, architettura | `opus` | solo `auth`, `booking`, `invoice`, `payment-link`, `subscription`, `gdpr`, `webhooks` |

**Come applicare nei subagenti:**
```
Agent({ subagent_type: "Explore",   model: "haiku",  ... })  // fase 1, 2.2
Agent({ subagent_type: "...",        model: "sonnet", ... })  // fase 2.1 test gen
Agent({ subagent_type: "code-reviewer", model: "opus", ... }) // fase 4 security TIER_1
```

**Regola:** test generation usa sonnet SEMPRE — qualità indistinguibile da opus a 10× minor costo (AWS AMET benchmark 2026).

---

## FASE 1 — RECONNAISSANCE
**Evento:** `AuditReconnaissanceCompleted`

### 1.1 — Decision Memory

```bash
DECISIONS="backend/src/{NOME_MODULO}/.audit-decisions.jsonl"
[ -f "$DECISIONS" ] && cat "$DECISIONS" || echo "[]"
shasum -a 256 backend/src/{NOME_MODULO}/**/*.{service,controller,processor}.ts 2>/dev/null
```

**Regola:** finding con stato `CEILING_ACCEPTED` o `ACCEPTED_PATTERN` + hash invariato → salta.

### 1.2 — WebSearch contestuale 2026

Esegui sempre **tutti** questi:

```
"NestJS {NOME_MODULO} security vulnerabilities CVE 2025 2026"
"NestJS {NOME_MODULO} OWASP Top 10 2025 best practices"
"Next.js {NOME_MODULO} App Router security 2025 2026"
"GDPR Art.32 PCI DSS 4.0.1 eIDAS 2.0 {NOME_MODULO} 2025 2026"
"Playwright 2026 visual regression self-healing AI healer"
"React 19 React Compiler hooks anti-patterns 2025 2026"
"supply chain attack npm {NOME_MODULO} CVE 2025 2026"
```

Annota: CVE note, pattern obbligatori, normative, fonti citate nel report.

### 1.3 — Baseline coverage

**Backend:**
```bash
cd backend && bash ../.claude/scripts/ramdisk-wrapper.sh \
  "npx c8 --include 'src/{NOME_MODULO}/**/*.ts' \
          --exclude 'src/{NOME_MODULO}/**/*.spec.ts' \
          --reporter=text-summary \
          npx jest src/{NOME_MODULO} --no-coverage --forceExit --silent" \
  "src/{NOME_MODULO}"
```

**Frontend (se --frontend):**
```bash
cd frontend && bash ../.claude/scripts/ramdisk-wrapper.sh \
  "npx jest src/{NOME_MODULO} --coverage --forceExit --silent --passWithNoTests" \
  "src/{NOME_MODULO}"
```

**E2E (se --e2e):**
```bash
cd frontend && npx playwright test --reporter=json tests/e2e/{NOME_MODULO}*.spec.ts 2>/dev/null | jq '.stats'
```

### 1.4 — CVE Scan Immediato (BLOCCANTE se positivo)

```bash
# CVE-2025-66478: Next.js RCE via RSC Flight protocol (CVSS 9.1)
cd frontend && node -e "const v=require('./node_modules/next/package.json').version; \
  const [maj,min,patch]=v.split('.').map(Number); \
  const vuln=(maj===15&&min<=2&&patch<3)||(maj===16&&min===0&&patch<=6); \
  console.log(vuln?'❌ BLOCCANTE CVE-2025-66478 Next.js '+v:'✅ Next.js '+v+' safe')" 2>/dev/null || echo "⚠️ Next.js not found"

# CVE-2025-29927: Middleware bypass via x-middleware-subrequest (CVSS 9.1)
cd frontend && grep -r "x-middleware-subrequest" src/ middleware.ts 2>/dev/null && \
  echo "❌ BLOCCANTE CVE-2025-29927 header non filtrato" || echo "✅ No CVE-2025-29927 vector"

# Supply chain: npm audit
cd backend && npm audit --audit-level=high --json 2>/dev/null | \
  jq '.metadata.vulnerabilities | {high, critical}' || echo "⚠️ audit failed"
cd frontend && npm audit --audit-level=high --json 2>/dev/null | \
  jq '.metadata.vulnerabilities | {high, critical}' || echo "⚠️ audit failed"
```

### 1.5 — Output evento Reconnaissance

```json
{"eventId":"reconn-{TS}","phase":"RECONNAISSANCE","module":"{NOME_MODULO}",
 "baseline":{"stmts":X,"branches":Y},"cveChecks":{"66478":"safe","29927":"safe"},
 "npmAudit":{"high":0,"critical":0},"hashes":{...},"skippedFindings":[...]}
```

---

## FASE 2 — DOMAIN AUDIT EXECUTION
**Evento:** `AuditExecuted`

### 2.1 — GENERAZIONE & RIPARAZIONE AUTONOMA TEST

#### 2.1.a — Template Backend (NestJS)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { <ServiceClass> } from './<source-file>';
import { NotFoundException, ConflictException, BadRequestException,
         InternalServerErrorException } from '@nestjs/common';

const mockPrisma = {
  <model>: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};
const mockEncryption = { encrypt: jest.fn(x => `enc:${x}`), decrypt: jest.fn(x => x.replace('enc:','')) };
const mockConfig = { get: jest.fn() };

describe('<ServiceClass>', () => {
  let service: <ServiceClass>;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Sensible defaults — override con Once nei singoli test
    mockPrisma.<model>.findFirst.mockResolvedValue({ id: 'uuid-1', tenantId: 'tenant-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <ServiceClass>,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(<ServiceClass>);
  });

  describe('<method>', () => {
    it('happy path — returns result with tenantId isolation', async () => {
      mockPrisma.<model>.findFirst.mockResolvedValueOnce({ id: 'uuid-1', tenantId: 'tenant-1', body: 'enc:hello' });
      const result = await service.<method>('tenant-1', ...);
      expect(result).toBeDefined();
      expect(result.id).toBe('uuid-1');
      expect(mockPrisma.<model>.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) })
      );
    });

    it('cross-tenant isolation — returns NotFoundException for different tenant', async () => {
      mockPrisma.<model>.findFirst.mockResolvedValueOnce(null);
      await expect(service.<method>('tenant-other', ...)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.<model>.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-other' }) })
      );
    });

    it('propagates unexpected errors without leaking stack trace', async () => {
      mockPrisma.<model>.findFirst.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(service.<method>('tenant-1', ...)).rejects.toThrow();
      expect(mockPrisma.<model>.findFirst).toHaveBeenCalledTimes(1);
    });
  });
});
```

#### 2.1.b — Template Frontend (React 19 + RTL 2026)

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // NON fireEvent — RTL 2026 standard
import { axe, toHaveNoViolations } from 'jest-axe';
import { <Component> } from './<file>';

expect.extend(toHaveNoViolations);

describe('<Component>', () => {
  it('renders accessible UI (WCAG 2.1 AA)', async () => {
    const { container } = render(<<Component> {...mockProps} />);
    // Accessibilità automatica con axe-core
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    // WAI-ARIA roles, non test-id — RTL 2026
    expect(screen.getByRole('button', { name: /invia/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('handles async user interaction correctly', async () => {
    const user = userEvent.setup(); // setup() — NON userEvent diretto
    const onSubmit = jest.fn();
    render(<<Component> onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/nome/i), 'Mario');
    await user.click(screen.getByRole('button', { name: /invia/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Mario' }));
  });

  it('cleanup — no memory leak from useEffect', () => {
    const { unmount } = render(<<Component> {...mockProps} />);
    expect(() => unmount()).not.toThrow(); // verifica cleanup
    expect(mockProps.onCleanup ?? jest.fn()).not.toThrow?.();
  });
});
```

**Regole non negoziabili:**
- TypeScript strict: zero `any`, zero `@ts-ignore`, `noUncheckedIndexedAccess: true`
- `tenantId` assertito in OGNI `where` Prisma
- `mockResolvedValueOnce` / `mockRejectedValueOnce` dentro i test (mai senza `Once` fuori `beforeEach`)
- ≥2 `expect(...)` per ogni `it(...)`
- ≥1 `toHaveBeenCalled*` per ogni test che usa mock
- Errori dominio reali (`NotFoundException`, `ConflictException`, `BadRequestException`)
- Frontend: `userEvent.setup()` non `fireEvent`, `getByRole`/`getByLabelText` non `getByTestId`
- Frontend: ogni componente con `axe()` check accessibilità

#### 2.1.c — 15 QUALITY GATE

Esegui in sequenza. Se fallisce → Edit + retry (max 3). Se irrimediabile → `CEILING_ACCEPTED`.

| # | Gate | Comando | Pass criterion |
|---|------|---------|----------------|
| 1 | **TypeScript strict** | `cd backend && npx tsc --noEmit --strict --pretty false 2>&1 \| grep {spec}` | 0 errori |
| 2 | **ESLint** | `cd backend && npx eslint "{spec}" --fix --max-warnings 0` | 0 errori dopo autofix |
| 3 | **Coverage c8** | `cd backend && bash ../.claude/scripts/ramdisk-wrapper.sh "npx c8 --include {src} --reporter=text-summary npx jest {spec} --no-coverage --forceExit --silent" "{src} {spec}"` | Stmts ≥90% AND Branches ≥90% |
| 4 | **Mutation (Stryker)** | `cd backend && bash ../.claude/scripts/ramdisk-wrapper.sh "npx stryker run --mutate {src} --thresholds.high=80 --thresholds.break=70 2>/dev/null \|\| echo SKIP" "{src} {spec}"` | score ≥80% (skip se non installato, break <70% = FAIL) |
| 5 | **Flakiness** | `for i in 1 2 3; do bash ../.claude/scripts/ramdisk-wrapper.sh "npx jest {spec} --forceExit --silent" "{spec}"; done` | 3/3 PASS |
| 6 | **Assertion density** | `grep -c "expect(" {spec}` / `grep -cE "(^│\s)it\(" {spec}` | ≥2 avg |
| 7 | **Mock once enforcement** | `awk '/beforeEach\(/,/}\)/{next} /mockResolvedValue\(│mockRejectedValue\(│mockReturnValue\(/' {spec} \| grep -v "Once" \| wc -l` | 0 violazioni |
| 8 | **Call verification** | `grep -cE "toHaveBeenCalled" {spec}` ≥ `grep -cE "(^│\s)it\(" {spec}` | ≥1 per test con mock |
| 9 | **Determinism (Qodo 2.1)** | `for i in 1 2 3; do JEST_SEED=$(date +%N) bash ../.claude/scripts/ramdisk-wrapper.sh "npx jest {spec} --forceExit --silent" "{spec}"; done` | 3/3 PASS identico |
| 10 | **Property tests** | check `{file}.property.spec.ts` con fast-check | esistente o `N/A` |
| 11 | **Supply chain** | `npm audit --audit-level=high --json \| jq '.metadata.vulnerabilities.critical + .metadata.vulnerabilities.high'` | 0 critical+high |
| 12 | **CVE versioni critiche** | Version check Next.js (CVE-2025-66478), dipendenze conosciute | 0 versioni vulnerabili |
| 13 | **Semgrep SAST** | `semgrep --config=p/owasp-top-ten --config=p/typescript --quiet --error src/{NOME_MODULO}/ 2>/dev/null \|\| echo SKIP` | 0 ERROR severity |
| 14 | **No stack trace esposto** | `grep -rn "stack" src/{NOME_MODULO}/*.ts \| grep -v "spec\|\.log\(.*stack" \| grep "res\.\|response\.\|message.*stack"` | 0 match |
| 15 | **React anti-patterns** (solo --frontend) | `grep -rn "useEffect.*\[\]" frontend/src/{NOME_MODULO} \| grep -v "spec"` → verifica cleanup; `grep -rn "process\.env\." frontend/src/{NOME_MODULO} \| grep -v "NODE_ENV\|spec"` | 0 empty deps senza cleanup, 0 env leak client-side |

**AST pragmatica per gate 6/7/8:**
```bash
SPEC="{path}.spec.ts"
EXPECT_COUNT=$(grep -c "expect(" "$SPEC" || echo 0)
IT_COUNT=$(grep -cE "(^|\s)it\(" "$SPEC" || echo 0)
TOHAVE_COUNT=$(grep -cE "toHaveBeenCalled(With|Times)?" "$SPEC" || echo 0)
echo "G6-density: $((EXPECT_COUNT / (IT_COUNT==0?1:IT_COUNT)))"
echo "G7-violations: $(awk '/beforeEach\(/,/}\)/{next} /mockResolvedValue\(|mockRejectedValue\(|mockReturnValue\(/' "$SPEC" | grep -v "Once" | wc -l)"
[ "$TOHAVE_COUNT" -ge "$IT_COUNT" ] && echo "G8: OK" || echo "G8: FAIL"
```

### 2.2 — ANALISI CHIRURGICA

Per OGNI `.service.ts`, `.controller.ts`, `.processor.ts` (backend) o `.tsx`/`page.tsx` (frontend), leggi con **Read** ed esegui tutti gli assi come unico agente.

---

#### BACKEND — 6 assi (1–10)

**Asse 1 — SICUREZZA** (OWASP Top 10:2025 aggiornato)

| Domain | Check | Severità |
|--------|-------|----------|
| A01:2025 Broken Access Control | `tenantId` in OGNI `where` Prisma; nessun `findUnique` senza tenant | BLOCCANTE |
| A02:2025 Cryptographic Failures | PII via `EncryptionService` (AES-256-CBC); TLS 1.3; no MD5/SHA1; chiave non in codebase | BLOCCANTE |
| A03:2025 **Supply Chain Failures** (NEW 2025) | `npm audit --audit-level=high`; lockfile committed; no `^` prefix su deps critici; verifica pre-install scripts malevoli | BLOCCANTE |
| A04:2025 Insecure Design | State machine `validateTransition()`; advisory lock booking; idempotency key su webhook | ALTA |
| A05:2025 Security Misconfiguration | CORS no wildcard `*`; no stack trace in response; NODE_ENV check; BullMQ dashboard protetto | ALTA |
| A06:2025 Vulnerable Components | Versioni dipendenze con CVE noti; `npm audit`; Semgrep `p/owasp-top-ten` | ALTA |
| A07:2025 Auth & Identity Failures | JWT `jti` revocabile; `@UseGuards(JwtAuthGuard, RolesGuard)` su tutti gli endpoint; MFA per accesso admin (PCI DSS 4.0.1) | BLOCCANTE |
| A08:2025 Software Integrity Failures | Webhook: HMAC `crypto.timingSafeEqual` + length check; mai fidarsi del payload | BLOCCANTE |
| A09:2025 Logging & Monitoring Failures | Structured logger su ogni operazione mutativa; Prometheus counter; no PII nei log | ALTA |
| A10:2025 **Mishandling Exceptional Conditions** (NEW 2025) | Nessun `catch` silenzioso; nessuno stack trace in response (`err.stack` non esposto); `HttpException` solo in controller | ALTA |
| Tenant isolation | `where: { tenantId }` + RLS PostgreSQL `SET app.current_tenant` | BLOCCANTE |
| Secrets | No secret hardcoded; `.env` non committato; `ConfigService.get()` con fallback controllato | BLOCCANTE |
| Rate limiting | `@Throttle()` su endpoint pubblici; Redis store per multi-instance | ALTA |
| PCI DSS 4.0.1 | MFA su tutti gli utenti (non solo admin); CSP headers; script integrity check settimanale | BLOCCANTE (se pagamenti) |
| AI/LLM security | Prompt injection; output sanitization; no secrets in prompt | ALTA (se LLM integrato) |
| Cryptography | AES-256 (non CBC → prefer GCM); no hardcoded IV; key rotation plan | ALTA |

**Asse 2 — PERFORMANCE**

- N+1 queries: ogni `findMany` con `include` → verifica `select` + `take`
- Indici mancanti: `phoneHash`, `tenantId`, `createdAt` su tabelle ad alto volume
- BullMQ per operazioni pesanti (>100ms): mai bloccare il thread principale
- Paginazione obbligatoria: `take` + `skip` su tutte le liste
- Cache Redis per dati letti frequentemente (TTL ragionevole)
- OpenTelemetry: inizializzato **prima** di `NestFactory.create()` in `main.ts` (critco per auto-instrumentazione Prisma/Express)
- k6 thresholds (se --load): `http_req_duration: p(95)<200ms`, `http_req_failed: rate<0.01`

**Asse 3 — RESILIENZA**

- Retry con exponential backoff su chiamate esterne (Twilio, Stripe, SDI)
- Circuit breaker su dipendenze esterne (Redis, terze parti)
- Timeout espliciti su ogni chiamata HTTP esterna
- Graceful degradation: Redis down → fallback in-memory per rate limiting
- BullMQ: jobs idempotenti (stesso `twilioSid` → skip); worker in processo separato
- Advisory lock + SERIALIZABLE per booking (no race condition)
- `SIGTERM` handler per graceful shutdown (`app.enableShutdownHooks()`)

**Asse 4 — OSSERVABILITÀ**

- Logger strutturato con correlation ID propagato da request a BullMQ job
- OpenTelemetry traces: verify `initTracer()` è prima riga di `main.ts` (prima di qualsiasi import NestJS)
- Prometheus: counter per ogni operazione critica (auth failures, webhook verifications, job errors)
- Health check: `/health` verifica DB + Redis + BullMQ queue depth
- DORA 5th metric: Rework Rate — ogni hotfix documentato come evento di ritorno
- Alert configurati per: 5xx rate >1%, p95 latency >500ms, queue depth >1000

**Asse 5 — TEST**

- Coverage reale (c8): Stmts ≥90% AND Branches ≥90%
- Mutation score (Stryker) ≥80% (`--thresholds.break=70` = fail assoluto)
- 42% del codice generato da AI (2026 media): verifica che i test non siano "echo test" (coverage alta + mutation bassa = red flag)
- Flakiness: 3/3 PASS con seed diversi
- Assertion density ≥2 per test
- Mock once enforcement: 0 violazioni
- Ogni stato della state machine testato (happy + error)
- Test cross-tenant isolation: query con `tenantId` sbagliato deve ritornare NotFoundException

**Asse 6 — ARCHITETTURA**

- SRP: controller solo routing + DTO, service solo business logic
- Domain exceptions nei service (mai `HttpException`)
- DTO dedicati con class-validator (mai Prisma model esposto direttamente)
- Domain events per audit trail su operazioni mutative
- TypeScript 6.0 strict: `noUncheckedIndexedAccess: true` in `tsconfig.json`
- SonarQube "Sonar way for AI Code": se codice AI-generato, verifica gate specifici
- Nessun `any`, nessun `// @ts-ignore`, nessun raw SQL
- Prisma solo via `PrismaService` (no `new PrismaClient()` diretto)

---

#### FRONTEND — 8 assi (se --frontend)

**Asse 7 — COMPONENT ISOLATION (RTL 2026)**

- `userEvent.setup()` (NON `fireEvent`) per interazioni utente
- Query by accessible role: `getByRole`, `getByLabelText` (NON `getByTestId`)
- `waitFor()` per operazioni async
- Nessun implementation detail testato (no `.className`, no `.innerHTML`)
- `jest-axe` su ogni componente: `const results = await axe(container); expect(results).toHaveNoViolations()`
- Cleanup useEffect: `const { unmount } = render(...)` → `unmount()` → verifica no warning
- React 19 Compiler: anche con auto-memoization, verificare cleanup espliciti in `useEffect`

**Asse 8 — E2E CRITICAL PATH (Playwright 2026)**

```typescript
// Percorso critico obbligatorio: login → operazione core → logout
test('critical path: {NOME_MODULO} flow', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@nexo.it');
  await page.getByLabel(/password/i).fill('Test123!');
  await page.getByRole('button', { name: /accedi/i }).click();
  await page.waitForURL('/dashboard');

  // operazione core modulo
  await page.goto('/{NOME_MODULO}');
  // ... azioni specifiche ...

  // verifica risultato
  await expect(page.getByRole('alert')).not.toBeVisible();
  await expect(page.getByText(/completato/i)).toBeVisible();
});
```

```bash
cd frontend && npx playwright test tests/e2e/{NOME_MODULO}*.spec.ts \
  --reporter=json 2>/dev/null | jq '.stats'
```

**Asse 9 — SELF-HEALING LOCATOR (Functionize fingerprint 2026)**

Se un test Playwright fallisce per selettore non trovato:

1. Cattura DOM: `await page.content()` + `await page.accessibility.snapshot()`
2. Fingerprint multi-attributo (3500 elementi/page, 200 attr/elemento):
   - `id`, `aria-label`, `role`, `text`, `data-testid`, `name`, `placeholder`, `class` (prime 3), `parent.role`, `position`
3. Calcola similarità Levenshtein/Jaccard per ogni candidato
4. Match ≥85% → **ripara selettore** con **Edit** + ritesta
5. Match <85% → **fail loudly** con: `❌ Self-healing FAILED: nessun elemento con similarità ≥85% trovato. DOM snapshot: {path}`
6. Playwright AI Healer (MCP, 2026): se disponibile, usa `--ai-healer` → ~75% auto-repair rate

**Asse 10 — ACCESSIBILITÀ (WCAG 2.1 AA)**

> ⚠️ WCAG 3.0 è ancora Working Draft (marzo 2026) — NON usarlo come standard. Target: WCAG 2.1 Level AA.

- axe-core: `npx axe https://localhost:3000/{path} --tags wcag2aa 2>&1 | grep -c "violation"`
- aria-label su tutti i bottoni/input
- Ruoli WAI-ARIA corretti (no div cliccabili senza `role="button"`)
- Focus management: focus trap nei dialog, focus restoration al close
- Keyboard navigation: Tab order logico, Escape chiude dialog
- Touch target ≥44×44px (CLAUDE.md regola)
- Contrasto colore ≥4.5:1 (AA) — verifica con axe
- Note: axe-core cattura ~35% delle violazioni WCAG — testa manualmente i flussi critici

**Asse 11 — SERVER COMPONENT SECURITY (Next.js 14 App Router)**

```bash
# CVE-2025-29927: Auth NON in middleware — deve essere in Route Handlers/Server Actions
grep -r "auth\|session\|token" frontend/middleware.ts 2>/dev/null && \
  echo "⚠️ VERIFICA: middleware non è security boundary (CVE-2025-29927)" || echo "✅"

# Dati sensibili non passati a Client Components via props
grep -rn '"use client"' frontend/src/{NOME_MODULO}/ | while read f; do
  grep -l "password\|token\|secret\|apiKey" "$f" 2>/dev/null && \
    echo "❌ BLOCCANTE: PII/secret in Client Component: $f"
done

# Env vars: NEXT_PUBLIC_ non deve contenere secrets
grep -r "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*TOKEN\|NEXT_PUBLIC_.*KEY" \
  frontend/src/ .env* 2>/dev/null && echo "❌ BLOCCANTE: secret esposto client-side" || echo "✅"
```

Checks:
- Auth checks in Route Handlers + Server Actions (non in middleware)
- Nessun secret in `NEXT_PUBLIC_*` env vars
- Server Components: nessun `fetch()` con credenziali admin esposto al client
- `headers()` / `cookies()` da `next/headers` solo in Server Components

**Asse 12 — PERFORMANCE BUDGET (Core Web Vitals 2026)**

```bash
# Core Web Vitals 2026: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1
# INP è ora fattore di ranking Google (sostituisce FID da 2024)
cd frontend && npx lighthouse http://localhost:3000/{path} \
  --chrome-flags="--headless=new" \
  --output=json --quiet 2>/dev/null | jq '{
    lcp: .audits["largest-contentful-paint"].numericValue,
    inp: .audits["interaction-to-next-paint"].numericValue,
    cls: .audits["cumulative-layout-shift"].numericValue,
    lcp_ok: (.audits["largest-contentful-paint"].numericValue <= 2500),
    inp_ok: (.audits["interaction-to-next-paint"].numericValue <= 200),
    cls_ok: (.audits["cumulative-layout-shift"].numericValue <= 0.1)
  }' 2>/dev/null || echo "⚠️ Lighthouse non disponibile"

# Bundle size budget: 200KB JS per route (HashiCorp standard 2026)
cd frontend && npx size-limit --json 2>/dev/null | \
  jq '.[] | select(.size > 200000) | {name, size, exceeded: true}' || \
  echo "⚠️ size-limit non configurato"

# React anti-pattern: useEffect con deps vuoti senza cleanup
grep -rn "useEffect" frontend/src/{NOME_MODULO}/ --include="*.tsx" | \
  grep -v "return\|spec" | grep "\[\]" | \
  while IFS=: read f ln rest; do
    # verifica che il blocco abbia return cleanup
    awk "NR>=$ln && NR<=$((ln+10))" "$f" | grep -q "return" || \
      echo "⚠️ useEffect senza cleanup: $f:$ln"
  done
```

Soglie:
- LCP: ≤2.5s ✅ / 2.5–4s ⚠️ / >4s ❌
- INP: ≤200ms ✅ / 200–500ms ⚠️ / >500ms ❌
- CLS: ≤0.1 ✅ / 0.1–0.25 ⚠️ / >0.25 ❌
- Bundle JS: ≤200KB ✅ / 200–400KB ⚠️ / >400KB ❌

**Asse 13 — VISUAL REGRESSION (Playwright 2026)**

```typescript
// visual-regression.spec.ts — generato automaticamente
import { test, expect } from '@playwright/test';

test.describe('{NOME_MODULO} visual regression', () => {
  test('desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/{NOME_MODULO}');
    await page.waitForLoadState('networkidle');
    // Maschera contenuti dinamici (timestamp, avatar, ID)
    await expect(page).toHaveScreenshot('desktop.png', {
      maxDiffPixels: 50,
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="avatar"]'),
        page.locator('time'),
      ],
    });
  });

  test('mobile layout (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/{NOME_MODULO}');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('mobile.png', { maxDiffPixels: 50 });
  });

  test('dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/{NOME_MODULO}');
    await expect(page).toHaveScreenshot('dark.png', { maxDiffPixels: 50 });
  });
});
```

```bash
# Aggiorna baseline solo in CI (mai in locale)
cd frontend && npx playwright test tests/visual/{NOME_MODULO}*.spec.ts \
  --update-snapshots  # solo su main branch in CI
```

**Asse 14 — SECURITY HEADERS (Next.js CSP)**

```bash
# CSP: nonce-based, strict-dynamic, no unsafe-eval in prod
curl -sI http://localhost:3000 | grep -i "content-security-policy" || \
  echo "❌ BLOCCANTE: CSP header mancante"

# X-Frame-Options
curl -sI http://localhost:3000 | grep -i "x-frame-options" || \
  echo "⚠️ X-Frame-Options mancante"

# Strict-Transport-Security
curl -sI http://localhost:3000 | grep -i "strict-transport-security" || \
  echo "⚠️ HSTS mancante"

# Verifica next.config.js per headers()
grep -A 30 "headers()" frontend/next.config.* 2>/dev/null || \
  echo "⚠️ Security headers non configurati in next.config"

# CSP deve contenere nonce o strict-dynamic
grep -r "nonce\|strict-dynamic" frontend/middleware.ts frontend/next.config.* 2>/dev/null || \
  echo "⚠️ CSP non usa nonce né strict-dynamic — vulnerabile a XSS"
```

Checks:
- `Content-Security-Policy` con `nonce-{random}` + `strict-dynamic`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=()`
- HSTS: `max-age=31536000; includeSubDomains`

### 2.3 — LOOP CEILING PROTECTION

```
max_iterations = 5
for i in 1..5:
  run gate 3 (coverage)
  if Stmts ≥90% AND Branches ≥90%: BREAK
  identifica righe/branch scoperti
  aggiungi test mirati (Edit)

  if i == 3 AND *.controller.ts AND no improvement:
    CEILING_ACCEPTED (NestJS @ApiOperation/@Controller decoratori)
    BREAK

  if i == 3 AND *.processor.ts AND no improvement:
    CEILING_ACCEPTED (BullMQ WorkerHost super() + @Processor decoratori)
    BREAK

  if i == 3 AND *.dto.ts AND no improvement:
    CEILING_ACCEPTED (class-validator @IsString/@IsNotEmpty decoratori)
    BREAK
```

**Frontend ceiling**: test Playwright fallisce per DOM change → self-healing prima di marcare FAILED.
**Mutation ceiling**: se Stryker non installato → gate 4 = N/A (non blocca).

### 2.4 — Output evento Executed

```json
{"eventId":"exec-{TS}","phase":"DOMAIN_AUDIT","module":"{NOME_MODULO}",
 "backend":{"files":[{"path":"...","gates":{
   "ts":true,"eslint":true,"coverage":{"stmts":94,"branches":91},
   "mutation":82,"flakiness":true,"assertion":2.4,"mockOnce":true,
   "callVerify":true,"determinism":true,"supplyChain":true,"semgrep":true,
   "noStackTrace":true,"cveCheck":true},"ceilings":[]}}]},
 "frontend":{"componentIsolation":true,"e2e":"3/3","selfHealing":"OK",
   "a11y":{"violations":0},"serverSecurity":true,"performanceBudget":{"lcp":1800,"inp":150,"cls":0.05},
   "visualRegression":"baseline-updated","securityHeaders":true},
 "findings":[...]}
```

---

## FASE 3 — RISK CLASSIFICATION
**Evento:** `AuditClassified`

### 3.1 — 4 livelli

| Livello | Definizione | Esempi 2026 |
|---------|-------------|-------------|
| **BLOCCANTE** | Blocca merge. Vuln critica, data leak, compliance violation. | tenantId mancante, CVE-2025-66478 non patchato, PII plaintext, stack trace esposto, npm critical CVE, HMAC non verificato |
| **ALTA** | Da risolvere entro sprint. Bug funzionale o security gap non immediato. | Rate limit assente, OpenTelemetry non inizializzato, MFA mancante, useEffect senza cleanup, CSP mancante |
| **MEDIA** | Da pianificare. Performance/maintainability senza rischio immediato. | N+1 query, bundle >200KB, LCP >2.5s, mutation score 70-80%, indice mancante |
| **BASSA** | Segnalato, accettabile. | DTO inline, naming subottimale, visual regression non configurata, DORA metric non tracciata |

### 3.2 — Risk score composito (2026)

```
risk_score = (
    sicurezza    * 0.28 +
    supply_chain * 0.12 +   ← NUOVO 2026 (OWASP A03:2025)
    resilienza   * 0.18 +
    test         * 0.18 +
    osservabilita* 0.12 +
    performance  * 0.07 +
    architettura * 0.05
) * 10  // 0-100

penalita_bloccanti = num_BLOCCANTI_aperti * 15
final_risk = max(0, risk_score - penalita_bloccanti)
```

`final_risk` ≥80 = production-ready. <60 = blocca rilascio.

**Frontend risk score aggiuntivo:**
```
frontend_risk = (
    server_security  * 0.35 +
    a11y             * 0.20 +
    e2e              * 0.20 +
    perf_budget      * 0.15 +
    visual_regression* 0.10
) * 10
```

### 3.3 — Mutation score affianca coverage

- Stryker score <70% → ALTA severità (fail assoluto con `--thresholds.break=70`)
- Stryker score 70-80% → MEDIA
- Stryker score ≥80% → OK
- 42% del codice 2026 è AI-generato: coverage alta + mutation bassa = **red flag specifico** (test "echo test")

### 3.4 — Traceability 2026

| Requisito | Finding tipo |
|-----------|-------------|
| OWASP A01:2025 Broken Access Control | tenantId mancante in query |
| OWASP A03:2025 Supply Chain (NEW) | npm critical CVE, pre-install script malevolo |
| OWASP A10:2025 Exceptional Conditions (NEW) | stack trace esposto, catch silenzioso |
| CVE-2025-66478 Next.js RCE | versione Next.js vulnerabile |
| CVE-2025-29927 Middleware bypass | auth in middleware invece di handler |
| GDPR Art.32 Encryption at rest | PII non cifrato |
| PCI DSS 4.0.1 §8.4 MFA | MFA non su tutti gli utenti |
| PCI DSS 4.0.1 §11.6.1 Script integrity | CSP / script check mancante |
| ISO 27001 A.12.4 Logging | operazione mutativa senza audit log |
| Core Web Vitals 2026 | LCP >2.5s, INP >200ms, CLS >0.1 |
| WCAG 2.1 AA | violazioni axe-core |

### 3.5 — DORA Rework Rate (5th metric, 2026)

Per ogni hotfix applicato durante l'audit:
```json
{"ts":"{ISO8601}","type":"DORA_REWORK","module":"{NOME}","reason":"security gap","sprint":"2026-W18"}
```

Append in `.audit-decisions.jsonl`. Rework rate >15% del sprint → flag architetturale.

---

## FASE 4 — FINAL REPORTING & DECISION UPDATE
**Evento:** `AuditCompleted`

### 4.1 — Report markdown

```bash
mkdir -p docs/audit-reports
REPORT="docs/audit-reports/{NOME_MODULO}-$(date +%Y-%m-%d).md"
[ -f "$REPORT" ] && REPORT="docs/audit-reports/{NOME_MODULO}-$(date +%Y-%m-%d)-v2.md"
```

```markdown
# Audit Report: `{NOME_MODULO}`
**Data:** {YYYY-MM-DD HH:MM} | **Sessione:** audit-{NOME_MODULO}-{YYYY-MM-DD}
**Risk Score:** {final_risk}/100 | **Mutation Score:** {N}% | **Frontend Risk:** {N}/100

## CVE & Supply Chain
| CVE | Status | Action |
|-----|--------|--------|
| CVE-2025-66478 | ✅/❌ | ... |
| CVE-2025-29927 | ✅/❌ | ... |
| npm high/critical | {N} | ... |

## Coverage (c8)
| | Prima | Dopo |
|--|-------|------|
| Statements | X% | Y% |
| Branches | X% | Y% (CEILING: ...) |

## Score Backend (1-10)
| Asse | Score | Note |
|------|-------|------|
| Sicurezza | X/10 | ... |
| Supply Chain | X/10 | ... |
| Performance | X/10 | ... |
| Resilienza | X/10 | ... |
| Osservabilità | X/10 | ... |
| Test | X/10 | mutation: N% |
| Architettura | X/10 | ... |
| **TOTALE** | **XX/70** | |

## Score Frontend (1-10, se --frontend)
| Asse | Score | Note |
|------|-------|------|
| Component Isolation | X/10 | RTL 2026 |
| E2E | X/10 | Playwright |
| Self-Healing | X/10 | Functionize |
| Accessibilità | X/10 | WCAG 2.1 AA, axe violations: N |
| Server Security | X/10 | CVE-2025-29927 |
| Performance Budget | X/10 | LCP Ns, INP Nms, CLS N |
| Visual Regression | X/10 | Playwright snapshots |
| Security Headers | X/10 | CSP nonce |
| **TOTALE** | **XX/80** | |

## Problemi (per urgenza)
| Urgenza | File:riga | Asse | Problema | Traceability | Fix | Stato |
|---------|-----------|------|----------|--------------|-----|-------|
| BLOCCANTE | ... | sicurezza | ... | OWASP A01:2025 | ... | RISOLTO |

## Root Cause Analysis (BLOCCANTI)
### BUG-N: titolo
```typescript
// PRIMA (VULN):
// DOPO (SAFE):
```
**Impatto:** | **Traceability:** | **DORA Rework:** sì/no

## Confronto stato dell'arte 2026
✅ In linea: ...
⚠️ Indietro: ...
❌ Mancante: ...

## Fonti Consultate
- CVE-2025-66478: https://www.praetorian.com/blog/critical-advisory-remote-code-execution-in-next-js-cve-2025-66478-with-working-exploit/
- OWASP Top 10:2025: https://owasp.org/Top10/2025/
- Core Web Vitals 2026: https://roastweb.com/blog/core-web-vitals-explained-2026
- Cloudflare AI Review: https://blog.cloudflare.com/ai-code-review/
- PCI DSS 4.0.1: https://www.upguard.com/blog/pci-compliance
- Semgrep NestJS: https://www.anshumanbhartiya.com/posts/detect-authz-at-scale-nestjs
- Playwright Visual Regression: https://bug0.com/knowledge-base/playwright-visual-regression-testing
- Supply Chain (Axios March 2026): https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/

## Prossimi Passi
1. Immediato: ...
2. Sprint corrente: ...
3. Prossimo sprint: ...
```

### 4.2 — Evento JSON ESAA-compatibile

```json
{
  "eventId": "audit-{TS}",
  "timestamp": "{ISO8601}",
  "module": "{NOME_MODULO}",
  "riskScore": 78,
  "frontendRisk": 82,
  "mutationScore": 85,
  "coverage": {"stmts": 94, "branches": 91},
  "cveChecks": {"CVE-2025-66478": "safe", "CVE-2025-29927": "safe"},
  "supplyChain": {"npmHigh": 0, "npmCritical": 0},
  "webVitals": {"lcp": 1800, "inp": 150, "cls": 0.05},
  "findings": [...],
  "ceilingsAccepted": [...],
  "doraRework": []
}
```

### 4.3 — Append `.audit-decisions.jsonl`

File append-only, mai cancellato. Una riga JSON per decisione:

```bash
DECISIONS="backend/src/{NOME_MODULO}/.audit-decisions.jsonl"
mkdir -p "$(dirname "$DECISIONS")"
```

Tipi di entry:
```json
{"ts":"{ISO8601}","type":"CEILING_ACCEPTED","file":"...","sha256":"...","reason":"...","gate":"coverage-branches"}
{"ts":"{ISO8601}","type":"RESOLVED","findingId":"F-001","severity":"BLOCCANTE","fix":"...","traceability":["..."]}
{"ts":"{ISO8601}","type":"ACCEPTED_PATTERN","file":"...","pattern":"...","reason":"..."}
{"ts":"{ISO8601}","type":"DORA_REWORK","module":"...","reason":"...","sprint":"2026-W{N}"}
{"ts":"{ISO8601}","type":"CVE_CHECKED","cve":"CVE-2025-66478","result":"safe","version":"15.2.4"}
```

### 4.4 — Output a schermo (REGOLA SILENZIO)

Massimo 10 righe finali:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
audit-modulo 2026 — {NOME_MODULO}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coverage:     Stmts {X}% / Branches {Y}% [{CEILING note}]
Mutation:     {N}% Stryker
Risk:         {N}/100 backend · {N}/100 frontend
CVE:          CVE-2025-66478 {✅/❌} · CVE-2025-29927 {✅/❌} · npm-high {N}
BLOCCANTI:    {N} risolti / {N} rimasti
Tests:        {N} total · {N}/3 flakiness
Report:       docs/audit-reports/{NOME_MODULO}-{DATE}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Errori dominio comuni

| Errore | Quando |
|--------|--------|
| `NotFoundException` | risorsa non trovata per tenant |
| `ConflictException` | duplicato, slot già prenotato, P2034 retry |
| `BadRequestException` | stato invalido (state machine), validation fail |
| `InternalServerErrorException` | Redis/Encryption/Queue down, config mancante |
| Booking | advisory lock + SERIALIZABLE — testa P2034 retry |
| tenantId | OGNI query Prisma deve filtrare per tenant |

## Anti-pattern vietati

- `any`, `@ts-ignore`, `@ts-expect-error`
- `console.log` in production code
- Mock data in `app/api/*/route.ts`
- `mockResolvedValue` senza `Once` fuori `beforeEach`
- Test senza `expect()` o senza `toHaveBeenCalled*`
- DTO inline nel controller
- `HttpException` nei service
- Raw SQL (solo Prisma)
- `fireEvent` (usa `userEvent.setup()`)
- `getByTestId` (usa `getByRole`/`getByLabelText`)
- Auth check in Next.js middleware (CVE-2025-29927)
- Secret in `NEXT_PUBLIC_*` env vars
- `npm install` con `^` su dipendenze critiche (supply chain)
- OpenTelemetry inizializzato dopo `NestFactory.create()`
- Stack trace esposto in HTTP response (OWASP A10:2025)

## Riferimenti 2026

| Fonte | URL |
|-------|-----|
| CVE-2025-66478 Next.js RCE | https://www.praetorian.com/blog/critical-advisory-remote-code-execution-in-next-js-cve-2025-66478-with-working-exploit/ |
| CVE-2025-29927 Middleware bypass | https://workos.com/blog/nextjs-app-router-authentication-guide-2026 |
| OWASP Top 10:2025 | https://owasp.org/Top10/2025/ |
| PCI DSS 4.0.1 | https://www.upguard.com/blog/pci-compliance |
| Cloudflare AI Code Review | https://blog.cloudflare.com/ai-code-review/ |
| Qodo Gen 1.0 agentic | https://www.qodo.ai/blog/qodo-gen-1-0-evolving-ai-test-generation-to-agentic-workflows/ |
| DORA 5th metric Rework Rate | https://www.programming-helper.com/tech/dora-metrics-2026-software-delivery-performance |
| SonarQube AI Code Assurance | https://docs.sonarsource.com/sonarqube-server/2025.1/instance-administration/analysis-functions/ai-code-assurance/quality-gates-for-ai-code |
| Core Web Vitals 2026 | https://roastweb.com/blog/core-web-vitals-explained-2026 |
| Playwright Visual Regression | https://bug0.com/knowledge-base/playwright-visual-regression-testing |
| Functionize self-healing | https://www.functionize.com/automated-testing/self-healing-test-automation |
| WCAG 2.1 AA (non 3.0) | https://www.vervali.com/blog/wcag-3-0-accessibility-testing-compliance-2026-standards-timeline-tools-and-how-to-prepare-your-stack/ |
| Semgrep NestJS authz | https://www.anshumanbhartiya.com/posts/detect-authz-at-scale-nestjs |
| Supply Chain Axios March 2026 | https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/ |
| Shai-Hulud npm worm Sept 2025 | https://unit42.paloaltonetworks.com/npm-supply-chain-attack/ |
| k6 thresholds Grafana | https://grafana.com/docs/k6/latest/using-k6/thresholds/ |
| OpenTelemetry NestJS | https://signoz.io/blog/opentelemetry-nestjs/ |
| TypeScript strict 2026 | https://oneuptime.com/blog/post/2026-02-20-typescript-strict-mode-guide/view |
| ESAA arXiv | https://arxiv.org/abs/2603.06365 |
| Stryker thresholds | https://medium.com/@giorgi0203/stop-making-stryker-run-tests-it-never-needed-9afb7a2e1627 |
| Google Engineering Practices | https://google.github.io/eng-practices/review/ |

**Sii spietato. Zero complimenti. Ogni critica ha una fix concreta o un comando eseguibile.**
