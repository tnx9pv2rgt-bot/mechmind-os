---
name: controlla-dipendenze
description: Controlla vulnerabilità npm, licenze e catena di fornitura.
type: security
category: compliance
user-invocable: true
argument-hint: "[--audit|--sbom|--cve|--all] [--format json|html]"
effort: high
timeout: 600
---

# Revisione Dipendenze & Supply Chain

Compliance OWASP A03:2026 (Software Supply Chain Attacks).

## Comandi

```bash
/revisione-dipendenze --all
/revisione-dipendenze --audit --format html
/revisione-dipendenze --cve --format json
```

## Checks

### 1. npm audit
- CRITICAL vulnerabilities → BLOCCA
- HIGH vulnerabilities → WARNING
- Output: `npm audit --json > audit-report.json`

### 2. SBOM Generation
- `npx @cyclonedx/bom --output sbom.json`
- Report: package versions, licenses, transitive deps
- Detects supply chain weaknesses (single-source deps)

### 3. CVE Checking
- `npx snyk test` (if available)
- Fallback: `npx auditjs ossi` (offline CVE DB)
- Custom: check known-vulnerable packages (lodash <4.17, etc)

### 4. Package Signature Verification
- npm package-lock.json integrity check
- Detect tampering via hash mismatch
- Warn on packages without checksum

### 5. License Compliance
- ✅ MIT, Apache 2.0, BSD
- ⚠️  LGPL (check linking)
- ❌ GPL-2.0, GPL-3.0, AGPL-* (no usage)

## Report

```markdown
# SUPPLY_CHAIN_AUDIT.md

## npm audit
CRITICAL: 0
HIGH: 2 (lodash-es, minimist)
MEDIUM: 5
LOW: 12

Action: Update to safe versions

## SBOM
Generated: sbom.json (2,847 direct + transitive)
Largest dep tree: next-js (depth 23)

## CVE Coverage
✅ All deps checked via Snyk DB
⚠️  3 packages have pending CVEs (patched in 2026-05-01)

## License Check
✅ No GPL/AGPL detected
⚠️  LGPL-3.0 in @visx/text (verify linking)

## OVERALL SUPPLY CHAIN SCORE
✅ 94% (compliant with OWASP A03:2026)
```

---

**Failure Criteria:**
- CRITICAL vulnerabilities → exit 2
- GPL/AGPL license → exit 2
- Signature tampering → exit 2

**Last Updated:** 2026-04-25
