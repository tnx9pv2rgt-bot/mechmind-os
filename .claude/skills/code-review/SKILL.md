---
name: code-review
description: Review codice per qualità, sicurezza e convenzioni MechMind. Usa quando chiesto review, code review, o PR review.
allowed-tools: [Read, Grep, Glob, "Bash(git diff *)", "Bash(grep *)", "Bash(cat *)", "Bash(bash .claude/skills/code-review/scripts/*)"]
---

# Code Review — Workflow

## Step 1: Audit automatico
```bash
bash .claude/skills/code-review/scripts/review.sh
```

## Step 2: Review manuale

### Sicurezza
- [ ] `tenantId` in ogni query Prisma
- [ ] Webhook con verifica firma
- [ ] PII cifrati con EncryptionService
- [ ] Nessun secret hardcoded
- [ ] JWT con `jti`

### Qualità codice
- [ ] No `any`, no `@ts-ignore`
- [ ] Return type espliciti su funzioni pubbliche
- [ ] Domain exceptions (no HttpException nei service)
- [ ] Nessun `console.log` (usa Logger)
- [ ] Nessun TODO lasciato

### Convenzioni
- [ ] File: `kebab-case`, Classi: `PascalCase`, Metodi: `camelCase`
- [ ] Controller: DTO con `@ApiProperty`, `@ApiTags`, `@ApiBearerAuth`
- [ ] Test: Arrange/Act/Assert, mock PrismaService

### Frontend
- [ ] Testi in italiano
- [ ] Dark mode (`dark:` classes)
- [ ] Toast dopo CRUD (sonner)
- [ ] ConfirmDialog su eliminazioni (Radix AlertDialog)
- [ ] Loading/error/empty states
- [ ] ZERO mock data

## Step 3: Report
Stampa report finale:
- **BLOCCANTI** — Devono essere fixati prima del merge
- **WARNING** — Miglioramenti consigliati
- **OK** — Check superati

Vedi `examples/bad-vs-good.md` per pattern corretti vs sbagliati.
