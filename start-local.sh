#!/bin/bash

# MechMind OS - Local Docker Startup Script
# Versione gratuita per sviluppo locale

echo "🚀 Avvio MechMind OS in locale con Docker..."
echo ""

# Verifica se Docker è installato
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non trovato!"
    echo "📥 Installa Docker da: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose non trovato!"
    echo "📥 Installa Docker Compose da: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker trovato"
echo ""

# Verifica se i container esistono già
if [ "$(docker ps -aq -f name=mechmind-)" ]; then
    echo "🔄 Container esistenti trovati, li fermo..."
    docker-compose down
    echo ""
fi

# Avvia i servizi
echo "🏗️  Costruzione e avvio dei container..."
echo "   Questo potrebbe richiedere alcuni minuti la prima volta..."
echo ""
docker-compose up --build -d

# Attendi che i servizi siano pronti
echo "⏳ Attesa avvio servizi..."
sleep 10

# Verifica stato
echo ""
echo "📊 Stato dei container:"
docker-compose ps

echo ""
echo "✨ MechMind OS è pronto!"
echo ""
echo "🌐 Accesso applicazioni:"
echo "   Frontend:    http://localhost:3001"
echo "   Backend API: http://localhost:3000"
echo "   Database UI: http://localhost:8080 (Adminer)"
echo "   Redis UI:    http://localhost:8081 (Redis Commander)"
echo ""
echo "📋 Comandi utili:"
echo "   docker-compose logs -f backend    # Log backend"
echo "   docker-compose logs -f frontend   # Log frontend"
echo "   docker-compose exec backend sh    # Shell backend"
echo "   docker-compose down               # Ferma tutto"
echo ""
echo "⚠️  La prima avvio potrebbe richiedere 2-3 minuti per il setup"
echo ""
