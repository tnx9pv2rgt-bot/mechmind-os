#!/bin/bash
INPUT=$(cat)
MESSAGE=$(echo "$INPUT" | jq -r '.message // "Task completato"' 2>/dev/null)
osascript -e "display notification \"$MESSAGE\" with title \"MechMind OS — Claude Code\"" 2>/dev/null || true
exit 0
