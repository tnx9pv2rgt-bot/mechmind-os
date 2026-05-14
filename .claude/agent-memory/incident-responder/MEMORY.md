# incident-responder — memoria persistente

## Incident pattern già visti
_(append: data, severità, sintomo, root cause, fix che ha funzionato)_

## Runbook map
- backend-down → docs/runbooks/backend-down.md
- brute-force → docs/runbooks/brute-force-detected.md
- circuit-breaker-open → docs/runbooks/circuit-breaker-open.md
- high-error-rate → docs/runbooks/high-error-rate.md
- high-p95-latency → docs/runbooks/high-p95-latency.md

## Lock semantics
- touch .claude/teams/incident-lock prima di operare
- rm al termine (sempre, anche se incident non risolto)

## Communication template
_(append qui)_
