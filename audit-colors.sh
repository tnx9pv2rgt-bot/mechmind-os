#\!/bin/bash

PROJ_ROOT="/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
REPORT="$PROJ_ROOT/COLOR-ALIGNMENT-REPORT.md"

echo "🔍 COMPREHENSIVE COLOR AUDIT - MechMind OS" > "$REPORT"
echo "" >> "$REPORT"
echo "**Date:** $(date)" >> "$REPORT"
echo "**Status:** Scanning all color references in codebase" >> "$REPORT"
echo "" >> "$REPORT"

echo "## 1. HEX COLORS FOUND IN CODEBASE" >> "$REPORT"
echo "" >> "$REPORT"

cd "$PROJ_ROOT/frontend"

# Find all hex colors
echo "### Hex Colors by File:" >> "$REPORT"
grep -r "#[0-9a-fA-F]\{3,6\}" --include="*.tsx" --include="*.ts" --include="*.css" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".next" | cut -d: -f1 | sort | uniq -c | sort -rn >> "$REPORT"

echo "" >> "$REPORT"
echo "## 2. RGB/RGBA COLORS" >> "$REPORT"
echo "" >> "$REPORT"
grep -r "rgb\|rgba" --include="*.tsx" --include="*.ts" --include="*.css" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -50 >> "$REPORT"

echo "" >> "$REPORT"
echo "## 3. TAILWIND COLOR CLASSES" >> "$REPORT"
echo "" >> "$REPORT"
grep -r "\(bg\|text\|border\|shadow\)-\(slate\|gray\|red\|blue\|green\|orange\|purple\)" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | head -50 >> "$REPORT"

echo "" >> "$REPORT"
echo "## 4. CSS VARIABLES" >> "$REPORT"
echo "" >> "$REPORT"
grep -r "var(--" --include="*.tsx" --include="*.ts" --include="*.css" . 2>/dev/null | grep -v node_modules | head -50 >> "$REPORT"

echo "" >> "$REPORT"
echo "✅ Audit complete. Report saved to: $REPORT"
cat "$REPORT" | head -100
