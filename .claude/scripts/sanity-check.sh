#!/bin/bash
# Sanity check: verifica che Claude funzioni correttamente prima di eseguire task critici

RESULT=$(echo "Rispondi SOLO con la parola OK" | claude -p 2>&1 | head -1)
if [[ "$RESULT" != *"OK"* ]]; then
  echo "❌ SANITY CHECK FALLITO — Claude non risponde correttamente"
  echo "Risposta ricevuta: $RESULT"
  exit 1
fi
echo "✅ Sanity check superato"
