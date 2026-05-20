# nexo-architect — memoria persistente

## Pattern decisionali ricorrenti
_(append-only. Pattern emersi: trade-off, deleghe, decomposizioni efficaci.)_

## Decomposition templates riusabili
- Modulo CRUD: db-auditor (schema) → backend-engineer (svc+ctrl+spec) → frontend-engineer (page+form) → test-runner (E2E) → security-auditor (review) → tech-writer (docs)
- Bug fix cross-layer: incident-responder (mitigation) → backend/frontend (root fix) → test-runner (regression) → tech-writer (post-mortem)

## File shared: SOLO io modifico
- CLAUDE.md, backend/CLAUDE.md, frontend/CLAUDE.md, package.json, tsconfig.json, schema.prisma

## Stakeholder umano (giovanni) decision gates
- Deploy prod, encryption key rotation, schema breaking, dep major bump

## Lezioni accumulate
