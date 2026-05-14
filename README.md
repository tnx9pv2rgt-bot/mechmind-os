# MechMind OS — Nexo Gestionale

ERP multi-tenant SaaS per officine meccaniche italiane. FatturaPA, RENTRI,
prenotazioni online, CRM, fleet management.

## Stack

| Layer    | Tecnologia                                                   |
| -------- | ------------------------------------------------------------ |
| Backend  | NestJS 11 + Prisma + PostgreSQL 15 + Redis 7 + BullMQ        |
| Frontend | Next.js 16 App Router + Tailwind + Radix UI                  |
| Auth     | JWT + MFA + Passkey (WebAuthn)                               |
| Infra    | Docker Compose (locale), Vercel (frontend), Render (backend) |

## Quick Start (sviluppo locale)

```bash
# 1. Clona e installa
git clone <repo>
cp .env.example .env  # configura le variabili obbligatorie
docker compose up -d postgres redis

# 2. Backend
cd backend && npm ci
npx prisma migrate dev
npm run start:dev   # :3002

# 3. Frontend
cd frontend && npm ci
npm run dev         # :3000
```

## Struttura

```
backend/   NestJS API (porta 3002)
frontend/  Next.js App (porta 3000)
docs/      Documentazione tecnica e compliance
prisma/    Schema database + migration
```

## Comandi

```bash
# Test
cd backend && npx jest --coverage --forceExit
cd frontend && npx playwright test

# Qualità
cd backend && npx tsc --noEmit && npm run lint
npm audit

# Deploy
# Frontend: Vercel (automatico su push main)
# Backend: Render (render.yaml nella root)
```

## Compliance

✅ GDPR (Art. 28, DSR endpoints, DPA template) ✅ FatturaPA/SDI (XML
generazione, in sviluppo: trasmissione) ✅ RENTRI 2026 (in sviluppo:
integrazione API Agenzia Entrate) ✅ EU AI Act (Limited Risk disclosure)

## Documentazione

Vedi [docs/README.md](docs/README.md) per l'indice completo (101 file).

## Licenza

Proprietaria — MechMind Srl. Tutti i diritti riservati.
