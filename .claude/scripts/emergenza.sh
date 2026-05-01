#!/bin/bash
# Descrizione: Runbook per incidenti P0-P3. Pagamenti, autenticazione, database, Redis
# Parametri: [tipo-incidente] (payment|auth|database|redis|all)
# Equivalente a: /risposta-incidente

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

TIPO="${1:-all}"
INCIDENT_REPORT="./.claude/telemetry/incident-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== RISPOSTA INCIDENTE ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (basic tools)..."
if ! command -v curl &>/dev/null; then
  echo "❌ curl non disponibile"
  exit 1
fi

case "$TIPO" in
  payment|auth|database|redis|all)
    echo "✅ Incident type valido: $TIPO"
    ;;
  *)
    echo "❌ Tipo incidente non riconosciuto: $TIPO (valori: payment|auth|database|redis|all)"
    exit 1
    ;;
esac
echo "✅ Environment OK"
echo ""

{
  echo "# Incident Response Report"
  echo "**Data:** $(date)"
  echo "**Incident Type:** $TIPO"
  echo "**Severity:** CHECKING"
  echo ""

  echo "## Health Checks"
  echo ""

  # PAYMENT INCIDENT
  if [ "$TIPO" = "payment" ] || [ "$TIPO" = "all" ]; then
    echo "### Payment System"
    PAYMENT_STATUS=$(curl -s -w "\n%{http_code}" http://localhost:3002/health 2>/dev/null | tail -1 || echo "000")
    if [ "$PAYMENT_STATUS" = "200" ]; then
      echo "✅ Payment health endpoint: OK (HTTP $PAYMENT_STATUS)"
    else
      echo "🔴 Payment health endpoint: FAILED (HTTP $PAYMENT_STATUS)"
    fi
    echo ""
  fi

  # AUTH INCIDENT
  if [ "$TIPO" = "auth" ] || [ "$TIPO" = "all" ]; then
    echo "### Authentication System"
    AUTH_STATUS=$(curl -s -w "\n%{http_code}" http://localhost:3002/v1/auth/me 2>/dev/null | tail -1 || echo "000")
    if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "200" ]; then
      echo "✅ Auth endpoint responding (HTTP $AUTH_STATUS)"
    else
      echo "🔴 Auth endpoint not responding (HTTP $AUTH_STATUS)"
    fi
    echo ""
  fi

  # DATABASE INCIDENT
  if [ "$TIPO" = "database" ] || [ "$TIPO" = "all" ]; then
    echo "### Database"
    if command -v pg_isready &>/dev/null; then
      if pg_isready -h localhost -p 5432 2>&1 | grep -q "accepting"; then
        echo "✅ PostgreSQL: OK"
      else
        echo "🔴 PostgreSQL: NOT RESPONDING"
      fi
    else
      echo "⚠️  pg_isready not available (psql tools not installed)"
    fi
    echo ""
  fi

  # REDIS INCIDENT
  if [ "$TIPO" = "redis" ] || [ "$TIPO" = "all" ]; then
    echo "### Redis Cache"
    if command -v redis-cli &>/dev/null; then
      if redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ Redis: OK"
      else
        echo "🔴 Redis: NOT RESPONDING"
      fi
    else
      echo "⚠️  redis-cli not available (Redis tools not installed)"
    fi
    echo ""
  fi

  echo "## Recommended Actions"
  echo ""
  echo "| Incident | Action |"
  echo "|----------|--------|"
  echo "| Payment | Check Stripe webhook logs; verify encryption key accessible |"
  echo "| Auth | Verify JWT secret; check token cache in Redis |"
  echo "| Database | Check connection pool; verify GDPR policies loaded |"
  echo "| Redis | Check memory usage; verify eviction policy |"
  echo ""

  echo "## Escalation Contacts"
  echo ""
  echo "- **Team Lead:** Giovanni Romano (romanogiovanni1993@gmail.com)"
  echo "- **On-Call:** Check .claude/rules/on-call.md"
  echo ""

  echo "✅ Incident verification completato."

} | tee "$INCIDENT_REPORT"

echo ""
echo "📋 Report salvato: $INCIDENT_REPORT"
