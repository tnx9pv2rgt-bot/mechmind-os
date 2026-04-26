---
name: metriche
description: Dashboard con metriche: copertura, velocità skill, tempi di risposta incidenti.
type: metrics
category: observability
user-invocable: true
argument-hint: "[--scope skills|coverage|incidents|deployment] [--period month|week] [--format json|html|markdown]"
effort: medium
timeout: 300
---

# Misura KPI — Telemetry & Quality Trends

Track execution time, coverage evolution, incident MTTD/MTTR, deployment frequency.

## Comandi

```bash
/misura-kpi --scope all --period month --format html
/misura-kpi --scope coverage --format json
/misura-kpi --scope incidents --period week
```

## Metrics Tracked

### 1. Skill Execution Time
- Per ogni skill: tempo medio, min, max
- Trend: last 7 runs
- Output: `.claude/telemetry/skills-perf.json`

```json
{
  "genera-test": {
    "avg_seconds": 340,
    "min_seconds": 245,
    "max_seconds": 420,
    "runs": 12,
    "last_7": [320, 335, 340, 345, 338, 332, 341]
  },
  "stop-quality-gate": {
    "avg_seconds": 28,
    "min_seconds": 12,
    "max_seconds": 45,
    ...
  }
}
```

### 2. Coverage Evolution (from MODULI_NEXO.md)
- Statements %, Branches % per modulo
- Trend: last 30 days
- Identifies modules improving, stalling, regressing

```json
{
  "coverage_trend": {
    "date": "2026-04-25",
    "modules_at_90_90": 48,
    "modules_acceptable": 2,
    "modules_below_bar": 1,
    "avg_statements": 92.4,
    "avg_branches": 90.1,
    "mutation_avg": 78.2
  }
}
```

### 3. Incident MTTD/MTTR (from error logs)
- Mean Time To Detect: when bug discovered
- Mean Time To Resolve: when fix deployed
- Trend: last 30 incidents

```json
{
  "incidents": [
    {
      "id": "INC-042",
      "detected": "2026-04-20 14:30",
      "resolved": "2026-04-20 16:15",
      "mttd_minutes": 0,
      "mttr_minutes": 105,
      "severity": "HIGH"
    }
  ],
  "mttd_avg": 15,
  "mttr_avg": 87,
  "trend": "improving"
}
```

### 4. Deployment Frequency
- Commits per day, per week
- PR merge rate
- Deployment velocity (commits → production)

```json
{
  "deployment": {
    "commits_today": 3,
    "commits_this_week": 18,
    "commits_this_month": 72,
    "pr_opened": 12,
    "pr_merged": 10,
    "pr_avg_merge_time_hours": 8.5
  }
}
```

## Dashboard Output

```markdown
# KPI Dashboard — April 2026

## 📊 Performance

| Metric | Value | Trend | Status |
|--------|-------|-------|--------|
| Avg Skill Execution | 284s | ↓ -12% | 🟢 |
| Coverage (all modules) | 92.4% stmt / 90.1% branch | ↑ +1.2% | 🟢 |
| Mutation Score (avg) | 78.2% | ↑ +0.8% | 🟡 |
| Flaky Tests | 0 | ✅ | 🟢 |

## 📈 Coverage Trend (Last 30 Days)

```
Apr 10: 91.2% / 88.9%
Apr 15: 91.6% / 89.2%
Apr 20: 92.0% / 89.8%
Apr 25: 92.4% / 90.1% ← TODAY
```

## 🚀 Deployment Velocity

| Period | Commits | PRs | Avg Merge Time |
|--------|---------|-----|----------------|
| This week | 18 | 10 | 8.5h |
| Last week | 22 | 12 | 7.2h |
| Last month | 72 | 45 | 9.1h |

## 🔴 Incident Response

| MTTD | MTTR | Trend |
|------|------|-------|
| 15 min avg | 87 min avg | ↓ improving |

## 📊 Modules Status

- ✅ 48 modules: 90/90+ (world-class)
- 🟡 2 modules: 88-89% (acceptable, documented ceiling)
- ❌ 1 module: <88% (needs work)

**Last updated:** 2026-04-25 14:30  
**Data source:** MODULI_NEXO.md, .claude/telemetry/, git log
```

## Collection Strategy

### Automatic (on each run)
- Skill execution time → log to `.claude/telemetry/skills-perf.json`
- Coverage data → parse MODULI_NEXO.md and update trend
- Deployment data → parse git log (commits, dates)

### Manual Triggers
- Incident MTTD/MTTR → add to `.claude/telemetry/incidents.json`
- Quality scorecard → aggregate after `/genera-test --scope all`

## Data Retention

- `.claude/telemetry/` in .gitignore (local only)
- 90-day rolling window (prune older entries)
- JSON format for programmatic access
- HTML export for stakeholder reporting

## Usage in CI/CD

```bash
# Generate dashboard before deployment
/misura-kpi --scope all --format html > /tmp/kpi-report.html

# Check if metrics meet deployment gates
/misura-kpi --scope coverage --period month | \
  jq '.coverage_trend.modules_at_90_90' | \
  [ "$(cat)" -ge 45 ] && echo "✅ Coverage gate PASS" || echo "❌ FAIL"
```

---

**Last Updated:** 2026-04-25  
**Owner:** MechMind QA team  
**Refresh interval:** every test generation or daily @ 8am  
