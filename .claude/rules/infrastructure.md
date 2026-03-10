---
paths:
  - "infrastructure/**/*"
  - "docker-compose*.yml"
  - "Dockerfile*"
---
# Infrastructure Rules

## Terraform
- All AWS resources in `infrastructure/terraform/`
- Use variables, never hardcode secrets or IDs
- Run `terraform plan` before `terraform apply`
- Environments: dev, staging, prod in `environments/`

## Docker
- `docker-compose.yml` for local dev
- `docker-compose.test.yml` for CI/CD
- Backend: port 3000, Frontend: port 3001
- Services: postgres:15, redis:7, adminer, redis-commander

## AWS Architecture
- Lambda (ARM64) for compute
- RDS PostgreSQL for database
- SQS for async queues (booking, notifications, voice)
- S3 for assets/backups
- Secrets Manager for credentials

## CI/CD
- GitHub Actions in `infrastructure/.github/workflows/`
- Pipeline: lint -> typecheck -> test -> build -> deploy
- Never commit secrets to workflows
