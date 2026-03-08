#!/bin/bash
set -e

echo "🚀 Avvio MechMind OS..."

# Verifica che i container siano running
docker-compose -f .devcontainer/docker-compose.codespaces.yml ps

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✨ MECHMIND OS PRONTO!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  🎨 Frontend:  https://${CODESPACE_NAME}-3001.app.github.dev"
echo "  ⚡ Backend:   https://${CODESPACE_NAME}-3000.app.github.dev"
echo "  🗄️  Adminer:  https://${CODESPACE_NAME}-8080.app.github.dev"
echo "  🔴 Redis UI:  https://${CODESPACE_NAME}-8081.app.github.dev"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 Comandi utili:"
echo "  docker-compose -f .devcontainer/docker-compose.codespaces.yml logs -f"
echo "  docker-compose -f .devcontainer/docker-compose.codespaces.yml down"
echo ""
