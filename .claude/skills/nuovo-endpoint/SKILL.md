---
name: nuovo-endpoint
description: Crea un nuovo endpoint API backend NestJS. Usa quando chiesto di aggiungere endpoint, route, controller, o "crea API per X".
allowed-tools: [Read, Write, Grep, Glob, "Bash(npx jest *)", "Bash(npx tsc *)", "Bash(curl *)", "Bash(npm run lint*)"]
---

# Nuovo Endpoint — Checklist OBBLIGATORIA (tutti i punti, nell'ordine)

## 1. Test RED
- File: `backend/src/<modulo>/controllers/<modulo>.controller.spec.ts`
- Mock con `mockDeep<NomeService>()`
- Arrange/Act/Assert
- `npx jest --testPathPattern=<modulo>.controller` → DEVE fallire

## 2. DTO
- File: `backend/src/<modulo>/dto/<nome>.dto.ts`
- `@ApiProperty({ description: '...' })` su OGNI campo (descrizione in italiano)
- `class-validator`: `@IsString()`, `@IsUUID()`, `@IsOptional()`, ecc.
- ResponseDto separato

## 3. Zod schema (se regole business)
- File: `backend/src/<modulo>/schemas/<nome>.schema.ts`
- Sincronizzato col DTO

## 4. Service
- File: `backend/src/<modulo>/services/<modulo>.service.ts`
- `tenantId` in OGNI query Prisma
- Domain exceptions: `NotFoundException`, `ConflictException`, `BadRequestException`
- Return type esplicito

## 5. Controller
- `@UseGuards(JwtAuthGuard)`, `@TenantId()`, `@CurrentUser()`
- `@ApiTags()`, `@ApiBearerAuth('JWT-auth')`
- `@HttpCode()` appropriato

## 6. Route frontend
- File: `frontend/app/api/<modulo>/route.ts`
- SOLO proxy al backend reale. ZERO mock data.

## 7. Test GREEN
- `npx jest --testPathPattern=<modulo>.controller` → DEVE passare

## 8. Curl test
```bash
curl -s http://localhost:3000/v1/<endpoint> -H "Authorization: Bearer $TOKEN" | head -50
# DEVE essere 200/201
```
