---
globs:
  - "backend/**/*.ts"
---
# Backend Rules (NestJS)

## Module Pattern
- Every module: controller + service + dto/ + *.spec.ts
- Controllers: only DTOs (class-validator), delegate to services
- Services: business logic, throw domain exceptions (never HttpException)
- Use `@TenantId()` on all tenant-scoped endpoints

## Testing
- Write failing test FIRST, then implement
- Mock PrismaService and external services
- Test file next to source: `foo.service.spec.ts`
- Run: `cd backend && npm run test -- --testPathPattern=<module>`

## Database
- Prisma only. Schema at `backend/prisma/schema.prisma`
- Always include `tenantId` in queries
- Use transactions for multi-step mutations
- Advisory locks for booking operations

## Security
- PII: use EncryptionService (AES-256-CBC)
- Auth: JwtAuthGuard + RolesGuard
- GDPR: soft deletes, audit logs on mutations
- Never log PII or tokens
