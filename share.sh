#!/bin/bash

# MechMind OS - Condividi con amici (Esposizione internet)

echo "🌐 Esposizione MechMind OS su internet..."
echo ""

# Verifica Docker sia avviato
if ! docker info &> /dev/null; then
    echo "❌ Docker non è avviato!"
    echo "Avvia Docker Desktop prima"
    exit 1
fi

# Avvia l'app se non è già running
if ! docker-compose ps | grep -q "Up"; then
    echo "🚀 Prima avvio l'app locale..."
    docker-compose up -d
    echo "⏳ Attendo 30 secondi..."
    sleep 30
fi

echo ""
echo "📡 Opzioni per condividere:"
echo ""
echo "1️⃣  ngrok (Consigliato - più semplice)"
echo "    Esegui: ngrok http 3001"
echo ""
echo "2️⃣  Cloudflare Tunnel"
echo "    Esegui: cloudflared tunnel --url http://localhost:3001"
echo ""
echo "3️⃣  Localtunnel"
echo "    Esegui: lt --port 3001"
echo ""
echo "4️⃣  Ngrok con Docker (se hai NGROK_AUTHTOKEN)"
echo "    Esegui: docker-compose --profile share up ngrok"
echo ""
echo "ℹ️  Il link temporaneo sarà visibile sopra"
echo "⚠️  Ricorda: il link dura solo mentre il tunnel è attivo!"
echo ""
