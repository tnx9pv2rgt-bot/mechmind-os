---
name: regole-api
description: Standard per API REST: naming, formati, errori.
allowed-tools: [Read, Grep]
user-invocable: false
paths: ["backend/src/**/*.controller.ts", "backend/src/**/*.dto.ts"]
---

# API Conventions — MechMind OS

## Controller
- `@ApiTags('<plurale-kebab>')` su ogni controller
- `@ApiBearerAuth('JWT-auth')` su ogni controller
- `@UseGuards(JwtAuthGuard)` su ogni controller (o singolo metodo)
- `@TenantId()` su OGNI metodo che accede a dati tenant
- `@HttpCode()` esplicito: POST=201, DELETE=204, altri=200

## DTO
- `@ApiProperty({ description: '...' })` su OGNI campo
- `class-validator` decorators: `@IsString()`, `@IsUUID()`, `@IsOptional()`, etc.
- CreateDto e UpdateDto separati (UpdateDto = PartialType(CreateDto))
- ResponseDto per risposte strutturate

## Formato risposte
- Liste: `{ data: T[], meta: { total, page, limit, totalPages } }`
- Singolo: oggetto diretto `T`
- Errore: `{ statusCode, message, error }`
- Creazione: 201 + oggetto creato
- Eliminazione: 204 + no body

## Naming
- Route: plurale kebab-case → `/v1/work-orders`
- Metodi service: `findAll`, `findOne`, `create`, `update`, `remove`
- Azioni custom: verbo → `/v1/bookings/:id/confirm`
- Filtri: query params → `?page=1&limit=20&status=ACTIVE&search=foo`

## Autenticazione
- JWT Bearer token in header `Authorization: Bearer <token>`
- Token contiene: `{ sub: userId, tenantId, roles }`
- Estratto via `@TenantId()` e `@CurrentUser()`

## Versionamento
- Prefisso `/v1/` su tutte le route
- Nuove versioni: `/v2/` con deprecation su `/v1/`

Vedi `examples/` per codice corretto vs sbagliato.
