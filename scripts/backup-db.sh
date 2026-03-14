#!/bin/bash
# MechMind OS - Database Backup Script
# Usage: ./scripts/backup-db.sh [daily|manual]
# Requires: BACKUP_DIR, DATABASE_URL environment variables

set -euo pipefail

BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mechmind_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is required"
  exit 1
fi

echo "🔄 Starting ${BACKUP_TYPE} backup..."

# Detect if running in Docker or use local pg_dump
if command -v docker &> /dev/null && docker ps --filter "name=mechmind-postgres" --format '{{.Names}}' | grep -q mechmind-postgres; then
  # Use pg_dump from the Docker container (matches server version)
  docker exec mechmind-postgres pg_dump -U "${PGUSER:-postgres}" "${PGDATABASE:-mechmind}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip -9 > "${BACKUP_FILE}"
else
  # Use local pg_dump (ensure version matches server)
  pg_dump "${DATABASE_URL}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    2>/dev/null \
    | gzip -9 > "${BACKUP_FILE}"
fi

# Verify backup was created and is not empty
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "❌ Backup file is empty or was not created"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Cleanup old backups
if [ "${BACKUP_TYPE}" = "daily" ]; then
  DELETED=$(find "${BACKUP_DIR}" -name "mechmind_daily_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
  if [ "${DELETED}" -gt 0 ]; then
    echo "🗑️  Cleaned up ${DELETED} backups older than ${RETENTION_DAYS} days"
  fi
fi

echo "📊 Current backups:"
ls -lh "${BACKUP_DIR}"/mechmind_*.sql.gz 2>/dev/null | tail -5
