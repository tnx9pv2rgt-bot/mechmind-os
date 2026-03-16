# MechMind OS — Dependency Map (Runtime Caller Graph)

## PrismaService (CommonModule — @Global)

### setTenantContext(tenantId) / clearTenantContext()
```
TenantContextMiddleware.use()          ← OGNI request autenticata
  → setTenantContext() su request start
  → clearTenantContext() su res.on('finish')
```

### withTenant(tenantId, callback)
```
GdprDeletionProcessor.process()        ← BullMQ job: aggiorna dataSubjectRequest
GdprExportProcessor.process()          ← BullMQ job: export dati cliente
BookingService.createBooking()         ← quando serve cambio contesto esplicito
CustomerService.searchByPhone()        ← ricerca cross-context (admin)
```

### withSerializableTransaction(callback)
```
BookingService.reserveSlot()           ← UNICO caller. SERIALIZABLE + retry 3x
```

### acquireAdvisoryLock(tenantId, resourceId) / releaseAdvisoryLock()
```
BookingService.reserveSlot()           ← lock sullo slotId prima della transazione
BookingService.createBooking()         ← lock su customerId + slotId
```

### $queryRaw (eccezioni raw SQL)
```
PrismaService.setTenantContext()       ← SET app.current_tenant (RLS)
PrismaService.clearTenantContext()     ← SET app.current_tenant = '' (RLS)
PrismaService.acquireAdvisoryLock()    ← pg_try_advisory_lock
PrismaService.releaseAdvisoryLock()    ← pg_advisory_unlock
HealthController.checkDatabase()       ← SELECT 1 (health check)
```

---

## EncryptionService (CommonModule — @Global)

### encrypt(data) / decrypt(encryptedData)
```
CustomerService.create()               ← encrypt phone, email, firstName, lastName
CustomerService.update()               ← encrypt campi modificati
CustomerService.findById()             ← decrypt per response
CustomerService.findAll()              ← decrypt per ogni record nella lista
GdprExportProcessor.process()          ← decrypt per export ZIP
GdprDeletionProcessor.anonymize()      ← decrypt → anonimizza → re-encrypt con dati fittizi
AuthService.register()                 ← encrypt email utente (se applicabile)
VoiceService.processCall()             ← decrypt telefono per matching chiamata
```

### hash(data) / verifyHash(data, hash)
```
CustomerService.create()               ← genera phoneHash, emailHash per ricerca
CustomerService.searchByPhone()        ← hash input → match con phoneHash
CustomerService.searchByEmail()        ← hash input → match con emailHash
CustomerService.checkDuplicate()       ← verifica esistenza prima di create
```

### encryptFields(data, fields) / decryptFields(data, fields)
```
CustomerService.create()               ← shorthand per encrypt multipli campi
CustomerService.update()               ← shorthand per encrypt multipli campi
CustomerService.formatResponse()       ← shorthand per decrypt multipli campi
```

---

## RedisService (CommonModule — @Global)

### get(key) / set(key, value, ttlSeconds?) / del(key)
```
HealthController.checkRedis()          ← set('health:ping','pong',10) + get per verifica
AuthService.storeMfaSession()          ← set('mfa:session:<id>', data, 300)
AuthService.verifyMfaSession()         ← get('mfa:session:<id>')
AuthService.storeRefreshToken()        ← set('refresh:<userId>', token, 604800)
AuthService.revokeRefreshToken()       ← del('refresh:<userId>')
AuthService.storeMagicLink()           ← set('magic:<token>', userId, 600)
AuthService.verifyMagicLink()          ← get('magic:<token>') + del
CacheService.get()                     ← wrapper generico con TTL
CacheService.set()                     ← wrapper generico con TTL
CacheService.invalidate()              ← del con pattern
```

### isAvailable (getter)
```
HealthController.health()              ← determina stato 'ok' vs 'degraded'
QueueService.addJob()                  ← skip se Redis non disponibile
ThrottlerModule                        ← fallback a in-memory se Redis down
```

---

## QueueService / BullMQ Queues

### Queue: gdpr-deletion
```
GdprController.requestDeletion()       ← POST /gdpr/delete → addJob('gdpr-deletion')
GdprDeletionProcessor.process()        ← Worker: snapshot → anonymize → delete recordings → complete
  → PrismaService.withTenant()
  → EncryptionService.decrypt()
  → S3Service.deleteFiles()
```

### Queue: gdpr-export
```
GdprController.requestExport()         ← POST /gdpr/export → addJob('gdpr-export')
GdprExportProcessor.process()          ← Worker: collect data → decrypt PII → generate ZIP → upload S3
```

### Queue: gdpr-retention
```
GdprRetentionScheduler.check()         ← Cron: verifica record oltre retention period → soft delete
```

### Queue: email-queue
```
NotificationService.sendEmail()        ← addJob('email-queue', { to, template, data })
EmailProcessor.process()               ← Worker: Resend API call con React Email template
  Called by:
  → AuthService.sendMagicLink()
  → AuthService.sendMfaSetupEmail()
  → BookingService.sendConfirmation()
  → InspectionService.sendToCustomer()
  → InvoiceService.sendInvoice()
```

### Queue: notification-queue
```
NotificationService.sendPush()         ← addJob('notification-queue', { userId, type, data })
NotificationProcessor.process()        ← Worker: WebSocket push + DB persist
  Called by:
  → BookingService.onStatusChange()
  → WorkOrderService.onStatusChange()
  → InspectionService.onCustomerApproval()
```

---

## AdvisoryLockService (CommonModule — @Global)

Wrapper sottile su PrismaService.acquireAdvisoryLock/releaseAdvisoryLock:

```
BookingService.reserveSlot()           ← lock(tenantId, slotId) → transazione → unlock
BookingService.createBooking()         ← lock(tenantId, compositeKey) → transazione → unlock
```

---

## Regole per modifiche

### Se modifichi PrismaService:
→ Impatto: TUTTO il backend. Verifica che setTenantContext, withTenant, withSerializableTransaction, acquireAdvisoryLock funzionino ancora
→ Test: `npm run test -- --testPathPattern=prisma`
→ Rischio: RLS bypass, deadlock booking, data leak

### Se modifichi EncryptionService:
→ Impatto: CustomerModule, GdprModule, AuthModule, VoiceModule
→ Test: `npm run test -- --testPathPattern=encryption`
→ Rischio: PII illeggibili, GDPR violation
→ NEVER cambiare algoritmo/formato senza migration dei dati esistenti

### Se modifichi RedisService:
→ Impatto: Auth (MFA, refresh token, magic link), Health check, BullMQ, Cache, Rate limiting
→ Test: `npm run test -- --testPathPattern=redis`
→ Rischio: Auth MFA broken, queue processing fermo, rate limiting disabilitato
→ Verifica che graceful degradation (isAvailable=false) funzioni ancora

### Se modifichi TenantContextMiddleware:
→ Impatto: OGNI request autenticata. RLS smette di funzionare se il middleware non setta il contesto
→ Test: `npm run test:security:gdpr` (verifica isolamento tenant)
→ Rischio: DATA LEAK tra tenant — il rischio più grave del sistema
