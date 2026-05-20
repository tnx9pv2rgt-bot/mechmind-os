#!/usr/bin/env bash
# ============================================================================
# ramdisk-wrapper.sh — Esegue test (jest/c8/tsc/stryker) con scratch in RAM
# ============================================================================
#
# Uso:
#   bash .claude/scripts/ramdisk-wrapper.sh "<comando>" "<file1> [file2 ...]"
#
# Esempio:
#   bash .claude/scripts/ramdisk-wrapper.sh \
#     "npx jest src/sms --forceExit --silent" \
#     "src/sms/sms-thread.service.ts src/sms/sms-thread.service.spec.ts"
#
# Logica:
#   1) du -sk dei file target → SIZE_MB
#   2) Se SIZE_MB > 50 MB  → esegue il comando direttamente su SSD (no ramdisk)
#   3) Se SIZE_MB ≤ 50 MB  → crea ramdisk macOS da 50 MB (102400 settori 512B)
#                            → copia i file target preservando il path relativo
#                            → punta TMPDIR + JEST_CACHE_DIR + COVERAGE tmp al ramdisk
#                            → esegue il comando nella project root (per node_modules)
#                            → se exit=0 copia indietro i file modificati nel ramdisk
#                            → se exit≠0 i file originali NON vengono toccati
#                            → smonta sempre il ramdisk via trap EXIT/INT/TERM
#
# NOTA TECNICA:
#   Il comando NON viene eseguito con cwd=ramdisk perché jest/tsc/c8/stryker
#   risolvono node_modules, jest.config.js, tsconfig.json, schema.prisma a
#   partire dalla project root. Il ramdisk è uno scratch space per:
#     - cache di Jest (transform cache, haste map)
#     - output di coverage intermedio (c8/istanbul)
#     - file mutati di Stryker
#     - shadow dei file target che il comando può modificare
#
# Soglia 50 MB: file Nexo tipici (1 modulo backend) = 50-500 KB → sempre ramdisk.
# Operazioni che superano 50 MB (es. coverage globale) → SSD automatico.
# ============================================================================

set -uo pipefail  # niente -e: gestiamo exit code manualmente

CMD="${1:-}"
FILES="${2:-}"

if [ -z "$CMD" ]; then
  echo "❌ ramdisk-wrapper: comando mancante" >&2
  echo "   Uso: bash .claude/scripts/ramdisk-wrapper.sh \"<comando>\" \"<file1> [file2 ...]\"" >&2
  exit 64
fi

THRESHOLD_MB=50
RAMDISK_SECTORS=102400   # 102400 * 512 B = 50 MB
RAMDISK_NAME="NexoRAM"
RAMDISK_VOL="/Volumes/${RAMDISK_NAME}"

# ---------- Calcola dimensione totale dei file target ----------
SIZE_KB=0
if [ -n "$FILES" ]; then
  for f in $FILES; do
    if [ -e "$f" ]; then
      KB=$(du -sk "$f" 2>/dev/null | awk '{print $1}')
      SIZE_KB=$(( SIZE_KB + KB ))
    fi
  done
fi
SIZE_MB=$(( SIZE_KB / 1024 ))

echo "🔍 ramdisk-wrapper: target = ${SIZE_KB} KB (~${SIZE_MB} MB), soglia ${THRESHOLD_MB} MB"

# ---------- Branch SSD (>50 MB) ----------
if [ "$SIZE_MB" -gt "$THRESHOLD_MB" ]; then
  echo "💾 > ${THRESHOLD_MB} MB → SSD diretto: ${CMD}"
  bash -c "$CMD"
  exit $?
fi

# ---------- Branch ramdisk (≤50 MB) ----------
PROJECT_ROOT="$(pwd)"

cleanup() {
  if [ -d "$RAMDISK_VOL" ]; then
    hdiutil detach "$RAMDISK_VOL" -force >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

# Smonta residui di run precedenti (idempotenza)
[ -d "$RAMDISK_VOL" ] && hdiutil detach "$RAMDISK_VOL" -force >/dev/null 2>&1 || true

echo "💿 ≤ ${THRESHOLD_MB} MB → creo ramdisk ${RAMDISK_NAME} (${THRESHOLD_MB} MB)"
RAMDISK_DEV=$(hdiutil attach -nomount "ram://${RAMDISK_SECTORS}" 2>/dev/null | awk '{print $1}')
if [ -z "${RAMDISK_DEV:-}" ]; then
  echo "⚠️  hdiutil attach fallito → fallback SSD"
  bash -c "$CMD"
  exit $?
fi

if ! diskutil eraseVolume HFS+ "$RAMDISK_NAME" "$RAMDISK_DEV" >/dev/null 2>&1; then
  echo "⚠️  diskutil eraseVolume fallito → fallback SSD"
  hdiutil detach "$RAMDISK_DEV" >/dev/null 2>&1 || true
  bash -c "$CMD"
  exit $?
fi

# ---------- Shadow dei file/directory target nel ramdisk ----------
for f in $FILES; do
  if [ -d "$f" ]; then
    DEST_DIR="${RAMDISK_VOL}/$(dirname "$f")"
    mkdir -p "$DEST_DIR"
    cp -Rp "$f" "$DEST_DIR/" 2>/dev/null || true
  elif [ -e "$f" ]; then
    DEST_DIR="${RAMDISK_VOL}/$(dirname "$f")"
    mkdir -p "$DEST_DIR"
    cp -p "$f" "$DEST_DIR/" 2>/dev/null || true
  fi
done

# ---------- Cache & TMPDIR su RAM (vero acceleratore I/O) ----------
export TMPDIR="${RAMDISK_VOL}/tmp"
export JEST_CACHE_DIR="${RAMDISK_VOL}/jest-cache"
export STRYKER_TMP_DIR="${RAMDISK_VOL}/stryker-tmp"
mkdir -p "$TMPDIR" "$JEST_CACHE_DIR" "$STRYKER_TMP_DIR"

# Se il comando jest non specifica già --cacheDirectory, lo aggiungiamo
RUN_CMD="$CMD"
if echo "$CMD" | grep -qE "(^|[[:space:]])(npx[[:space:]]+)?jest([[:space:]]|$)" \
   && ! echo "$CMD" | grep -q -- "--cacheDirectory"; then
  RUN_CMD="${CMD} --cacheDirectory=${JEST_CACHE_DIR}"
fi

echo "▶️  ${RUN_CMD}"
echo "   TMPDIR=${TMPDIR}  JEST_CACHE_DIR=${JEST_CACHE_DIR}"

cd "$PROJECT_ROOT"
bash -c "$RUN_CMD"
EXIT_CODE=$?

# ---------- Copia back-out solo a exit=0 ----------
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ exit=0 → copio file modificati dal ramdisk a SSD"
  for f in $FILES; do
    SRC="${RAMDISK_VOL}/${f}"
    if [ -d "$SRC" ]; then
      cp -Rp "$SRC"/. "$f"/ 2>/dev/null || true
    elif [ -e "$SRC" ]; then
      cp -p "$SRC" "$f" 2>/dev/null || true
    fi
  done
else
  echo "❌ exit=${EXIT_CODE} → file originali su SSD NON toccati"
fi

# trap EXIT smonta il ramdisk
exit $EXIT_CODE
