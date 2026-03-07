#!/bin/bash

# 🚀 Deploy Script per MechMind OS
# Uso: ./deploy.sh

echo "🚀 Avvio deploy MechMind OS..."

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check se siamo nella cartella corretta
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Errore: Devi eseguire questo script dalla cartella mechmind-os/${NC}"
    exit 1
fi

cd frontend

# Check dipendenze
echo "📦 Installazione dipendenze..."
npm install

# Build locale per test
echo "🔨 Build locale..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completata con successo!${NC}"
else
    echo -e "${RED}❌ Build fallita. Correggi gli errori sopra.${NC}"
    exit 1
fi

# Deploy su Vercel
echo "🚀 Deploy su Vercel..."
echo -e "${YELLOW}⚠️  Ti verrà chiesto di confermare il deploy${NC}"
npx vercel --prod

echo -e "${GREEN}✅ Deploy completato!${NC}"
echo "🌐 Controlla la tua dashboard Vercel per lo stato"
