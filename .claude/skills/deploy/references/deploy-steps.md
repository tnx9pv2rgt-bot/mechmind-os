# Deploy Steps — Per Ambiente

## Development (locale)
```bash
# 1. Avvia infrastruttura
docker compose up -d postgres redis

# 2. Applica migrazioni
cd backend && npx prisma migrate dev

# 3. Seed dati
cd backend && npx prisma db seed

# 4. Avvia backend
cd backend && npm run start:dev

# 5. Avvia frontend
cd frontend && npm run dev
```

## Staging
```bash
# 1. Pre-flight
cd backend && npx tsc --noEmit && npm run lint && npx jest --forceExit
cd frontend && npx tsc --noEmit && npm run build

# 2. Push su branch staging
git push origin staging

# 3. CI/CD automatico (GitHub Actions)
# Verifica: https://github.com/<repo>/actions

# 4. Verifica health
curl -s https://staging-api.mechmind.it/v1/health
```

## Production
```bash
# 1. Pre-flight completo
cd backend && npx tsc --noEmit && npm run lint && npx jest --forceExit
cd frontend && npx tsc --noEmit && npm run build

# 2. Tag release
git tag -a v<version> -m "Release v<version>"
git push origin v<version>

# 3. CI/CD automatico
# Verifica: https://github.com/<repo>/actions

# 4. Verifica health
curl -s https://mechmind-backend.onrender.com/v1/health

# 5. Verifica endpoint critico
curl -s https://mechmind-backend.onrender.com/v1/health | jq .

# 6. Monitora Sentry per 30 minuti
# https://sentry.io/organizations/mechmind/
```

## Rollback
```bash
# Se problemi in produzione:
# 1. Render -> Manual Deploy -> seleziona commit precedente
# 2. Oppure:
git revert HEAD
git push origin <branch>
```

## Variabili ambiente richieste
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
ENCRYPTION_KEY=... (32 bytes hex)
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
CORS_ORIGIN=https://mechmind.it
NODE_ENV=production
```
