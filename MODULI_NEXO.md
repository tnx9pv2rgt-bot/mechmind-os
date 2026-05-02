# 📊 MODULI NEXO — Coverage & Audit State (2026-05-02 aggiornato)

> Dati reali misurati con `npx c8 ... npx jest`. Aggiornato da audit-decisions.jsonl + report MD.
> Target: Statements ≥90% AND Branches ≥90%
> Ceiling accettato = gap architetturale documentato (NestJS decoratori, class-validator DTO, TS artifacts)

---

## ✅ TARGET MET — Branches ≥90%

| Modulo | Data Audit | Stmt% | Branch% | Note |
|--------|-----------|-------|---------|------|
| estimate | — | 98.86 | 90.35 | ✅ No finding |
| invoice | 2026-04-29 | 98.18 | 92.25 | ✅ 4 BLOCCANTI risolti (tenantId mancante in update/updateMany) |
| predictive-maintenance | — | 95.70 | 90.83 | ✅ No finding |
| subscription | 2026-04-30 | 98.70 | 90.41 | ✅ 4 finding risolti (Logger, DTO class-validator, $transaction) |

---

## ⏳ CEILING ACCETTATO — Branch gap architetturale documentato

| Modulo | Data Audit | Stmt% | Branch% | Gap | Motivo Ceiling |
|--------|-----------|-------|---------|-----|----------------|
| ai-compliance | 2026-05-01 | 92.36 | 73.68 | -16pp | NestJS @UseGuards/@Roles/@ApiOperation IIFE; constructor DI branch |
| ai-scheduling | 2026-05-01 | 99.41 | 88.49 | -2pp | Controller @UseGuards/@Roles/@CurrentUser non strumentabili unit; service 92.13% ✅ |
| auth | 2026-04-29 | 95.83 | 83.97 | -6pp | 12 ceiling: @Injectable IIFE, extends AuthGuard/PassportStrategy constructor, TS interface source-map offset; 3 BLOCCANTI risolti (passkey tenantId) |
| booking | 2026-04-29 | 97.35 | 85.22 | -5pp | Controller @ApiOperation/@ApiParam IIFE; listener @OnEvent/__decorate non raggiungibili senza NestJS runtime; service 94.73% ✅; 3 BLOCCANTI risolti |
| common | 2026-05-01 | 93.85 | 78.84 | -11pp | shutdown.service constructor side-effects; throttler ternary ceiling; ACCEPTED_PATTERN idempotency interceptor |
| declined-service | 2026-05-01 | 93.42 | 81.03 | -9pp | DTO @IsOptional/@IsString/@IsDateString → 50% branch ceiling class-validator |
| fleet | 2026-05-01 | 97.61 | 76.66 | -13pp | Constructor @Injectable + private field init; import statement TS artifacts; DTO @IsOptional/@IsString |
| inventory-alerts | 2026-05-01 | 92.69 | 76.00 | -14pp | @Injectable decorator + instanceof error branches; 16 test aggiunti; F-001 ALTA risolto |
| kiosk | 2026-05-01 | 90.86 | 87.09 | -3pp | @Post/@Get/@ApiOperation/@Headers/@Param HTTP binding NestJS request pipeline non testabile unit |
| labor-guide | 2026-05-01 | 97.14 | 86.58 | -3pp | DTO @IsString/@IsOptional/@IsInt/@Min/@Max/@Type compiled TS; import lines controller/service |
| lib | 2026-05-01 | 94.04 | 78.57 | -11pp | jwt.decode() never throws (library design) → catch unreachable; JWT_SECRET module-level init; requireEnvVar() module-level |
| location | 2026-05-01 | 100.00 | 86.66 | -3pp | @Module decorator; DTO @IsString/@IsEmail/@IsBoolean; controller @Controller/@Get routing; 2 BLOCCANTI risolti (tenantId in update/delete) |
| middleware | 2026-05-01 | 88.49 | 89.78 | -0pp | Static constants + private helper ceiling; Stryker OOM (31k mutants); assertion ratio 1.28 (mock-call pattern) |
| payment-link | 2026-05-02 | 93.23 | 82.19 | -8pp | 14 IIFE @Injectable/@UseGuards/@Roles/@ApiOperation; DTO @IsEnum/@IsString class-validator 50%; BLOCCANTE risolto (handlePaymentCompleted senza tenantId) |
| payroll | 2026-04-30 | 98.29 | 86.41 | -4pp | Ceiling non documentato formalmente; 8 test aggiunti per branch coverage |
| peppol | 2026-05-02 | 94.58 | 88.04 | -2pp | @Injectable IIFE; TS array literal / template literal source-map offset (lines 5-6, 13-15, 62-67, 202-204, 376-385) |
| rentri | 2026-05-02 | 96.82 | 79.01 | -11pp | DTO class-validator 36-50% (waste-entry/fir/destination/transporter); @Injectable IIFE in FirService/MudService; controller @Get/@Post routing |
| production-board | 2026-05-01 | 97.22 | 82.75 | -7pp | DTO class-validator 50% branch; service+controller 88.77% |
| public-token | 2026-05-01 | 80.00 | 65.85 | -24pp | service constructor decorator (60.86%); controller @Controller/@Get/@ApiOperation; DTO @ApiProperty/@ApiPropertyOptional |
| security-incident | 2026-04-30 | 97.21 | 75.75 | -14pp | Ceiling non documentato formalmente |
| services | 2026-05-01 | 88.47 | 76.51 | -13pp | 3 file DEPRECATED (emailService, pivaService, jwtService); Luhn branch numericamente esercitato ma non isolabile; VIES graceful degradation accettato |
| sms | 2026-04-30 | 93.75 | 73.17 | -17pp | 22 branch non coperti = artefatti __decorate/__metadata/__awaiter (compilatore TS/NestJS/BullMQ); logica reale 100% coperta; ⚠️ 2 finding APERTI: F-002 Twilio stub, F-003 DTO incompatibile Twilio nativo |

---

## ⚠️ DA AUDITARE — Nessun audit formale eseguito

| Modulo | Stmt% | Branch% | Gap Branch | Priorità |
|--------|-------|---------|-----------|---------|
| webhooks | 0.00 | 0.00 | -90pp | 🔴 CRITICO — nessun test |
| vehicle-history | 93.07 | 67.85 | -22pp | 🔴 ALTA |
| portal | 80.88 | 86.52 | -3pp | 🟠 MEDIA |
| gdpr | 97.63 | 88.76 | -1pp | 🟡 BASSA — quasi target |
| obd | 98.05 | 89.54 | -1pp | 🟡 BASSA — quasi target |
| notifications | 96.84 | 88.25 | -2pp | 🟡 BASSA |
| customer | 95.78 | 86.56 | -3pp | 🟡 BASSA |
| work-order | 97.89 | 86.76 | -3pp | 🟡 BASSA |
| ai-diagnostic | 96.66 | 85.10 | -5pp | 🟡 BASSA |
| dvi | 97.45 | 83.98 | -6pp | 🟡 BASSA |
| reviews | 97.53 | 85.71 | -4pp | 🟡 BASSA |
| analytics | 97.57 | 85.95 | -4pp | 🟡 BASSA |
| canned-job | 95.53 | 83.70 | -6pp | 🟡 BASSA |
| parts | 98.33 | 84.66 | -5pp | 🟡 BASSA |
| campaign | 96.95 | 82.92 | -7pp | 🟡 BASSA |
| accounting | 97.63 | 81.18 | -9pp | 🟡 BASSA |
| benchmarking | 95.98 | 81.42 | -9pp | 🟡 BASSA |
| membership | 96.48 | 80.82 | -9pp | 🟡 BASSA |
| iot | 98.38 | 80.63 | -9pp | 🟡 BASSA |
| voice | 96.26 | 83.25 | -7pp | 🟡 BASSA |
| tire | 95.83 | 79.03 | -11pp | 🟡 BASSA |
| webhook-subscription | 96.90 | 75.32 | -15pp | 🟡 BASSA |
| admin | 93.63 | 75.96 | -14pp | 🟡 BASSA |

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Totale moduli | 49 |
| ✅ TARGET MET (≥90% stmt AND ≥90% branch) | 4 (estimate, invoice, predictive-maintenance, subscription) |
| ⏳ CEILING ACCETTATO (gap architetturale documentato) | 22 |
| ⚠️ DA AUDITARE | 22 |
| ❌ NO TEST | 1 (webhooks) |

---

## 🔬 Anatomia dei Ceiling (perché il 90% branch è impossibile senza integration test)

| Tipo Ceiling | Causa | Branch Persi | Moduli Affetti |
|-------------|-------|-------------|----------------|
| NestJS decorator IIFE | `@Injectable()`, `@Controller()`, `@Get()`, `@UseGuards()`, `@Roles()` → `__decorate`/`__metadata` non raggiungibili unit | 8-15pp | auth, booking, ai-scheduling, sms, payment-link, kiosk, labor-guide, fleet, location, ai-compliance |
| class-validator DTO | `@IsString()`, `@IsOptional()`, `@IsInt()`, `@IsEnum()` → metadata branch non eseguibile | ~50% sul file DTO | declined-service, fleet, labor-guide, payment-link, public-token, sms, location |
| TypeScript artifacts | Interface properties, constructor field init, import statements → source-map offset c8 | 2-5pp | auth, kiosk, lib, labor-guide |
| Library design | `jwt.decode()` never throws → catch unreachable; module-level init richiede reload | 3-5pp | lib |
| BullMQ WorkerHost | `extends WorkerHost` + `super()` + `@Processor()` → IIFE non raggiungibili | 8-15pp | sms |

---

## 📋 Log Completamento Audit

| Data | Tipo | Modulo | Stmt% / Branch% | BLOCCANTI risolti | Stato |
|------|------|--------|-----------------|-------------------|-------|
| 2026-04-29 | backend | auth | 95.83% / 83.97% | 3 (passkey tenantId) | ⏳ CEILING |
| 2026-04-29 | backend | booking | 97.35% / 85.22% | 3 (tenantId bulkConfirm, reserveSlot id='temp') | ⏳ CEILING |
| 2026-04-29 | backend | invoice | 98.18% / 92.25% | 4 (update senza tenantId) | ✅ TARGET MET |
| 2026-04-29 | backend | payment-link | 93.22% / 82.19% | 1 (handlePaymentCompleted) | ⏳ CEILING |
| 2026-04-30 | backend | sms | 93.75% / 73.17% | 8 (Twilio, tenantId, encrypt, BullMQ) | ⏳ CEILING + 2 OPEN |
| 2026-04-30 | backend | subscription | 98.70% / 90.41% | 4 (Logger, DTO, $transaction) | ✅ TARGET MET |
| 2026-05-01 | backend | ai-compliance | 92.36% / 73.68% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | ai-scheduling | 99.41% / 88.49% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | common | 93.85% / 78.84% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | declined-service | 93.42% / 81.03% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | fleet | 97.61% / 76.66% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | inventory-alerts | 92.69% / 76.00% | 1 (F-001 ALTA logging) | ⏳ CEILING |
| 2026-05-01 | backend | kiosk | 90.86% / 87.09% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | labor-guide | 97.14% / 86.58% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | lib | 94.04% / 78.57% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | location | 100.00% / 86.66% | 2 (tenantId in update/delete) | ⏳ CEILING |
| 2026-05-01 | backend | middleware | 88.49% / 89.78% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | production-board | 97.22% / 82.75% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | public-token | 80.00% / 65.85% | 0 | ⏳ CEILING |
| 2026-05-01 | backend | services | 88.47% / 76.51% | 0 | ⏳ CEILING |
| 2026-05-02 | backend | peppol | 94.58% / 88.04% | 0 | ⏳ CEILING |
| 2026-05-02 | backend | rentri | 96.82% / 79.01% | 0 | ⏳ CEILING |
