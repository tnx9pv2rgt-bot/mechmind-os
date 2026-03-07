# MechMind OS v10 - Cost Analysis & Optimization Guide

## Executive Summary

This document provides a detailed cost breakdown for the MechMind OS infrastructure, optimized for startup budgets with a focus on AWS Free Tier utilization for the first 12 months.

| Phase | Monthly Cost | Annual Cost | Notes |
|-------|-------------|-------------|-------|
| **Month 1-12 (Free Tier)** | ~$220 | ~$2,640 | Using AWS Free Tier |
| **Month 13+ (Scaled)** | ~$800-1,000 | ~$9,600-12,000 | Post free-tier pricing |

---

## Month 1-12: Free Tier Phase (~$220/month)

### AWS Services (Free Tier Eligible)

| Service | Resource | Free Tier | Monthly Cost |
|---------|----------|-----------|--------------|
| **RDS PostgreSQL** | db.t3.micro + 20GB | 750 hrs/month, 20GB storage | **$0** |
| **Lambda** | 512MB, ~100k invocations | 1M requests, 400k GB-seconds | **$0** |
| **SQS** | 4 queues, ~50k messages | 1M requests/month | **$0** |
| **S3** | 10GB storage + requests | 5GB standard, 20k GET, 2k PUT | **~$0.23** |
| **CloudWatch** | Logs, metrics, alarms | 10 metrics, 10 alarms, 5GB logs | **$0** |
| **Secrets Manager** | 7 secrets | First 30 days free, then $0.40/secret | **~$2.80** |
| **VPC** | NAT Gateway skipped | Using VPC Endpoints instead | **$0** |
| **Data Transfer** | Minimal | 100GB out/month free | **$0** |

**AWS Subtotal: ~$3/month**

### Third-Party Services (Not Free)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Vapi.ai** | Voice AI calls (~500 calls) | **~$100-150** |
| **Twilio PSTN** | Phone numbers + calls | **~$50-75** |
| **Auth0** | 7,500 active users (free tier) | **$0** |
| **GitHub Actions** | 2,000 minutes (free) | **$0** |

**Third-Party Subtotal: ~$150-225/month**

### Total Month 1-12: ~$220/month

---

## Month 13+: Post Free-Tier Phase (~$800-1,000/month)

### AWS Services (Standard Pricing)

#### Database Options

**Option A: RDS PostgreSQL (Continue with provisioned)**

| Resource | Specs | Monthly Cost |
|----------|-------|--------------|
| db.t3.small | 2 vCPU, 2GB RAM | ~$25 |
| 50GB gp3 storage | 3,000 IOPS | ~$5 |
| Backup storage | 50GB | ~$5 |
| **Subtotal** | | **~$35** |

**Option B: Aurora Serverless v2 (Recommended for scaling)**

| Resource | Specs | Monthly Cost |
|----------|-------|--------------|
| Aurora Serverless v2 | 0.5 ACU min, 2 ACU max | ~$45-180 |
| 50GB storage | Auto-scaling | ~$10 |
| I/O operations | ~1M requests | ~$5 |
| **Subtotal** | | **~$60-200** |

> **Recommendation:** Start with Option A, migrate to Aurora v2 when you need auto-scaling.

#### Lambda Functions

| Function | Memory | Invocations | Duration | Monthly Cost |
|----------|--------|-------------|----------|--------------|
| api-main | 512MB | 500k | 200ms avg | ~$6 |
| worker-booking | 256MB | 100k | 500ms avg | ~$2 |
| worker-notification | 256MB | 200k | 300ms avg | ~$2 |
| voice-handler | 512MB | 50k | 1s avg | ~$4 |
| **Subtotal** | | | | **~$14** |

#### SQS Queues

| Queue | Requests | Monthly Cost |
|-------|----------|--------------|
| booking-confirmations | 500k | ~$2 |
| notifications | 300k | ~$1.20 |
| voice-calls | 100k | ~$0.40 |
| scheduled-jobs | 50k | ~$0.20 |
| **Subtotal** | | **~$4** |

#### S3 Storage

| Usage | Amount | Monthly Cost |
|-------|--------|--------------|
| Standard storage | 50GB | ~$1.15 |
| Intelligent-Tiering | 100GB | ~$2.30 |
| GET requests | 1M | ~$0.40 |
| PUT requests | 100k | ~$0.50 |
| Data transfer out | 100GB | ~$9 |
| **Subtotal** | | **~$14** |

#### CloudWatch

| Resource | Usage | Monthly Cost |
|----------|-------|--------------|
| Custom metrics | 20 | ~$2 |
| Alarms | 10 | ~$1 |
| Logs ingestion | 5GB | ~$2.50 |
| Logs storage | 10GB | ~$0.50 |
| **Subtotal** | | **~$6** |

#### Secrets Manager

| Secret | Monthly Cost |
|--------|--------------|
| 7 secrets | ~$2.80 |
| API calls | ~$0.05 |
| **Subtotal** | **~$3** |

#### VPC (if NAT Gateway needed)

| Resource | Monthly Cost |
|----------|--------------|
| NAT Gateway | ~$32 |
| Data processing | ~$5 |
| **Subtotal** | **~$37** |

> **Note:** Currently using VPC Endpoints to avoid NAT Gateway costs. Add NAT Gateway only if Lambda needs internet access from private subnets.

### AWS Services Summary (Month 13+)

| Category | Without NAT | With NAT |
|----------|-------------|----------|
| Database (Aurora) | ~$60-200 | ~$60-200 |
| Lambda | ~$14 | ~$14 |
| SQS | ~$4 | ~$4 |
| S3 | ~$14 | ~$14 |
| CloudWatch | ~$6 | ~$6 |
| Secrets Manager | ~$3 | ~$3 |
| VPC | $0 | ~$37 |
| **AWS Subtotal** | **~$101-241** | **~$138-278** |

### Third-Party Services (Month 13+)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Vapi.ai** | 2,000 calls | **~$300-400** |
| **Twilio PSTN** | Phone numbers + 2,000 calls | **~$150-200** |
| **Auth0** | 10,000 users (Essentials plan) | **~$35** |
| **GitHub Actions** | 3,000 minutes | **$0** |

**Third-Party Subtotal: ~$485-635/month**

### Total Month 13+: ~$586-913/month

With buffer for growth: **~$800-1,000/month**

---

## COGS Breakdown Per Shop

### Cost of Goods Sold (COGS) - Per Customer Per Month

This section details the direct costs associated with serving each shop/tenant.

#### Infrastructure Costs per Shop

| Service | Base Cost | Per Shop Increment | Calculation |
|---------|-----------|-------------------|-------------|
| **RDS (shared)** | $35/mo | ~$0.50 | Shared across all shops |
| **Lambda** | $14/mo | ~$0.30 | Usage-based per API call |
| **SQS** | $4/mo | ~$0.10 | Message volume per shop |
| **S3** | $14/mo | ~$0.50 | Storage for customer data |
| **CloudWatch** | $6/mo | ~$0.20 | Logs per tenant |
| **Secrets** | $3/mo | ~$0.05 | Per-tenant secrets |
| **Infrastructure Subtotal** | **$76** | **~$1.65** | **$8.00/shop at 100 shops** |

#### Voice AI Costs per Shop (Vapi.ai)

| Metric | Cost | Typical Usage/Shop | Monthly Cost |
|--------|------|-------------------|--------------|
| Per-minute rate | $0.05-0.08 | 200 minutes | **$12.00** |
| LLM queries | $0.002/query | 500 queries | **$1.00** |
| Voice synthesis | $0.015/minute | 200 minutes | **$3.00** |
| **Vapi Subtotal** | | | **~$16.00/shop** |

#### Telephony Costs per Shop (Twilio)

| Service | Cost | Monthly Usage | Monthly Cost |
|---------|------|---------------|--------------|
| Phone number | $1/month | 1 number | **$1.00** |
| Inbound calls | $0.0085/min | 150 min | **$1.28** |
| Outbound SMS | $0.0075/msg | 50 SMS | **$0.38** |
| **Twilio Subtotal** | | | **~$2.66/shop** |

#### Payment Processing (Stripe)

| Tier | Monthly Revenue | Stripe Fee (2.9% + $0.30) | Effective Rate |
|------|-----------------|---------------------------|----------------|
| Starter ($49) | $49 | $1.72 | 3.5% |
| Pro ($99) | $99 | $3.17 | 3.2% |
| Enterprise ($299) | $299 | $8.97 | 3.0% |
| **Average** | **$82** | **$2.68** | **3.3%** |

#### Support Costs (Outsourced L1)

| Model | Cost per Ticket | Tickets/Shop/Month | Monthly Cost |
|-------|-----------------|-------------------|--------------|
| Email support | $2 | 2 | **$4.00** |
| Chat support | $4 | 1 | **$4.00** |
| **Support Subtotal** | | | **~$5.00/shop** |

### Total COGS Per Shop Summary

| Category | Cost per Shop/Month | % of ARPA |
|----------|--------------------|-----------|
| AWS Infrastructure | $8.00 | 9.8% |
| Voice AI (Vapi) | $16.00 | 19.5% |
| Telephony (Twilio) | $2.66 | 3.2% |
| Payment Processing | $2.68 | 3.3% |
| Support (L1) | $5.00 | 6.1% |
| **Total COGS** | **$34.34** | **41.9%** |
| **Gross Margin** | **$47.66** | **58.1%** |

> **Target:** Reduce COGS to $25/shop through volume discounts and efficiency (70% gross margin)

---

## AWS Cost by Service (Detailed)

### RDS PostgreSQL Costs

| Component | Pricing | Monthly Cost (100 shops) |
|-----------|---------|--------------------------|
| db.t3.small instance | $0.034/hour × 730 | $24.82 |
| gp3 Storage (50GB) | $0.115/GB | $5.75 |
| IOPS (3,000 included) | Included | $0 |
| Backups (50GB) | $0.095/GB | $4.75 |
| **Total RDS** | | **~$35** |

**Volume Scaling:**
| Shops | Instance | Storage | Monthly Cost |
|-------|----------|---------|--------------|
| 1-50 | db.t3.micro | 20GB | $15 |
| 50-200 | db.t3.small | 50GB | $35 |
| 200-500 | db.t3.medium | 100GB | $65 |
| 500+ | Aurora Serverless | Auto | $100-300 |

### Lambda Costs

| Function | Memory | Invocation Cost | Duration Cost | Monthly Total |
|----------|--------|-----------------|---------------|---------------|
| api-main | 512MB | $0.20/million | $0.000008333/ms | $6.00 |
| worker-booking | 256MB | $0.20/million | $0.000004167/ms | $2.00 |
| worker-notification | 256MB | $0.20/million | $0.000004167/ms | $2.00 |
| voice-handler | 512MB | $0.20/million | $0.000008333/ms | $4.00 |

**Pricing Formula:**
```
Total Cost = (Requests × $0.20/million) + (GB-seconds × $0.0000166667)

Where:
- Requests = Number of invocations
- GB-seconds = Memory(GB) × Duration(seconds) × Requests
```

### S3 Costs

| Tier | Storage Cost | Retrieval Cost | Monthly (100GB) |
|------|--------------|----------------|-----------------|
| Standard | $0.023/GB | $0 | $2.30 |
| Intelligent-Tiering | $0.023/GB | $0 | $2.30 |
| Infrequent Access | $0.0125/GB | $0.01/GB | $1.25 + retrieval |
| Glacier | $0.004/GB | $0.02/GB | $0.40 + retrieval |

**Recommended:** Use Intelligent-Tiering with 90-day archive policy

### SQS Costs

| Queue Type | Price | Monthly (500k messages) |
|------------|-------|-------------------------|
| Standard | $0.40/million | $0.20 |
| FIFO | $0.50/million | $0.25 |
| **4 queues** | | **~$4.00** |

---

## Voice AI Costs (Vapi + Twilio)

### Vapi.ai Pricing Structure

| Component | Price | Typical Usage |
|-----------|-------|---------------|
| Base platform | $0.05/min | Per connected minute |
| Voice (ElevenLabs) | $0.018/min | High quality |
| LLM (GPT-4) | $0.03/min | Conversation handling |
| Telephony (inbound) | $0.002/min | Per minute received |
| Telephony (outbound) | $0.004/min | Per minute sent |

**Cost per 10-minute call:**
- Platform: $0.50
- Voice: $0.18
- LLM: $0.30
- Telephony: $0.02
- **Total: ~$1.00 per call**

### Twilio Costs

| Service | Price | Notes |
|---------|-------|-------|
| Phone number | $1.00/month | Per number |
| Inbound calls | $0.0085/min | Local numbers |
| Outbound calls | $0.013/min | US/Canada |
| Inbound SMS | $0.0075/msg | Short code: $0.01 |
| Outbound SMS | $0.0075/msg | Standard rate |

### Voice Cost Projections by Scale

| Shops | Calls/Month | Vapi Cost | Twilio Cost | Total Voice |
|-------|-------------|-----------|-------------|-------------|
| 10 | 200 | $200 | $50 | $250 |
| 50 | 1,000 | $1,000 | $250 | $1,250 |
| 100 | 2,000 | $2,000 | $500 | $2,500 |
| 500 | 10,000 | $8,000 | $2,000 | $10,000 |

**Per-shop voice cost at scale: $16-20/month**

---

## Payment Processing (Stripe)

### Standard Pricing

| Transaction Type | Fee |
|------------------|-----|
| Cards (EU) | 1.5% + €0.25 |
| Cards (Non-EU) | 2.9% + €0.30 |
| SEPA Direct Debit | 0.8% + €0.30 (capped at €6) |
| Subscription billing | Included |

### Effective Rates by Tier

| Tier | Price | Stripe Fee | Effective Rate |
|------|-------|------------|----------------|
| Starter (€49) | €49 | €0.99 + €0.25 = €1.24 | 2.5% |
| Pro (€99) | €99 | €1.49 + €0.25 = €1.74 | 1.8% |
| Enterprise (€299) | €299 | €4.49 + €0.25 = €4.74 | 1.6% |
| **Blended** | **€82** | **~€2.00** | **2.4%** |

### Volume Discounts (Stripe)

| Monthly Volume | Discount | Effective Rate |
|----------------|----------|----------------|
| $0-100K | Standard | 2.9% |
| $100K-500K | 0.2% | 2.7% |
| $500K-1M | 0.4% | 2.5% |
| $1M+ | Custom | <2.5% |

---

## Support Costs (Outsourced L1)

### Outsourced L1 Support Model

| Provider Type | Cost per Hour | Coverage | Monthly Cost |
|---------------|---------------|----------|--------------|
| Offshore (Philippines) | $8-12 | 24/7 | $2,500-3,500 |
| Nearshore (Eastern Europe) | $15-20 | Business hours | $2,500-3,500 |
| Onshore (US/EU) | $25-35 | Business hours | $4,000-5,500 |

### Cost per Ticket

| Complexity | Handle Time | Cost (Offshore) | Cost (Nearshore) |
|------------|-------------|-----------------|------------------|
| L1 (Password, basic) | 10 min | $1.67 | $3.33 |
| L2 (Technical issues) | 30 min | $5.00 | $10.00 |
| L3 (Escalation) | 60 min | $10.00 | $20.00 |

### Support Volume Projections

| Shops | Tickets/Month | Cost (Offshore) | Per Shop |
|-------|---------------|-----------------|----------|
| 50 | 150 | $450 | $9.00 |
| 100 | 250 | $750 | $7.50 |
| 200 | 400 | $1,200 | $6.00 |
| 500 | 800 | $2,400 | $4.80 |

**Recommendation:** Start with offshore L1, escalate L2/L3 to internal team

---

## Volume Discount Projections

### AWS Volume Discounts

#### Compute Savings Plans

| Commitment | Discount | Minimum Monthly |
|------------|----------|-----------------|
| 1-year (partial) | 20% | $500 |
| 1-year (all) | 30% | $800 |
| 3-year (partial) | 40% | $1,500 |
| 3-year (all) | 50% | $2,500 |

#### RDS Reserved Instances

| Term | Payment | Discount |
|------|---------|----------|
| 1-year | No upfront | 35% |
| 1-year | Partial upfront | 38% |
| 1-year | All upfront | 40% |
| 3-year | All upfront | 60% |

### Third-Party Volume Discounts

#### Vapi.ai

| Monthly Minutes | Price/min | Discount |
|-----------------|-----------|----------|
| 0-10,000 | $0.05 | Base |
| 10,000-50,000 | $0.045 | 10% |
| 50,000-100,000 | $0.04 | 20% |
| 100,000+ | Custom | 25%+ |

#### Twilio

| Monthly Spend | Volume Discount |
|---------------|-----------------|
| $0-500 | Standard |
| $500-2,000 | 5% |
| $2,000-5,000 | 10% |
| $5,000+ | 15% |

### Projected COGS Reduction with Scale

| Shops | COGS/Shop | Gross Margin | Key Drivers |
|-------|-----------|--------------|-------------|
| 10 | $45 | 45% | High per-unit costs |
| 50 | $38 | 54% | Begin volume discounts |
| 100 | $34 | 59% | AWS Savings Plans |
| 200 | $28 | 66% | Vapi volume tier |
| 500 | $22 | 73% | Full optimization |
| 1,000 | $18 | 78% | Enterprise rates |

---

## Cost Optimization Strategies

### 1. Database Optimization

```hcl
# Use Aurora Serverless v2 for variable workloads
resource "aws_rds_cluster" "aurora_serverless" {
  serverlessv2_scaling_configuration {
    min_capacity = 0.5  # Lowest ACU for cost savings
    max_capacity = 2    # Cap to control costs
  }
}
```

**Savings:** 40-60% vs provisioned RDS for variable workloads

### 2. Lambda Optimization

```hcl
# Use ARM64 (Graviton2) for 20% cost savings
resource "aws_lambda_function" "api" {
  architectures = ["arm64"]
  memory_size   = 512  # Right-size memory
}
```

**Savings:** 20% on Lambda compute costs

### 3. S3 Intelligent-Tiering

```hcl
# Auto-archive to cheaper storage classes
resource "aws_s3_bucket_intelligent_tiering_configuration" "archive" {
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}
```

**Savings:** 40-60% on storage for infrequently accessed data

### 4. Skip NAT Gateway

Use VPC Endpoints instead of NAT Gateway:
- S3 Gateway Endpoint: **Free**
- DynamoDB Gateway Endpoint: **Free**
- NAT Gateway: **$32/month**

**Savings:** $32/month

### 5. CloudWatch Log Retention

```hcl
resource "aws_cloudwatch_log_group" "lambda" {
  retention_in_days = 7  # Short retention for dev
}
```

**Savings:** ~$5-10/month

---

## Scaling Cost Projections

| Users | API Calls/Month | Est. AWS Cost | Est. Total Cost |
|-------|-----------------|---------------|-----------------|
| 10 | 10k | ~$50 | ~$300 |
| 100 | 100k | ~$100 | ~$400 |
| 500 | 500k | ~$200 | ~$600 |
| 1,000 | 1M | ~$350 | ~$900 |
| 5,000 | 5M | ~$800 | ~$1,800 |
| 10,000 | 10M | ~$1,500 | ~$3,200 |

---

## Cost Monitoring & Alerts

### AWS Budgets

```hcl
resource "aws_budgets_budget" "mechmind_monthly" {
  name         = "mechmind-monthly"
  limit_amount = "250"
  limit_unit   = "USD"
  
  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = ["alerts@mechmind.io"]
  }
}
```

### CloudWatch Billing Alarms

| Alarm | Threshold | Action |
|-------|-----------|--------|
| Daily spend | $10/day | Email alert |
| Monthly forecast | $300 | Email alert |
| Lambda invocations | 1M/day | Investigate |

---

## Migration Path: Free Tier → Aurora

### Month 1-12: Free Tier
```hcl
# prod.tfvars
use_free_tier         = true
use_aurora_serverless = false
db_instance_class     = "db.t3.micro"
```

### Month 13+: Aurora Migration
```hcl
# prod.tfvars
use_free_tier         = false
use_aurora_serverless = true
aurora_min_capacity   = 0.5
aurora_max_capacity   = 2
```

### Migration Steps

1. **Before migration:**
   - Create Aurora cluster alongside RDS
   - Set up DMS for data replication
   - Test application with Aurora endpoint

2. **During migration:**
   ```bash
   # Create final snapshot
   aws rds create-db-snapshot \
     --db-instance-identifier mechmind-prod-postgres \
     --db-snapshot-identifier pre-aurora-migration
   
   # Update Terraform
   terraform apply -var-file="environments/prod.tfvars"
   ```

3. **After migration:**
   - Monitor Aurora ACU usage
   - Adjust min/max capacity based on actual usage
   - Delete old RDS instance after 7 days

---

## Cost Comparison: Alternatives

| Approach | Monthly Cost | Pros | Cons |
|----------|--------------|------|------|
| **Current (Lambda + RDS)** | ~$220-800 | Serverless, pay-per-use | Cold starts |
| **EC2 + RDS** | ~$150-500 | Predictable, no cold starts | Management overhead |
| **ECS Fargate + RDS** | ~$200-600 | Containerized, flexible | More complex |
| **Elastic Beanstalk** | ~$200-500 | Easy deployment | Less control |
| **Vercel + Neon** | ~$100-300 | Fully managed | Vendor lock-in |

**Recommendation:** Current approach is optimal for startup cost/effort ratio.

---

## Action Items

1. **Immediate:**
   - [ ] Set up AWS Budget alerts at $200/month
   - [ ] Enable Cost Explorer daily reports
   - [ ] Tag all resources for cost tracking

2. **Month 6:**
   - [ ] Review actual usage vs projections
   - [ ] Optimize Lambda memory settings
   - [ ] Consider Reserved Instances if predictable

3. **Month 11:**
   - [ ] Plan Aurora migration
   - [ ] Test migration in staging
   - [ ] Schedule maintenance window

4. **Month 13+:**
   - [ ] Execute Aurora migration
   - [ ] Monitor and optimize ACU settings
   - [ ] Review third-party service costs

---

## Additional Resources

- [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Free Tier Details](https://aws.amazon.com/free/)
- [Lambda Cost Optimizer](https://github.com/alexcasalboni/aws-lambda-power-tuning)
- [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/)

---

*Last Updated: 2024*
*Next Review: Month 6*
