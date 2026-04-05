# MechMind OS v10 — Project Overview

**Ultimo aggiornamento numeri:** 2026-04-04
**Fonte:** audit automatico codebase (`grep`, `find`, `wc`, `npx jest`)

## Cos'e'

SaaS multi-tenant per officine meccaniche italiane.
Gestisce: clienti, veicoli, prenotazioni, ispezioni DVI, ordini di lavoro,
fatturazione elettronica SDI, ricambi, garanzie, IoT OBD, analitiche, GDPR compliance.

## Stack

| Layer | Tecnologia |
|-------|------------|
| Backend | NestJS 10 + Prisma 5.22 + PostgreSQL 15 + Redis 7 (BullMQ) |
| Frontend | Next.js 14 (App Router) + TailwindCSS + Radix UI (shadcn) |
| Auth | JWT RS256 + MFA TOTP + Passkey WebAuthn + OAuth + Magic Link |
| Payments | Stripe (subscription + Text-to-Pay) |
| Notifications | Resend (email) + Twilio (SMS) + BullMQ (queue) |

## Numeri Codebase

| Area | Conteggio |
|------|-----------|
| Modelli Prisma | 110 |
| Indici Prisma (@@index/@@unique/@unique) | 373 |
| Schema lines | 4062 |
| Moduli NestJS | 46 |
| Controller | 73 |
| Service | 102 |
| DTO | 69 |
| Endpoint (decorator count) | 519 |
| Guards | 8 |
| Interceptors | 4 |
| Middleware | 3 |
| Gateways (WebSocket) | 3 |
| File di test | 235 |
| Pagine frontend | 137 |
| Componenti React | 270 |
| Route API proxy | 303 |
| Skills Claude | 18 |
| Docs (.md) | 55 |

## Target Users

- **Owner/Manager**: gestione completa officina, analitiche, subscription, marketing
- **Tecnici**: ordini di lavoro, ispezioni DVI, diagnostica OBD, produzione
- **Clienti (portal)**: prenotazioni, storico, documenti, garanzie, preventivi

## Business Model

SaaS subscription via Stripe: Starter (29 EUR/mese) → Pro (79 EUR/mese) → Enterprise.
Feature gates + limit guards per piano. Trial 14 giorni senza carta.

## Stato QA (2026-04-04)

- Test backend: 220 suite, 4797 test (4797 passed, 0 failed)
- TypeScript errori: 0 (backend + frontend)
- ESLint errori: 0

## Deploy

| Componente | Piattaforma |
|------------|-------------|
| Backend | porta 3002 (dev) |
| Frontend | porta 3000 (dev) |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| CI/CD | GitHub Actions |
