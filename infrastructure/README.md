# MechMind OS v10 - Infrastructure as Code

Cost-optimized AWS infrastructure for a multi-tenant SaaS platform serving automotive repair shops.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MechMind OS v10                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │   API GW    │    │   Vapi.ai   │    │   Auth0     │                      │
│  │  (Future)   │    │ Voice Calls │    │    Auth     │                      │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘                      │
│         │                  │                                                │
│         ▼                  ▼                                                │
│  ┌─────────────────────────────────────┐                                    │
│  │         Lambda Functions            │                                    │
│  │  ┌─────────┐ ┌─────────┐ ┌────────┐ │                                    │
│  │  │API Main │ │ Booking │ │ Voice  │ │                                    │
│  │  │ (NestJS)│ │ Worker  │ │Handler │ │                                    │
│  │  └────┬────┘ └────┬────┘ └───┬────┘ │                                    │
│  └───────┼───────────┼──────────┼──────┘                                    │
│          │           │          │                                           │
│          ▼           ▼          ▼                                           │
│  ┌─────────────────────────────────────┐                                    │
│  │              SQS Queues             │                                    │
│  │  ┌──────────┐ ┌──────────┐         │                                    │
│  │  │ Bookings │ │  Notify  │  + DLQ  │                                    │
│  │  └──────────┘ └──────────┘         │                                    │
│  └─────────────────────────────────────┘                                    │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────┐                                    │
│  │            Database Layer           │                                    │
│  │  ┌─────────────────────────────┐    │                                    │
│  │  │  RDS PostgreSQL (Free Tier) │    │  Month 1-12                      │
│  │  │  OR                           │    │                                  │
│  │  │  Aurora Serverless v2       │    │  Month 13+                       │
│  │  └─────────────────────────────┘    │                                    │
│  └─────────────────────────────────────┘                                    │
│                                                                              │
│  ┌─────────────────────────────────────┐                                    │
│  │           S3 Storage                │                                    │
│  │  ┌──────────┐ ┌──────────┐         │                                    │
│  │  │  Assets  │ │  Logs    │         │                                    │
│  │  └──────────┘ └──────────┘         │                                    │
│  └─────────────────────────────────────┘                                    │
│                                                                              │
│  ┌─────────────────────────────────────┐                                    │
│  │        Secrets Manager              │                                    │
│  │  DB creds, API keys, JWT secrets    │                                    │
│  └─────────────────────────────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- AWS CLI configured
- Terraform >= 1.5.0
- Node.js >= 20
- jq (for scripts)

### 1. Clone and Setup

```bash
git clone <repo>
cd mechmind-os/infrastructure
```

### 2. Configure AWS Credentials

```bash
aws configure
# OR
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

### 3. Deploy Infrastructure

```bash
# Deploy to development
./scripts/deploy.sh dev full

# Or step by step:
./scripts/deploy.sh dev infra    # Terraform only
./scripts/deploy.sh dev build    # Build Lambda
./scripts/deploy.sh dev lambda   # Deploy Lambda
./scripts/deploy.sh dev migrate  # Run migrations
```

### 4. Verify Deployment

```bash
# Get Lambda URL
aws lambda get-function-url-config \
  --function-name mechmind-dev-api-main \
  --query FunctionUrl

# Health check
curl <lambda-url>/health
```

## Project Structure

```
infrastructure/
├── terraform/
│   ├── main.tf              # Main infrastructure
│   ├── variables.tf         # All variables
│   ├── outputs.tf           # Useful outputs
│   ├── rds.tf               # Database resources
│   ├── lambda.tf            # Compute resources
│   ├── sqs.tf               # Queue resources
│   ├── s3.tf                # Storage resources
│   ├── secrets.tf           # Secrets management
│   ├── monitoring.tf        # CloudWatch alarms
│   └── environments/
│       ├── dev.tfvars       # Dev config
│       ├── staging.tfvars   # Staging config
│       └── prod.tfvars      # Prod config
├── .github/workflows/
│   ├── terraform-plan.yml   # PR validation
│   ├── deploy-dev.yml       # Dev deployment
│   └── deploy-prod.yml      # Prod deployment
├── scripts/
│   ├── deploy.sh            # Deployment helper
│   └── migrate.sh           # Database migrations
├── Dockerfile               # Lambda container
├── .dockerignore
└── COST_ANALYSIS.md         # Cost breakdown
```

## Environments

| Environment | Purpose | Cost/Month |
|-------------|---------|------------|
| `dev` | Development, testing | ~$10-20 |
| `staging` | Pre-production validation | ~$50-100 |
| `prod` | Production (Free Tier 12mo) | ~$220 |

## Cost Optimization

### Free Tier (Month 1-12)

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| RDS PostgreSQL | db.t3.micro, 20GB | **$0** |
| Lambda | 1M requests, 400k GB-sec | **$0** |
| SQS | 1M requests | **$0** |
| S3 | 5GB, 20k GET | **~$0.23** |
| Secrets Manager | 30 days free | **~$3** |

**Total AWS: ~$3/month**

See [COST_ANALYSIS.md](COST_ANALYSIS.md) for detailed breakdown.

## Key Features

### Database
- **Free Tier**: RDS PostgreSQL 16 on db.t3.micro
- **Scale Phase**: Aurora Serverless v2 (0.5-2 ACU)
- Automated backups (7 days prod, 1 day dev)
- VPC-isolated with security groups

### Compute
- **Lambda** with ARM64 (Graviton2) for 20% savings
- Function URLs for API endpoints
- VPC configuration for database access
- Dead letter queues for failed invocations

### Queues
- SQS with dead letter queues
- Lambda event source mapping
- CloudWatch alarms for stuck messages

### Storage
- S3 with Intelligent-Tiering
- Lifecycle policies for cost optimization
- VPC endpoint for free S3 access

### Security
- Secrets Manager for all credentials
- KMS encryption in production
- IAM least-privilege policies
- VPC security groups

### Monitoring
- CloudWatch dashboards
- Lambda error/timeout alarms
- RDS CPU/storage alarms
- AWS Budget alerts

## Deployment Workflows

### Development (Auto-deploy)
```
Push to develop branch
    ↓
GitHub Actions: Build → Test → Deploy to dev
    ↓
Run migrations → Health check
```

### Production (Manual approval)
```
Push to main branch
    ↓
GitHub Actions: Build → Test → Plan
    ↓
Manual approval required
    ↓
Deploy to prod → Migrations → Health check
    ↓
Create GitHub release
```

## Common Commands

### Terraform

```bash
cd terraform

# Initialize
terraform init -backend-config="bucket=mechmind-terraform-state-<account_id>"

# Plan
terraform plan -var-file="environments/dev.tfvars"

# Apply
terraform apply -var-file="environments/dev.tfvars"

# Destroy (careful!)
terraform destroy -var-file="environments/dev.tfvars"

# Output
terraform output
```

### Database Migrations

```bash
# Check status
./scripts/migrate.sh dev status

# Deploy migrations
./scripts/migrate.sh dev deploy

# Create new migration
./scripts/migrate.sh dev create add_users

# Open Prisma Studio
./scripts/migrate.sh dev studio

# Backup database
./scripts/migrate.sh dev backup
```

### Lambda Deployment

```bash
# Build and deploy
./scripts/deploy.sh dev full

# Deploy specific component
./scripts/deploy.sh dev lambda

# Health check
./scripts/deploy.sh dev health
```

## Secrets Management

Secrets are stored in AWS Secrets Manager:

| Secret | Purpose |
|--------|---------|
| `mechmind-{env}/database/credentials` | Database connection |
| `mechmind-{env}/vapi/api-key` | Voice AI API |
| `mechmind-{env}/twilio/credentials` | SMS/PSTN |
| `mechmind-{env}/auth/jwt-signing-key` | JWT tokens |
| `mechmind-{env}/auth0/credentials` | Authentication |
| `mechmind-{env}/openai/api-key` | AI features |

### Update a Secret

```bash
aws secretsmanager put-secret-value \
  --secret-id mechmind-prod/vapi/api-key \
  --secret-string '{"api_key":"new_key"}'
```

## Troubleshooting

### Lambda cold starts
- Consider provisioned concurrency for production
- Optimize package size
- Use ARM64 architecture

### Database connection limits
- Use connection pooling (PgBouncer)
- Aurora Serverless v2 handles this better

### SQS message delays
- Check visibility timeout >= Lambda timeout
- Monitor DLQ for failed messages

### Cost overruns
- Review AWS Cost Explorer
- Check CloudWatch metrics
- Adjust Lambda reserved concurrency

## Security Checklist

- [ ] Enable MFA on AWS account
- [ ] Rotate secrets regularly
- [ ] Enable CloudTrail logging
- [ ] Review IAM policies quarterly
- [ ] Enable GuardDuty (production)
- [ ] Set up AWS Config rules

## Roadmap

- [ ] Add API Gateway with WAF
- [ ] Enable CloudFront CDN
- [ ] Multi-region disaster recovery
- [ ] Blue/green Lambda deployments
- [ ] Automated security scanning

## Support

- **Issues**: GitHub Issues
- **Slack**: #mechmind-dev
- **Email**: devops@mechmind.io

## License

Proprietary - MechMind Inc.
