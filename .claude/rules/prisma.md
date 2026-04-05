---
globs:
  - "backend/prisma/**/*"
  - "database/**/*"
---
# Prisma & Database Rules

## Schema
- Location: `backend/prisma/schema.prisma`
- EVERY table must have `tenantId String` field
- Use `@default(uuid())` for IDs
- Add `createdAt`, `updatedAt` to all models
- Soft deletes: `deletedAt DateTime?` where needed

## Migrations
- Generate: `cd backend && npx prisma migrate dev --name <name>`
- NEVER use `prisma migrate reset` without confirmation
- Review generated SQL before applying
- Migrations in `backend/database/migrations/`

## Queries
- Always filter by `tenantId`
- Use `include` sparingly (N+1 risk)
- Use `select` for read-heavy queries
- Transactions for multi-model mutations
