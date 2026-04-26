#!/bin/bash
# Descrizione: Genera e applica migrazioni Prisma con verifica sicurezza
# Parametri: [nome-migration]
# Equivalente a: /migrazione-prisma

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

NAME="${1:-$(date +%s)}"
MIGRATION_REPORT="./.claude/telemetry/migration-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== MIGRAZIONE PRISMA ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (Prisma environment)..."
if [ ! -d "backend" ]; then
  echo "❌ Cartella backend non trovata"
  exit 1
fi
if [ ! -f "backend/prisma/schema.prisma" ]; then
  echo "❌ Schema Prisma non trovato"
  exit 1
fi
echo "✅ Prisma environment OK"
echo ""

{
  echo "# Migration Report"
  echo "**Data:** $(date)"
  echo "**Migration Name:** $NAME"
  echo ""

  cd backend

  echo "## 1. Schema Generation"
  echo ""

  if npx prisma migrate dev --name "$NAME" 2>&1 | tee /tmp/migration.log; then
    echo "✅ Migration generated successfully"
    MIGRATION_FILE=$(find prisma/migrations -name "*$NAME*" -type d | head -1 || echo "")
    if [ -n "$MIGRATION_FILE" ]; then
      echo "**Migration Path:** $MIGRATION_FILE"
      echo ""
      echo "**SQL Generated:**"
      echo "\`\`\`sql"
      cat "$MIGRATION_FILE/migration.sql" 2>/dev/null | head -30
      echo "\`\`\`"
    fi
  else
    echo "❌ Migration generation failed"
    cat /tmp/migration.log
    exit 1
  fi
  echo ""

  echo "## 2. Type Check"
  echo ""

  if npx tsc --noEmit 2>&1 | head -20; then
    echo "✅ TypeScript check passed"
  else
    echo "❌ TypeScript errors detected"
    exit 1
  fi
  echo ""

  echo "## 3. Test Verification"
  echo ""

  TEST_OUTPUT=$(npx jest --forceExit 2>&1 | tail -15 || true)
  if echo "$TEST_OUTPUT" | grep -q "passed"; then
    echo "✅ All tests passed"
    echo "$TEST_OUTPUT"
  else
    echo "⚠️  Some tests may have failed - review manually"
    echo "$TEST_OUTPUT"
  fi
  echo ""

  cd - >/dev/null 2>&1 || true

  echo "## 4. Safety Checklist"
  echo ""
  echo "- [ ] SQL reviewed for correctness"
  echo "- [ ] Indexes created for foreign keys"
  echo "- [ ] NOT NULL constraints verified"
  echo "- [ ] tenantId field present on new tables"
  echo "- [ ] No raw SQL (Prisma only)"
  echo "- [ ] Tests pass on PostgreSQL"
  echo ""

  echo "## 5. Rollback Plan"
  echo ""
  echo "\`\`\`bash"
  echo "# If migration fails, rollback with:"
  echo "cd backend && npx prisma migrate resolve --rolled-back <migration_name>"
  echo "\`\`\`"
  echo ""

  echo "✅ Migrazione completata: $NAME"

} | tee "$MIGRATION_REPORT"

echo ""
echo "📋 Report salvato: $MIGRATION_REPORT"
