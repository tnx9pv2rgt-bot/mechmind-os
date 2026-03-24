#!/bin/bash
# MechMind OS - Database Backup Script
# Usage: ./scripts/backup-db.sh [daily|manual]
# Requires: DATABASE_URL, S3_BACKUP_BUCKET environment variables
# Optional: BACKUP_RETENTION_DAYS (default: 30), BACKUP_DIR (default: ./backups)

set -euo pipefail

BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mechmind_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is required"
  exit 1
fi

echo "[$(date -Iseconds)] Starting ${BACKUP_TYPE} backup..."

# ============== STEP 1: pg_dump + gzip ==============

# Detect if running in Docker or use local pg_dump
if command -v docker &> /dev/null && docker ps --filter "name=mechmind-postgres" --format '{{.Names}}' | grep -q mechmind-postgres; then
  docker exec mechmind-postgres pg_dump -U "${PGUSER:-postgres}" "${PGDATABASE:-mechmind}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip -9 > "${BACKUP_FILE}"
else
  pg_dump "${DATABASE_URL}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    2>/dev/null \
    | gzip -9 > "${BACKUP_FILE}"
fi

# Verify backup was created and is not empty
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file is empty or was not created"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ============== STEP 2: Upload to S3 ==============

if [ -n "${S3_BUCKET}" ]; then
  S3_KEY="backups/mechmind_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

  if ! command -v aws &> /dev/null; then
    echo "WARNING: aws CLI not found, skipping S3 upload"
  else
    echo "[$(date -Iseconds)] Uploading to s3://${S3_BUCKET}/${S3_KEY}..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" \
      --storage-class STANDARD_IA \
      --quiet
    echo "[$(date -Iseconds)] S3 upload complete"
  fi
else
  echo "[$(date -Iseconds)] S3_BACKUP_BUCKET not set, skipping S3 upload"
fi

# ============== STEP 3: 30-day cleanup ==============

# Cleanup local backups older than retention period
if [ "${BACKUP_TYPE}" = "daily" ]; then
  DELETED=$(find "${BACKUP_DIR}" -name "mechmind_daily_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
  if [ "${DELETED}" -gt 0 ]; then
    echo "[$(date -Iseconds)] Cleaned up ${DELETED} local backups older than ${RETENTION_DAYS} days"
  fi
fi

# Cleanup S3 backups older than retention period
if [ -n "${S3_BUCKET}" ] && command -v aws &> /dev/null && [ "${BACKUP_TYPE}" = "daily" ]; then
  CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)
  echo "[$(date -Iseconds)] Cleaning up S3 backups older than ${CUTOFF_DATE}..."
  aws s3 ls "s3://${S3_BUCKET}/backups/mechmind_daily_" \
    | while read -r line; do
        FILE_DATE=$(echo "${line}" | awk '{print $1}')
        FILE_NAME=$(echo "${line}" | awk '{print $4}')
        if [[ "${FILE_DATE}" < "${CUTOFF_DATE}" ]] && [ -n "${FILE_NAME}" ]; then
          aws s3 rm "s3://${S3_BUCKET}/backups/${FILE_NAME}" --quiet
          echo "[$(date -Iseconds)] Deleted s3://${S3_BUCKET}/backups/${FILE_NAME}"
        fi
      done
fi

echo "[$(date -Iseconds)] Backup complete"
echo "Current local backups:"
ls -lh "${BACKUP_DIR}"/mechmind_*.sql.gz 2>/dev/null | tail -5
