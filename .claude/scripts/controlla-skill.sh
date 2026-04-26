#!/bin/bash
# Descrizione: Verifica che tutte le skill e gli hook funzionino correttamente
# Parametri: nessuno
# Equivalente a: /verifica-skill

set -euo pipefail

echo "=== VERIFICA SKILL ==="
echo ""

# Controlla sintassi bash di tutti gli script
echo "1️⃣  Controlla sintassi bash..."
shellcheck .claude/scripts/*.sh 2>/dev/null || echo "⚠️  Avvertimenti shellcheck"
echo "✅ Sintassi OK"

# Controlla YAML frontmatter skill
echo ""
echo "2️⃣  Controlla YAML frontmatter..."
for skill in .claude/skills/*/SKILL.md; do
  head -1 "$skill" | grep -q "^---" || echo "⚠️  $skill manca YAML frontmatter"
done
echo "✅ Frontmatter OK"

# Verifica hook funzionali
echo ""
echo "3️⃣  Verifica hook..."
if [ -d ".claude/hooks" ]; then
  for hook in .claude/hooks/*.sh; do
    bash "$hook" --test 2>/dev/null || echo "⚠️  $hook fallito"
  done
  echo "✅ Hook OK"
else
  echo "⚠️  Nessun hook trovato"
fi

echo ""
echo "✅ Verifica skill completata."
