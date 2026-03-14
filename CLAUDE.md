# MechMind OS v10

See @backend/package.json for dependencies. See @backend/prisma/schema.prisma for DB models.

## ⚠️ CHECKLIST — Prima di OGNI modifica:
1. **Cosa fai?** (una frase in italiano)
2. **Quali file tocchi?**
3. **Cosa rischi di rompere?**
4. **C'è un modo più sicuro?**
5. **Rollback plan?**
6. **Hai letto i file coinvolti?**

## REGOLE INVIOLABILI

### Multi-Tenancy — CRITICAL
- JWT payload: `userId:tenantId`. `TenantContextMiddleware` imposta `app.current_tenant` su PostgreSQL
- RLS isola i dati tra tenant — **NEVER query senza contesto tenant**
- Tutti gli 80 modelli hanno `tenantId` — **NEVER creare un modello senza**

### Sicurezza Dati — CRITICAL
- PII crittografati SOLO tramite `EncryptionService` (AES-256-CBC) — **NEVER crittografare manualmente**
- Campi: `encryptedPhone`, `encryptedEmail`, nome/cognome + hash per ricerca
- **NEVER leggere/scrivere `.env`**
- Secret obbligatori: `JWT_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL`

### Database
- Tutte le tabelle: `tenantId`, `createdAt`, `updatedAt`
- Soft delete con `deletedAt DateTime?` per dati personali
- Transazioni per mutazioni multi-modello

### DOPO OGNI SESSIONE CHE RIMUOVE FILE, PACCHETTI O PROVIDER

Esegui SEMPRE questi 5 step nell'ordine esatto prima di dichiarare
la sessione completata:

1. `rm -rf .next`          → pulisce cache webpack (evita runtime crash)
2. `npm run lint`          → rileva import rotti verso file eliminati
3. `npx tsc --noEmit`      → rileva errori TypeScript
4. `npm run build`         → build pulita da zero
5. `npm run dev` + apri browser → zero errori runtime in console

Se uno dei 5 step fallisce: non dichiarare la sessione completata.
Risolvi prima di andare avanti.

MOTIVO: la cache `.next` contiene riferimenti ai moduli eliminati.
TypeScript non la vede, ma il browser crasha con:
`TypeError: undefined is not an object (evaluating 'originalFactory.call')`

## Architettura Backend (14 moduli attivi)

```
CommonModule (@Global) — PrismaService, EncryptionService, RedisService, QueueService, LoggerService, S3Service, AdvisoryLockService
```

Dipendenze critiche:
- **AuthModule** → CommonModule, NotificationsModule (JWT, MFA, Passkey, OAuth, Magic Link)
- **BookingModule** → CommonModule, CustomerModule (advisory lock + SERIALIZABLE)
- **GdprModule** → CommonModule, CustomerModule, ScheduleModule (BullMQ: gdpr-deletion, gdpr-retention, gdpr-export)
- **SubscriptionModule** → CommonModule, AuthModule (FeatureGuard, LimitGuard, Stripe)
- **NotificationsModule** → ConfigModule, BullModule (email-queue, notification-queue)
- **IotModule** → CommonModule, AuthModule, NotificationsModule, RedisModule
- **VoiceModule** → CommonModule, CustomerModule, BookingModule
- CustomerModule, DviModule, ObdModule, PartsModule, AnalyticsModule, AdminModule → CommonModule

## ⚠️ Punti Fragili

1. **CommonModule** — PrismaService o EncryptionService down = tutto il backend crolla
2. **RLS Policies** — Errore = data leak tra tenant. Verificare SEMPRE dopo modifiche schema
3. **ENCRYPTION_KEY** — Se cambia, tutti i PII crittografati diventano illeggibili. Zero key rotation
4. **Redis** — SPOF: BullMQ, cache, pub/sub, rate limiting tutti dipendono da Redis
5. **Booking concurrency** — Advisory lock + SERIALIZABLE: toccare = rischio deadlock
6. **`mechmind-os/`** — Mirror del progetto. **NEVER modificare**

## Compact Instructions
Preserve: test output, code changes, file paths, architectural decisions, current task context, error messages, checklist answers.

IMPORTANT: NEVER query senza contesto tenant. NEVER PII senza EncryptionService.
