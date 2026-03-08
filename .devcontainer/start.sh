#!/bin/bash
set -e
echo "🐳 Avvio MechMind OS..."
docker-compose up -d
echo "⏳ Attendo servizi..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 2; done
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do sleep 2; done
cd backend && npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss && cd ..
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✨ MECHMIND OS PRONTO!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  🎨 Frontend:  https://${CODESPACE_NAME}-3001.app.github.dev"
echo "  ⚡ Backend:   https://${CODESPACE_NAME}-3000.app.github.dev"
echo "  🗄️  Adminer:  https://${CODESPACE_NAME}-8080.app.github.dev"
echo ""
echo "═══════════════════════════════════════════════════════════"
