#!/bin/bash
set -e
echo "🚀 Setup MechMind OS..."
while ! docker info > /dev/null 2>&1; do sleep 1; done
cd backend && npm install --legacy-peer-deps && npx prisma generate && cd ..
cd frontend && npm ci && cd ..
echo "✅ Setup completato!"
