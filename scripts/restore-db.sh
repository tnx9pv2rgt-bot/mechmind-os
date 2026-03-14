#!/bin/bash
# MechMind OS - Database Restore Script
# Usage: ./scripts/restore-db.sh <backup_file>
# Requires: DATABASE_URL environment variable

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/restore-db.sh <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh backups/mechmind_*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is required"
  exit 1
fi

echo "⚠️  WARNING: This will overwrite the current database!"
echo "Backup file: ${BACKUP_FILE}"
read -p "Continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "🔄 Restoring database from ${BACKUP_FILE}..."

gunzip -c "${BACKUP_FILE}" | pg_restore \
  --dbname="${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  2>/dev/null

echo "✅ Database restored successfully"
echo "🔄 Running prisma migrate deploy to ensure schema is current..."

cd "$(dirname "$0")/../backend"
npx prisma migrate deploy

echo "✅ Restore complete"
