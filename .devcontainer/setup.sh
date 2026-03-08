#!/bin/bash
set -e

echo "🚀 Setup MechMind OS su GitHub Codespaces..."
echo ""

# Attendi Docker
while ! docker info > /dev/null 2>&1; do
  echo "⏳ Attendo Docker..."
  sleep 2
done
echo "✅ Docker pronto!"

# Build e avvia i container
echo "🐳 Avvio servizi..."
docker-compose -f .devcontainer/docker-compose.codespaces.yml up -d

# Attendi PostgreSQL
echo "⏳ Attendo PostgreSQL..."
until docker-compose -f .devcontainer/docker-compose.codespaces.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL pronto!"

# Attendi Redis
echo "⏳ Attendo Redis..."
until docker-compose -f .devcontainer/docker-compose.codespaces.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
  sleep 2
done
echo "✅ Redis pronto!"

echo ""
echo "✅ Setup completato!"
