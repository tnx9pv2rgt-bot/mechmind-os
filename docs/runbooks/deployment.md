# Deployment Runbook

This runbook covers deployment procedures for MechMind OS services to production and staging environments.

## Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────▶│    CI/CD    │────▶│   Staging   │
│   Repo      │     │  (GitHub    │     │   Cluster   │
└─────────────┘     │  Actions)   │     └─────────────┘
                    └──────┬──────┘            │
                           │                    │
                    ┌──────▼──────┐     ┌──────▼──────┐
                    │   Docker    │     │   Promote   │
                    │   Build &   │     │   to Prod   │
                    │    Push     │     └──────┬──────┘
                    └─────────────┘            │
                                        ┌──────▼──────┐
                                        │ Production  │
                                        │  Cluster    │
                                        └─────────────┘
```

## Environments

| Environment | URL | Purpose | Auto-Deploy |
|-------------|-----|---------|-------------|
| Sandbox | sandbox.mechmind.io | Development testing | PR merge to develop |
| Staging | staging.mechmind.io | Pre-prod validation | PR merge to main |
| Production | mechmind.io | Live customers | Manual approval |

## Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code review completed
- [ ] Database migrations reviewed
- [ ] Feature flags configured
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled (if needed)

## Standard Deployment

### 1. Prepare Release

```bash
# Update version
VERSION="1.2.3"
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v${VERSION}

# Update version files
sed -i "s/VERSION=.*/VERSION=${VERSION}/" .env

# Commit and push
git add .
git commit -m "Release v${VERSION}"
git push origin release/v${VERSION}
```

### 2. Deploy to Staging

```bash
# Merge to staging
git checkout staging
git merge release/v${VERSION}
git push origin staging

# Monitor deployment
gh workflow watch deploy-staging

# Verify staging
./scripts/verify-deployment.sh https://api-staging.mechmind.io
```

### 3. Deploy to Production

```bash
# Create PR to main
gh pr create \
  --title "Release v${VERSION}" \
  --body "Deploy v${VERSION} to production" \
  --base main \
  --head release/v${VERSION}

# After PR approval and merge
git checkout main
git pull origin main

# Tag release
git tag -a v${VERSION} -m "Release v${VERSION}"
git push origin v${VERSION}

# Trigger production deployment
gh workflow run deploy-production --ref v${VERSION}
```

## Deployment Commands

### Kubernetes Deployment

```bash
# Apply configuration
kubectl apply -f k8s/production/

# Rolling update
kubectl set image deployment/api \
  api=mechmind/api:v${VERSION} \
  --record

# Monitor rollout
kubectl rollout status deployment/api

# Verify pods
kubectl get pods -l app=api

# Check logs
kubectl logs -l app=api --tail=100
```

### Database Migrations

```bash
# Run migrations
kubectl run migration-${VERSION} \
  --image=mechmind/api:v${VERSION} \
  --restart=Never \
  --command -- \
  migrate -path /migrations -database "$DATABASE_URL" up

# Verify migrations
kubectl run migration-check \
  --image=mechmind/api:v${VERSION} \
  --restart=Never \
  --command -- \
  migrate -path /migrations -database "$DATABASE_URL" version
```

## Deployment Strategies

### Rolling Deployment (Default)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  template:
    spec:
      containers:
      - name: api
        image: mechmind/api:v1.2.3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Blue-Green Deployment

```bash
# Deploy green environment
kubectl apply -f k8s/production/green/

# Wait for green to be ready
kubectl rollout status deployment/api-green

# Switch traffic
kubectl patch service api -p '{"spec":{"selector":{"version":"green"}}}'

# Verify
./scripts/verify-deployment.sh

# Remove blue (old) deployment
kubectl delete deployment/api-blue
```

### Canary Deployment

```bash
# Deploy canary (10% traffic)
kubectl apply -f k8s/production/canary/

# Monitor metrics
watch -n 5 'kubectl get pods -l version=canary'

# Gradually increase traffic
kubectl scale deployment/api-canary --replicas=3
kubectl scale deployment/api-stable --replicas=7

# Full rollout
kubectl scale deployment/api-canary --replicas=10
kubectl delete deployment/api-stable
```

## Feature Flags

### LaunchDarkly Integration

```python
# Check feature flag before deployment
from launchdarkly_api import LaunchDarklyApi

ld = LaunchDarklyApi(sdk_key)

# Enable feature for percentage rollout
ld.toggle_flag(
    flag_key="new-booking-flow",
    environment="production",
    enabled=True,
    rollout_percentage=10
)
```

### Database Feature Flags

```sql
-- Add feature flag table
CREATE TABLE feature_flags (
    key VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable feature
UPDATE feature_flags 
SET enabled = TRUE, rollout_percentage = 10 
WHERE key = 'new-booking-flow';
```

## Rollback Procedures

### Quick Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/api

# Monitor rollback
kubectl rollout status deployment/api

# Verify
kubectl get pods -l app=api
```

### Rollback to Specific Version

```bash
# List rollout history
kubectl rollout history deployment/api

# Rollback to specific revision
kubectl rollout undo deployment/api --to-revision=3

# Verify rollback
kubectl rollout history deployment/api
```

### Database Rollback

```bash
# Rollback migrations
kubectl run migration-rollback \
  --image=mechmind/api:PREVIOUS_VERSION \
  --restart=Never \
  --command -- \
  migrate -path /migrations -database "$DATABASE_URL" down 1

# Verify
kubectl run migration-check \
  --image=mechmind/api:PREVIOUS_VERSION \
  --restart=Never \
  --command -- \
  migrate -path /migrations -database "$DATABASE_URL" version
```

## Post-Deployment Verification

### Health Checks

```bash
# API health
curl -f https://api.mechmind.io/v1/admin/health

# Database connectivity
curl -f https://api.mechmind.io/v1/admin/health | jq '.components.database.status'

# External dependencies
curl -f https://api.mechmind.io/v1/admin/health | jq '.components.voice_provider.status'
```

### Smoke Tests

```bash
# Run smoke tests
./scripts/smoke-tests.sh production

# Key functionality tests
curl -X POST https://api.mechmind.io/v1/bookings/reserve \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"slot_id":"test-slot","mechanic_id":"test-mechanic","customer_phone":"+15555555555"}'
```

### Monitoring

```bash
# Check error rate
datadog query "sum:mechmind.api.errors{*}"

# Check latency
datadog query "avg:mechmind.api.response_time{*}"

# Check throughput
datadog query "sum:mechmind.api.requests{*}"
```

## Emergency Deployment

### Hotfix Procedure

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Apply fix
# ... make changes ...

# 3. Fast-track to production
git commit -am "Hotfix: [description]"
git push origin hotfix/critical-fix

# 4. Create PR with "hotfix" label
gh pr create --title "HOTFIX: [description]" --label hotfix

# 5. After approval, merge and deploy
gh pr merge --admin --squash
gh workflow run deploy-production
```

### Emergency Rollback

```bash
# Immediate rollback
kubectl rollout undo deployment/api

# Notify team
slack post --channel="#incidents" "Emergency rollback executed"

# Create incident
pagerduty incident:create --title="Emergency rollback" --urgency=high
```

## Deployment Automation

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-production.yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push
        run: |
          docker build -t mechmind/api:${{ github.ref_name }} .
          docker push mechmind/api:${{ github.ref_name }}
      
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --region us-east-1 --name mechmind-prod
          kubectl set image deployment/api api=mechmind/api:${{ github.ref_name }}
          kubectl rollout status deployment/api --timeout=300s
      
      - name: Verify deployment
        run: |
          ./scripts/verify-deployment.sh https://api.mechmind.io
      
      - name: Notify team
        if: failure()
        run: |
          slack post --channel="#deployments" "Production deployment failed!"
```

## Deployment Schedule

| Day | Time (UTC) | Activity |
|-----|------------|----------|
| Monday | 14:00 | Regular deployment window |
| Wednesday | 14:00 | Regular deployment window |
| Friday | 10:00 | Emergency fixes only |
| Weekend | - | No deployments |

## Contacts

| Role | Contact | Purpose |
|------|---------|---------|
| SRE On-Call | PagerDuty | Deployment issues |
| Release Manager | Slack @release-mgr | Deployment approval |
| Engineering Lead | Slack @eng-lead | Escalation |
