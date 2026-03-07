# MechMind OS Infrastructure & DevOps Architecture

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-28  
**Classification:** Internal - Engineering  
**Owner:** Platform Engineering Team

---

## Executive Summary

This document provides comprehensive technical documentation for the MechMind OS cloud infrastructure, a multi-tenant SaaS platform serving automotive repair shops. The architecture is designed with cost optimization as a primary constraint, leveraging AWS Free Tier for the first 12 months while maintaining enterprise-grade reliability, security, and observability.

### Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Monthly Infrastructure Cost (Free Tier) | <$50 | ~$3 |
| Monthly Infrastructure Cost (Month 13+) | <$250 | ~$138-278 |
| Availability SLA | 99.9% | 99.95% |
| Deployment Frequency | On-demand | Multiple daily |
| Mean Time to Recovery (MTTR) | <15 min | <10 min |
| Infrastructure as Code Coverage | 100% | 100% |

---

## Table of Contents

1. [AWS Architecture Overview](#1-aws-architecture-overview)
2. [Terraform Configuration](#2-terraform-configuration)
3. [CI/CD Pipelines](#3-cicd-pipelines)
4. [Cost Optimization Strategy](#4-cost-optimization-strategy)
5. [Security Infrastructure](#5-security-infrastructure)
6. [Deployment Automation](#6-deployment-automation)
7. [Disaster Recovery](#7-disaster-recovery)
8. [Monitoring & Observability](#8-monitoring--observability)

---

## 1. AWS Architecture Overview

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AWS CLOUD (us-east-1)                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              VPC (10.0.0.0/16)                                   │    │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐   │    │
│  │  │                         PUBLIC SUBNETS (2 AZs)                            │   │    │
│  │  │  ┌─────────────────┐                                                     │   │    │
│  │  │  │  Internet GW    │  ← Future: ALB, API Gateway, CloudFront             │   │    │
│  │  │  └─────────────────┘                                                     │   │    │
│  │  └──────────────────────────────────────────────────────────────────────────┘   │    │
│  │                                                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐   │    │
│  │  │                        PRIVATE SUBNETS (2-3 AZs)                          │   │    │
│  │  │                                                                          │   │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐     │   │    │
│  │  │  │                     LAYER 1: COMPUTE                            │     │   │    │
│  │  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │     │   │    │
│  │  │  │  │ API Main    │  │  Booking    │  │   Voice     │             │     │   │    │
│  │  │  │  │ (NestJS)    │  │   Worker    │  │  Handler    │             │     │   │    │
│  │  │  │  │ 512MB ARM64 │  │  256MB      │  │  512MB      │             │     │   │    │
│  │  │  │  │ ─────────── │  │ ─────────── │  │ ─────────── │             │     │   │    │
│  │  │  │  │ VPC Config  │  │ VPC Config  │  │ VPC Config  │             │     │   │    │
│  │  │  │  │ JSON Logs   │  │ JSON Logs   │  │ JSON Logs   │             │     │   │    │
│  │  │  │  │ DLQ Config  │  │ DLQ Config  │  │ DLQ Config  │             │     │   │    │
│  │  │  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │     │   │    │
│  │  │  └─────────┼────────────────┼────────────────┼────────────────────┘     │   │    │
│  │  │            │                │                │                           │   │    │
│  │  │            ▼                ▼                ▼                           │   │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐     │   │    │
│  │  │  │                     LAYER 2: QUEUING                            │     │   │    │
│  │  │  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │     │   │    │
│  │  │  │  │   Bookings     │ │ Notifications  │ │ Scheduled Jobs │       │     │   │    │
│  │  │  │  │     Queue      │ │     Queue      │ │     Queue      │       │     │   │    │
│  │  │  │  │  (300s vis)    │ │  (180s vis)    │ │  (300s vis)    │       │     │   │    │
│  │  │  │  └───────┬────────┘ └────────┬───────┘ └────────────────┘       │     │   │    │
│  │  │  │          │                   │                                  │     │   │    │
│  │  │  │          └───────────────────┼──────────────────┐               │     │   │    │
│  │  │  │                              ▼                  │               │     │   │    │
│  │  │  │  ┌─────────────────────────────────────────────────────────┐   │     │   │    │
│  │  │  │  │                 DEAD LETTER QUEUE (DLQ)                │   │     │   │    │
│  │  │  │  │              (14-day retention, KMS encrypted)          │   │     │   │    │
│  │  │  │  └─────────────────────────────────────────────────────────┘   │     │   │    │
│  │  │  └────────────────────────────────────────────────────────────────┘     │   │    │
│  │  │                                                                          │   │    │
│  │  │            ┌──────────────────────────────────────────────────────┐     │   │    │
│  │  │            ▼                                                      │     │   │    │
│  │  │  ┌────────────────────────────────────────────────────────────────┐   │   │    │
│  │  │  │                     LAYER 3: DATA                               │   │   │    │
│  │  │  │  ┌─────────────────────────────────────────────────────────┐   │   │   │    │
│  │  │  │  │              RDS PostgreSQL 16.2                         │   │   │   │    │
│  │  │  │  │  ┌─────────────────────────────────────────────────────┐ │   │   │   │    │
│  │  │  │  │  │  Month 1-12: db.t3.micro (Free Tier)               │ │   │   │   │    │
│  │  │  │  │  │  Month 13+: Aurora Serverless v2 (0.5-2 ACU)       │ │   │   │   │    │
│  │  │  │  │  │  Storage: 20-100GB gp3 (encrypted)                 │ │   │   │   │    │
│  │  │  │  │  │  Backup: 7 days (prod), 1 day (dev)                │ │   │   │   │    │
│  │  │  │  │  │  Multi-AZ: Optional (prod)                         │ │   │   │   │    │
│  │  │  │  │  └─────────────────────────────────────────────────────┘ │   │   │   │    │
│  │  │  │  └─────────────────────────────────────────────────────────┘   │   │   │    │
│  │  │  │                                                                  │   │   │    │
│  │  │  │  ┌─────────────────────────────────────────────────────────┐   │   │   │    │
│  │  │  │  │                    ElastiCache                          │   │   │   │    │
│  │  │  │  │           (Redis for sessions/BullMQ - Future)          │   │   │   │    │
│  │  │  │  └─────────────────────────────────────────────────────────┘   │   │   │    │
│  │  │  │                                                                  │   │   │    │
│  │  │  │  ┌─────────────────────────────────────────────────────────┐   │   │   │    │
│  │  │  │  │         S3 - Intelligent-Tiering Storage                │   │   │   │    │
│  │  │  │  │  ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐  │   │   │   │    │
│  │  │  │  │  │   Assets    │ │    Logs     │ │     Backups        │  │   │   │   │    │
│  │  │  │  │  │  (CORS)     │ │ (Glacier)   │ │  (Cross-region)    │  │   │   │   │    │
│  │  │  │  │  └─────────────┘ └─────────────┘ └────────────────────┘  │   │   │   │    │
│  │  │  │  └─────────────────────────────────────────────────────────┘   │   │   │    │
│  │  │  └────────────────────────────────────────────────────────────────┘   │   │    │
│  │  └──────────────────────────────────────────────────────────────────────────┘   │    │
│  │                                                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐   │    │
│  │  │                      VPC ENDPOINTS (Cost Optimization)                    │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐                                        │   │    │
│  │  │  │ S3 Gateway  │  │ DynamoDB    │  ← Free vs $32/mo NAT Gateway         │   │    │
│  │  │  │  (Free)     │  │  (Free)     │                                        │   │    │
│  │  │  └─────────────┘  └─────────────┘                                        │   │    │
│  │  └──────────────────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         SECURITY & IDENTITY LAYER                                │    │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    AWS Secrets Manager                                   │   │    │
│  │  │  ┌──────────────┬──────────────┬──────────────┬──────────────┐         │   │    │
│  │  │  │ DB Creds     │  Vapi Key    │ JWT Signing  │   Auth0      │         │   │    │
│  │  │  │ Twilio       │  OpenAI      │ App Config   │   Stripe     │         │   │    │
│  │  │  └──────────────┴──────────────┴──────────────┴──────────────┘         │   │    │
│  │  │  KMS Encryption (prod) | Rotation Policies | Least-privilege Access   │   │    │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │    │
│  │                                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    IAM & SECURITY GROUPS                                 │   │    │
│  │  │  ┌──────────────────┐  ┌──────────────────┐                            │   │    │
│  │  │  │ Lambda Role      │  │   RDS Security   │                            │   │    │
│  │  │  │ - Basic Exec     │  │     Group        │                            │   │    │
│  │  │  │ - VPC Access     │  │ - Port 5432      │                            │   │    │
│  │  │  │ - Secrets Read   │  │ - VPC CIDR only  │                            │   │    │
│  │  │  │ - S3 Access      │  │ - No public      │                            │   │    │
│  │  │  │ - SQS Access     │  │                  │                            │   │    │
│  │  │  │ - CloudWatch     │  │                  │                            │   │    │
│  │  │  └──────────────────┘  └──────────────────┘                            │   │    │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                    OBSERVABILITY & MONITORING LAYER                              │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │    │
│  │  │ CloudWatch Logs  │  │ CloudWatch Alarms│  │  Custom Dashboard│              │    │
│  │  │ - Lambda JSON    │  │ - Lambda Errors  │  │ - System Health  │              │    │
│  │  │ - RDS Logs       │  │ - RDS CPU/Conn   │  │ - Cost Metrics   │              │    │
│  │  │ - 7-14d retention│  │ - SQS Age/DLQ    │  │ - Performance    │              │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘              │    │
│  │                                                                                  │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                                    │    │
│  │  │  SNS Topic       │  │  AWS Budget      │                                    │    │
│  │  │  (alerts)        │  │  ($250 limit)    │                                    │    │
│  │  └──────────────────┘  └──────────────────┘                                    │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Disaster Recovery
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               DR REGION (us-west-2)                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │  Cross-Region Backups (AWS Backup)  │  S3 Replication  │  DynamoDB Global    │    │
│  │  - Daily snapshots                    - 15-min RPO       - Terraform Locks     │    │
│  │  - 30-day warm, 1-year cold           - Encrypted        - Session State       │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Inventory

| Service | Resource Name | Purpose | Configuration |
|---------|--------------|---------|---------------|
| **Lambda** | mechmind-{env}-api-main | Main API (NestJS) | 512MB, ARM64, 30s timeout, VPC |
| **Lambda** | mechmind-{env}-worker-booking | Booking processor | 256MB, ARM64, 60s timeout, SQS trigger |
| **Lambda** | mechmind-{env}-worker-notification | Notification sender | 256MB, ARM64, 30s timeout, SQS trigger |
| **Lambda** | mechmind-{env}-voice-handler | Vapi.ai webhook | 512MB, ARM64, 30s timeout, public URL |
| **RDS** | mechmind-{env}-postgres | Primary database | db.t3.micro (free tier), PostgreSQL 16.2 |
| **Aurora** | mechmind-{env}-aurora | Scale database | Serverless v2, 0.5-2 ACU (Month 13+) |
| **SQS** | mechmind-{env}-booking-confirmations | Booking queue | 300s visibility, 24h retention |
| **SQS** | mechmind-{env}-notifications | Notification queue | 180s visibility, 24h retention |
| **SQS** | mechmind-{env}-voice-calls | Voice processing | 300s visibility, 24h retention |
| **SQS** | mechmind-{env}-scheduled-jobs | Cron jobs | 300s visibility, 24h retention |
| **SQS** | mechmind-{env}-dlq | Dead letter queue | 14-day retention, KMS encrypted |
| **S3** | mechmind-{env}-storage-{account} | Main storage | Intelligent-Tiering, versioning |
| **S3** | mechmind-{env}-logs-{account} | Access logs | Glacier transition after 30 days |
| **Secrets** | mechmind-{env}/database/credentials | DB credentials | Auto-rotation ready |
| **Secrets** | mechmind-{env}/vapi/api-key | Voice AI key | Manual rotation |
| **Secrets** | mechmind-{env}/auth/jwt-signing-key | JWT secrets | 64-char random |
| **VPC** | mechmind-{env}-vpc | Network isolation | 10.0.0.0/16, 2-3 AZs |

---

## 2. Terraform Configuration

### 2.1 Module Structure

```
terraform/
├── main.tf                    # Core infrastructure (VPC, IAM, networking)
├── variables.tf               # All input variables with validation
├── outputs.tf                 # Resource outputs for downstream use
├── lambda.tf                  # Lambda functions and triggers
├── rds.tf                     # Database configuration
├── rds-monitoring.tf          # RDS-specific monitoring and failover
├── sqs.tf                     # Queue configuration
├── s3.tf                      # Storage buckets and lifecycle
├── secrets.tf                 # Secrets Manager configuration
├── monitoring.tf              # CloudWatch alarms and dashboards
├── dr-backup.tf               # Disaster recovery and cross-region backup
└── environments/
    ├── dev.tfvars             # Development environment
    ├── staging.tfvars         # Staging environment
    └── prod.tfvars            # Production environment
```

### 2.2 Core Resources Reference

#### Main Infrastructure (main.tf)

| Resource | Type | Count | Purpose |
|----------|------|-------|---------|
| `aws_vpc.main` | VPC | 1 | Network isolation (10.0.0.0/16) |
| `aws_subnet.public` | Subnet | var.az_count | Public-facing resources |
| `aws_subnet.private` | Subnet | var.az_count | Database and Lambda VPC config |
| `aws_internet_gateway.main` | IGW | 1 | Internet access for public subnets |
| `aws_vpc_endpoint.s3` | VPC Endpoint | 1 | Free S3 access from private subnets |
| `aws_vpc_endpoint.dynamodb` | VPC Endpoint | 1 | Free DynamoDB access |
| `aws_security_group.rds` | Security Group | 1 | PostgreSQL access control |
| `aws_security_group.lambda` | Security Group | 1 | Lambda egress rules |
| `aws_iam_role.lambda_execution` | IAM Role | 1 | Lambda execution role |
| `aws_iam_policy.lambda_mechmind` | IAM Policy | 1 | Custom Lambda permissions |
| `aws_ssm_parameter.*` | Parameter | 3 | Environment configuration |

#### Lambda Functions (lambda.tf)

| Resource | Runtime | Memory | Timeout | Trigger | Reserved Concurrency |
|----------|---------|--------|---------|---------|---------------------|
| `aws_lambda_function.api_main` | nodejs20.x | 512MB | 30s | Function URL | 10 (dev), -1 (prod) |
| `aws_lambda_function.worker_booking` | nodejs20.x | 256MB | 60s | SQS | N/A |
| `aws_lambda_function.worker_notification` | nodejs20.x | 256MB | 30s | SQS | N/A |
| `aws_lambda_function.voice_handler` | nodejs20.x | 512MB | 30s | Function URL | N/A |

All Lambda functions use:
- **Architecture:** ARM64 (Graviton2) for 20% cost savings
- **Logging:** JSON format to CloudWatch
- **Dead Letter Queue:** Shared DLQ for failed invocations
- **VPC Config:** Private subnets for database access

#### Database (rds.tf)

**Free Tier Configuration (Month 1-12):**

| Attribute | Value |
|-----------|-------|
| Engine | PostgreSQL 16.2 |
| Instance | db.t3.micro |
| Storage | 20GB gp3 (max 100GB) |
| Multi-AZ | false (cost savings) |
| Backup | 7 days (prod), 1 day (dev) |
| Encryption | AES-256 |
| Public | false |

**Aurora Serverless v2 (Month 13+):**

| Attribute | Value |
|-----------|-------|
| Engine | aurora-postgresql 15.4 |
| Min ACU | 0.5 (~$45/mo) |
| Max ACU | 2.0 (~$180/mo) |
| Storage | Auto-scaling |
| Reader | Optional (prod only) |

#### SQS Queues (sqs.tf)

| Queue | Visibility | Retention | DLQ | Encryption |
|-------|-----------|-----------|-----|------------|
| booking-confirmations | 300s | 86400s | Yes | SSE-SQS |
| notifications | 180s | 86400s | Yes | SSE-SQS |
| voice-calls | 300s | 86400s | Yes | SSE-SQS |
| scheduled-jobs | 300s | 86400s | Yes | SSE-SQS |
| dlq | 30s | 1209600s | N/A | SSE-SQS |

#### S3 Storage (s3.tf)

| Bucket | Versioning | Encryption | Lifecycle | CORS |
|--------|-----------|------------|-----------|------|
| mechmind-{env}-storage | Optional | AES256 | Intelligent-Tiering | Configured |
| mechmind-{env}-logs | N/A | AES256 | Glacier after 30 days | No |
| mechmind-terraform-state | Enabled | KMS | N/A | No |

Lifecycle Rules:
1. **Immediate:** Move to Intelligent-Tiering (day 0)
2. **Archive:** Glacier after 90 days
3. **Deep Archive:** After 180 days
4. **Temp Cleanup:** Delete temp/ prefix after 1 day
5. **Log Expiration:** Delete logs after 365 days

#### Secrets (secrets.tf)

| Secret Path | Contents | Rotation | Encryption |
|-------------|----------|----------|------------|
| mechmind-{env}/database/credentials | host, port, user, pass, dbname | Manual | KMS (prod) |
| mechmind-{env}/vapi/api-key | api_key | Manual | KMS (prod) |
| mechmind-{env}/twilio/credentials | account_sid, auth_token, phone | Manual | KMS (prod) |
| mechmind-{env}/auth/jwt-signing-key | signing_key, algorithm | Auto-generated | KMS (prod) |
| mechmind-{env}/auth0/credentials | domain, client_id, client_secret | Manual | KMS (prod) |
| mechmind-{env}/stripe/api-keys | publishable_key, secret_key, webhook | Manual | KMS (prod) |
| mechmind-{env}/openai/api-key | api_key | Manual | KMS (prod) |
| mechmind-{env}/app/config | Application configuration | Terraform-managed | KMS (prod) |

### 2.3 Environment Variables

#### Development (dev.tfvars)

```hcl
environment = "dev"
use_free_tier = true
use_aurora_serverless = false
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_backup_retention_days = 1
db_multi_az = false
lambda_memory_size = 512
lambda_reserved_concurrent_executions = 10
lambda_log_retention_days = 3
s3_versioning = false
monthly_budget_amount = 50
```

#### Staging (staging.tfvars)

```hcl
environment = "staging"
use_free_tier = false
use_aurora_serverless = false
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_backup_retention_days = 3
db_multi_az = false
lambda_memory_size = 512
lambda_reserved_concurrent_executions = 20
lambda_log_retention_days = 7
s3_versioning = true
monthly_budget_amount = 150
```

#### Production (prod.tfvars)

```hcl
environment = "prod"
use_free_tier = true              # Month 1-12
use_aurora_serverless = false     # Switch to true at Month 13
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_backup_retention_days = 7
db_multi_az = false               # Enable after free tier
lambda_memory_size = 512
lambda_reserved_concurrent_executions = -1  # Unlimited
lambda_log_retention_days = 14
s3_versioning = true
monthly_budget_amount = 250
```

---

## 3. CI/CD Pipelines

### 3.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GITHUB ACTIONS WORKFLOWS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    PULL REQUEST → terraform-plan.yml                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │   │
│  │  │   Checkout │→│   Setup    │→│    Plan    │→│  Post to PR    │  │   │
│  │  │   Code     │  │ Terraform  │  │  (dev/stg) │  │  (Markdown)    │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │   │
│  │                           │                                          │   │
│  │                           ▼                                          │   │
│  │                  ┌─────────────────┐                                 │   │
│  │                  │ Upload Artifact │                                 │   │
│  │                  │   (tfplan)      │                                 │   │
│  │                  └─────────────────┘                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              PUSH TO develop → deploy-dev.yml (AUTO)                  │   │
│  │                                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │  Build   │→│   Plan   │→│  Deploy  │→│  Lambda  │→│ Migrate │  │   │
│  │  │  & Test  │  │ Terraform│  │   Infra  │  │  Deploy  │  │   DB    │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │   │
│  │       │                                                        │      │   │
│  │       ▼                                                        ▼      │   │
│  │  ┌──────────┐                                           ┌──────────┐  │   │
│  │  │  Upload  │                                           │  Health  │  │   │
│  │  │ Artifact │                                           │  Check   │  │   │
│  │  │(lambda)  │                                           │  & Notify│  │   │
│  │  └──────────┘                                           └──────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │               PUSH TO main → deploy-prod.yml (APPROVAL)               │   │
│  │                                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │Pre-Check │→│  Build   │→│   Plan   │→│ APPROVAL │→│ Deploy  │  │   │
│  │  │          │  │  & Test  │  │Terraform │  │  (Manual)│  │  Infra  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │   │
│  │                                                               │       │   │
│  │                                                               ▼       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │  Lambda  │→│ Migrate  │→│  Smoke   │→│  Notify  │→│ Release │  │   │
│  │  │  Deploy  │  │   DB     │  │  Tests   │  │  (Slack) │  │(GitHub) │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │   │
│  │       │                    │        │                               │   │
│  │       └────────────────────┴────────┘                               │   │
│  │                          │                                          │   │
│  │                          ▼ (on failure)                             │   │
│  │                   ┌──────────────┐                                  │   │
│  │                   │  ROLLBACK    │                                  │   │
│  │                   │ (Auto-revert │                                  │   │
│  │                   │  to prev ver)│                                  │   │
│  │                   └──────────────┘                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │               SCHEDULED → load-tests.yml (Daily 2AM UTC)              │   │
│  │                                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ Race Cond.   │  │  Lock Cont.  │  │   Voice      │                │   │
│  │  │    Test      │  │    Test      │  │ Throughput   │                │   │
│  │  │  (k6)        │  │   (k6)       │  │   Test       │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  │         │                │                 │                         │   │
│  │         └────────────────┴─────────────────┘                         │   │
│  │                          │                                           │   │
│  │                          ▼                                           │   │
│  │                 ┌────────────────┐                                   │   │
│  │                 │ Aggregate &    │                                   │   │
│  │                 │ Notify         │                                   │   │
│  │                 └────────────────┘                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Workflow Specifications

#### terraform-plan.yml

| Trigger | Matrix | Key Steps |
|---------|--------|-----------|
| PR to main/develop | dev, staging | fmt -check, validate, plan, post to PR |
| Path filter | infrastructure/terraform/** | Artifact retention: 5 days |
| Permissions | contents: read, pull-requests: write | Uses TF_IN_AUTOMATION=true |

#### deploy-dev.yml

| Stage | Duration | Dependencies | Key Actions |
|-------|----------|--------------|-------------|
| build | ~2 min | - | npm ci, npm test, npm run build, zip package |
| deploy-infra | ~3 min | build | terraform init, plan, apply |
| deploy-lambda | ~2 min | deploy-infra | update-function-code ×4, wait, update config |
| migrate | ~1 min | deploy-lambda | get secret, npm run migrate:deploy |
| smoke-test | ~1 min | migrate | get function URL, curl /health, notify Slack |

#### deploy-prod.yml

| Stage | Duration | Dependencies | Key Actions |
|-------|----------|--------------|-------------|
| pre-check | ~1 min | - | verify staging, check blockers |
| build | ~3 min | pre-check | npm ci, test, test:integration, build |
| terraform-plan | ~3 min | build | plan, upload artifact |
| approval | - | terraform-plan | GitHub Environment protection |
| deploy-infra | ~5 min | approval | apply planned changes |
| deploy-lambda | ~3 min | deploy-infra | blue/green update ×4 functions |
| migrate | ~2 min | deploy-lambda | get secret, deploy migrations |
| smoke-test | ~2 min | migrate | health, version, db checks |
| rollback (on fail) | ~3 min | smoke-test failure | revert to previous version, notify |
| notify | ~1 min | smoke-test success | Slack, GitHub release |

#### load-tests.yml

| Test | Duration | Check | Threshold |
|------|----------|-------|-----------|
| Race Condition | 15 min | Double bookings | 0 |
| Lock Contention | 20 min | Deadlocks | 0 |
| Voice Throughput | 20 min | Lost webhooks | 0 |
| GDPR Deletion | 90 min | PII leaks | 0 |

| Metric | Alert Threshold |
|--------|-----------------|
| p99 response time | <500ms (race), <100ms (lock), <2500ms (voice) |
| Error rate | <1% |
| Lock wait p99 | <100ms |

### 3.3 Required Secrets

| Secret | Used In | Purpose |
|--------|---------|---------|
| `AWS_ACCESS_KEY_ID` | All workflows | AWS authentication |
| `AWS_SECRET_ACCESS_KEY` | All workflows | AWS authentication |
| `AWS_ACCOUNT_ID` | deploy-*.yml | Terraform backend bucket naming |
| `SLACK_WEBHOOK_URL` | deploy-*.yml, load-tests.yml | Notifications |
| `TEST_JWT_TOKEN` | load-tests.yml | Load test authentication |
| `VAPI_WEBHOOK_SECRET` | load-tests.yml | Voice test verification |
| `TEST_TENANT_ID` | load-tests.yml | Test isolation |
| `TEST_SHOP_ID` | load-tests.yml | Test isolation |
| `GITHUB_TOKEN` | deploy-prod.yml | Release creation |

---

## 4. Cost Optimization Strategy

### 4.1 Free Tier Utilization (Month 1-12)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FREE TIER BREAKDOWN                           │
│                     (~$3/month AWS costs)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RDS PostgreSQL                                           │   │
│  │  ├─ db.t3.micro: 750 hrs/month × $0 = $0                 │   │
│  │  ├─ 20GB gp3 storage = $0 (free tier)                    │   │
│  │  └─ Backup storage = $0                                 │   │
│  │  SUBTOTAL: $0/month                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Lambda (ARM64/Graviton2)                                 │   │
│  │  ├─ 1M requests/month × $0 = $0                          │   │
│  │  ├─ 400k GB-seconds × $0 = $0                            │   │
│  │  └─ ARM64: 20% cheaper when paying                        │   │
│  │  SUBTOTAL: $0/month                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SQS                                                      │   │
│  │  ├─ 1M requests/month × $0 = $0                          │   │
│  │  └─ 4 queues within free tier                             │   │
│  │  SUBTOTAL: $0/month                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  S3                                                       │   │
│  │  ├─ 5GB standard storage = $0                            │   │
│  │  ├─ 20,000 GET requests = $0                             │   │
│  │  ├─ 2,000 PUT requests = $0                              │   │
│  │  └─ Actual: ~10GB = ~$0.23/month                          │   │
│  │  SUBTOTAL: ~$0.23/month                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CloudWatch                                               │   │
│  │  ├─ 10 custom metrics = $0                               │   │
│  │  ├─ 10 alarms = $0                                       │   │
│  │  ├─ 5GB log ingestion = $0                               │   │
│  │  └─ Dashboard = $0                                       │   │
│  │  SUBTOTAL: $0/month                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Secrets Manager                                          │   │
│  │  ├─ 7 secrets × $0.40 = $2.80/month                      │   │
│  │  └─ API calls ~$0.05/month                                │   │
│  │  SUBTOTAL: ~$2.85/month                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  VPC (Cost Optimization)                                  │   │
│  │  ├─ NAT Gateway: SKIPPED ($32/month saved)               │   │
│  │  ├─ VPC Endpoints: FREE (S3, DynamoDB)                   │   │
│  │  └─ Data transfer: Within free tier                       │   │
│  │  SUBTOTAL: $0/month                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  AWS SUBTOTAL: ~$3/month                                         │
│  Third-Party (Vapi + Twilio): ~$150-225/month                    │
│  TOTAL: ~$220/month                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Post Free-Tier Costs (Month 13+)

| Component | Without NAT | With NAT | Notes |
|-----------|-------------|----------|-------|
| **RDS/Aurora** | $60-200 | $60-200 | Aurora Serverless v2 at 0.5-2 ACU |
| **Lambda** | $14 | $14 | ~900k invocations/month |
| **SQS** | $4 | $4 | ~950k requests/month |
| **S3** | $14 | $14 | 50GB + requests + transfer |
| **CloudWatch** | $6 | $6 | Logs, metrics, alarms |
| **Secrets Manager** | $3 | $3 | 7 secrets |
| **VPC** | $0 | $37 | NAT Gateway only if needed |
| **AWS TOTAL** | **$101-241** | **$138-278** | |
| **Third-Party** | $485-635 | $485-635 | Vapi + Twilio + Auth0 |
| **GRAND TOTAL** | **$586-913** | **$623-950** | |

### 4.3 Cost Per Shop (COGS Analysis)

| Category | Cost/Shop/Month | % of ARPA |
|----------|-----------------|-----------|
| AWS Infrastructure | $8.00 | 9.8% |
| Voice AI (Vapi) | $16.00 | 19.5% |
| Telephony (Twilio) | $2.66 | 3.2% |
| Payment Processing (Stripe) | $2.68 | 3.3% |
| Support (L1 Outsourced) | $5.00 | 6.1% |
| **Total COGS** | **$34.34** | **41.9%** |
| **Gross Margin** | **$47.66** | **58.1%** |

Target: Reduce COGS to $25/shop through volume discounts (70% gross margin).

### 4.4 Optimization Strategies

#### 1. Lambda ARM64 (Graviton2)
```hcl
resource "aws_lambda_function" "api" {
  architectures = ["arm64"]  # 20% cost savings
  memory_size   = 512
}
```

#### 2. Skip NAT Gateway
```
Before: NAT Gateway = $32/month
After:  VPC Endpoints (S3, DynamoDB) = $0/month
Savings: $32/month (100%)
```

#### 3. S3 Intelligent-Tiering
```hcl
resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}
```
Savings: 40-60% for infrequently accessed data.

#### 4. Aurora Serverless v2 Scaling
```hcl
resource "aws_rds_cluster" "aurora" {
  serverlessv2_scaling_configuration {
    min_capacity = 0.5  # Lowest ACU
    max_capacity = 2    # Cap to control costs
  }
}
```
Savings: 40-60% vs provisioned RDS for variable workloads.

#### 5. Short Log Retention in Dev
```hcl
resource "aws_cloudwatch_log_group" "lambda" {
  retention_in_days = 3  # vs 14 in prod
}
```

### 4.5 Volume Discount Projections

| Shops | COGS/Shop | Gross Margin | Key Drivers |
|-------|-----------|--------------|-------------|
| 10 | $45 | 45% | High per-unit costs |
| 50 | $38 | 54% | Begin volume discounts |
| 100 | $34 | 59% | AWS Savings Plans eligible |
| 200 | $28 | 66% | Vapi volume tier |
| 500 | $22 | 73% | Full optimization |
| 1,000 | $18 | 78% | Enterprise rates |

---

## 5. Security Infrastructure

### 5.1 Security Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 5: APPLICATION SECURITY                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  • JWT token validation                                               │   │
│  │  • Input validation & sanitization                                    │   │
│  │  • Rate limiting (future: API Gateway)                               │   │
│  │  • CORS configuration                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  LAYER 4: NETWORK SECURITY                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  • VPC Isolation (10.0.0.0/16)                                        │   │
│  │  • Private subnets for database                                       │   │
│  │  • Security groups (least privilege)                                  │   │
│  │  • VPC Endpoints (no NAT = no public IP)                             │   │
│  │  • TLS 1.2+ enforced                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  LAYER 3: DATA SECURITY                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  • RDS encryption at rest (AES-256)                                   │   │
│  │  • S3 SSE-S3 encryption                                               │   │
│  │  • SQS SSE encryption                                                 │   │
│  │  • Secrets Manager with KMS (prod)                                   │   │
│  │  • Parameter Store for config                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  LAYER 2: ACCESS CONTROL                                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  • IAM least-privilege policies                                       │   │
│  │  • Role-based access (Lambda execution role)                          │   │
│  │  • Service-linked roles only                                          │   │
│  │  • No long-term access keys                                           │   │
│  │  • Cross-account access denied by default                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  LAYER 1: AUDIT & COMPLIANCE                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  • CloudWatch Logs (JSON structured)                                  │   │
│  │  • CloudTrail (enable in production)                                  │   │
│  │  • AWS Config rules (production)                                      │   │
│  │  • Backup vault lock (compliance)                                     │   │
│  │  • Resource tagging for cost/security tracking                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 IAM Policies

#### Lambda Execution Role Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${region}:${account}:secret:mechmind/*"
      ]
    },
    {
      "Sid": "SQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:${region}:${account}:mechmind-*"
      ]
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::mechmind-*",
        "arn:aws:s3:::mechmind-*/*"
      ]
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "MechMind/Custom"
        }
      }
    }
  ]
}
```

#### RDS Security Group

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| Ingress | TCP | 5432 | VPC CIDR | PostgreSQL from VPC only |
| Egress | All | All | 0.0.0.0/0 | Required for updates |

#### Lambda Security Group

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| Egress | All | All | 0.0.0.0/0 | Outbound internet (via VPC endpoints) |

### 5.3 Encryption Configuration

| Resource | At-Rest | In-Transit | Key Management |
|----------|---------|------------|----------------|
| RDS PostgreSQL | AES-256 | TLS 1.2+ | AWS managed |
| RDS Aurora | AES-256 | TLS 1.2+ | AWS managed |
| S3 Buckets | SSE-S3 | TLS 1.2+ | AWS managed |
| S3 Terraform State | SSE-KMS | TLS 1.2+ | aws/s3 key |
| SQS Queues | SSE-SQS | TLS 1.2+ | AWS managed |
| Secrets Manager | KMS (prod) | TLS 1.2+ | Customer managed |
| Lambda Environment | N/A | N/A | Encrypted by AWS |

### 5.4 VPC Configuration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    VPC: mechmind-{env}-vpc                              │
│                         CIDR: 10.0.0.0/16                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      AVAILABILITY ZONE 1a                        │   │
│  │  ┌─────────────────────┐      ┌─────────────────────┐          │   │
│  │  │   Public Subnet     │      │   Private Subnet    │          │   │
│  │  │   10.0.1.0/24       │      │   10.0.11.0/24      │          │   │
│  │  │   ─────────────     │      │   ─────────────     │          │   │
│  │  │   Route: IGW        │      │   Route: Local only │          │   │
│  │  │   (Future ALB)      │      │   Lambda + RDS      │          │   │
│  │  └─────────────────────┘      └─────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      AVAILABILITY ZONE 1b                        │   │
│  │  ┌─────────────────────┐      ┌─────────────────────┐          │   │
│  │  │   Public Subnet     │      │   Private Subnet    │          │   │
│  │  │   10.0.2.0/24       │      │   10.0.12.0/24      │          │   │
│  │  │   ─────────────     │      │   ─────────────     │          │   │
│  │  │   Route: IGW        │      │   Route: Local only │          │   │
│  │  │   (Future ALB)      │      │   Lambda + RDS      │          │   │
│  │  └─────────────────────┘      └─────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      AVAILABILITY ZONE 1c (prod)                 │   │
│  │  ┌─────────────────────┐      ┌─────────────────────┐          │   │
│  │  │   Public Subnet     │      │   Private Subnet    │          │   │
│  │  │   10.0.3.0/24       │      │   10.0.13.0/24      │          │   │
│  │  └─────────────────────┘      └─────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  VPC Endpoints (Gateway - Free):                                        │
│  • com.amazonaws.{region}.s3                                           │
│  • com.amazonaws.{region}.dynamodb                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Security Checklist

| Layer | Control | Status | Terraform Resource |
|-------|---------|--------|-------------------|
| Network | VPC isolation | ✅ | `aws_vpc.main` |
| Network | Private subnets for DB | ✅ | `aws_subnet.private` |
| Network | Security group least privilege | ✅ | `aws_security_group.rds` |
| Network | VPC endpoints vs NAT Gateway | ✅ | `aws_vpc_endpoint.s3` |
| Data | RDS encryption at rest | ✅ | `storage_encrypted = true` |
| Data | S3 bucket encryption | ✅ | `aws_s3_bucket_server_side_encryption_configuration` |
| Data | S3 block public access | ✅ | `aws_s3_bucket_public_access_block` |
| Data | SQS encryption | ✅ | `kms_master_key_id = "alias/aws/sqs"` |
| Secrets | Secrets Manager usage | ✅ | `aws_secretsmanager_secret.*` |
| Secrets | KMS encryption (prod) | ✅ | `aws_kms_key.mechmind_secrets` |
| IAM | Lambda least privilege | ✅ | `aws_iam_policy.lambda_mechmind` |
| IAM | No hardcoded credentials | ✅ | All via Secrets Manager |
| Audit | CloudWatch Logs | ✅ | `aws_cloudwatch_log_group.*` |
| Audit | CloudTrail (enable prod) | ⏳ | Manual enable |
| Audit | AWS Config (enable prod) | ⏳ | Manual enable |
| Backup | Cross-region backup | ✅ | `dr-backup.tf` |
| Backup | Vault lock | ✅ | `aws_backup_vault_lock_configuration` |

---

## 6. Deployment Automation

### 6.1 Deployment Scripts

#### deploy.sh - Full Deployment Automation

```bash
# Usage: ./deploy.sh <environment> [command]
# Environments: dev, staging, prod
# Commands: infra, build, lambda, migrate, health, full

# Examples:
./scripts/deploy.sh dev full        # Complete deployment
./scripts/deploy.sh prod infra      # Infrastructure only
./scripts/deploy.sh staging lambda  # Lambda deployment
./scripts/deploy.sh dev migrate     # Database migrations
```

| Function | Purpose | Key Actions |
|----------|---------|-------------|
| `check_aws_credentials` | Pre-flight validation | `aws sts get-caller-identity` |
| `check_terraform` | Tool validation | Version check |
| `deploy_infrastructure` | Terraform workflow | init, fmt, validate, plan, apply |
| `build_lambda` | Package creation | npm ci, test, build, zip |
| `deploy_lambda` | Function deployment | update-function-code ×4 |
| `run_migrations` | Database updates | Secrets Manager → migrate:deploy |
| `health_check` | Verification | Get URL, curl /health |

#### migrate.sh - Database Migration Runner

```bash
# Usage: ./migrate.sh <environment> <command>
# Commands: status, deploy, create, reset, seed, validate, generate, studio, backup

# Examples:
./scripts/migrate.sh dev status           # Check migration status
./scripts/migrate.sh prod deploy          # Deploy to production (requires confirmation)
./scripts/migrate.sh dev create add_users # Create new migration
./scripts/migrate.sh prod backup          # Create backup
```

| Command | Action | Safety |
|---------|--------|--------|
| `status` | Show pending migrations | Safe |
| `deploy` | Apply pending migrations | Confirms for prod |
| `create` | Generate new migration | Safe |
| `reset` | Drop and recreate database | Requires "RESET" confirmation |
| `seed` | Run database seeders | Safe |
| `validate` | Check Prisma schema | Safe |
| `generate` | Generate Prisma client | Safe |
| `studio` | Open Prisma Studio | Safe |
| `backup` | pg_dump to S3 | Safe |

### 6.2 Deployment Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FULL DEPLOYMENT SEQUENCE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: PRE-FLIGHT CHECKS                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ AWS Creds    │→│ Terraform    │→│ Node.js      │                       │
│  │ Valid?       │  │ Installed?   │  │ Installed?   │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│         │                                                             │      │
│         └─────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  PHASE 2: INFRASTRUCTURE (Terraform)                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ terraform    │→│ terraform    │→│ terraform    │→│ terraform    │     │
│  │ init         │  │ validate     │  │ plan         │  │ apply        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │               │
│                                                              ▼               │
│  PHASE 3: BUILD                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ npm ci       │→│ npm test     │→│ npm run      │→│ zip package  │     │
│  │              │  │              │  │ build        │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │               │
│                                                              ▼               │
│  PHASE 4: LAMBDA DEPLOYMENT                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ API Main     │→│ Booking      │→│ Notification │→│ Voice        │     │
│  │ Update Code  │  │ Worker       │  │ Worker       │  │ Handler      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                    │                    │                    │     │
│         └────────────────────┴────────────────────┴────────────────────┘     │
│                                           │                                  │
│                                           ▼                                  │
│  PHASE 5: DATABASE MIGRATION                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ Get Secret   │→│ Set          │→│ npm run      │                       │
│  │ from SM      │  │ DATABASE_URL │  │ migrate:deploy│                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                           │                                  │
│                                           ▼                                  │
│  PHASE 6: VERIFICATION                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ Get Lambda   │→│ curl /health │→│ Notify       │                       │
│  │ URL          │  │ (retries)    │  │ Slack        │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Rollback Procedures

#### Automatic Rollback (GitHub Actions)

```yaml
# On smoke-test failure in deploy-prod.yml
rollback:
  if: failure()
  steps:
    - Get previous Lambda version
    - Update alias to previous version
    - Notify Slack of rollback
```

#### Manual Rollback (CLI)

```bash
# Rollback Lambda to previous version
for func in mechmind-prod-api-main mechmind-prod-worker-booking \
            mechmind-prod-worker-notification mechmind-prod-voice-handler; do
    VERSION=$(aws lambda list-versions-by-function \
        --function-name $func \
        --query 'Versions[-2].Version' \
        --output text)
    aws lambda update-alias \
        --function-name $func \
        --name LIVE \
        --function-version $VERSION
done

# Rollback database (if needed)
./scripts/dr-failover.sh pit-restore "2024-01-15 10:00:00"
```

---

## 7. Disaster Recovery

### 7.1 DR Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DISASTER RECOVERY STRATEGY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY REGION (us-east-1)                      DR REGION (us-west-2)       │
│  ────────────────────────                        ────────────────────        │
│                                                                              │
│  ┌──────────────────────┐                        ┌──────────────────────┐   │
│  │   RDS PostgreSQL     │                        │  Cross-Region        │   │
│  │   or Aurora          │───────────────────────▶│  Backup Restore      │   │
│  │                      │   Daily snapshots      │                      │   │
│  └──────────────────────┘   AWS Backup           └──────────────────────┘   │
│           │                                            │                     │
│           │                                            │                     │
│           ▼                                            ▼                     │
│  ┌──────────────────────┐                        ┌──────────────────────┐   │
│  │   S3 Main Bucket     │───────────────────────▶│  S3 DR Bucket        │   │
│  │   (Intelligent-Tier) │   CRR - 15 min RPO     │  (Versioned)         │   │
│  └──────────────────────┘                        └──────────────────────┘   │
│                                                                              │
│  RPO: 15 minutes (S3), 24 hours (RDS via daily backup)                      │
│  RTO: 30 minutes (manual failover), 4 hours (cross-region restore)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Backup Configuration

| Resource | Frequency | Retention | Destination | Method |
|----------|-----------|-----------|-------------|--------|
| RDS | Daily 02:00 UTC | 30 days warm, 1 year cold | Primary + DR vault | AWS Backup |
| RDS | Weekly (Sundays) | 7 years (compliance) | Primary + DR vault | AWS Backup |
| S3 | Continuous | Versioned | DR bucket (us-west-2) | Cross-Region Replication |
| Terraform State | Every apply | Versioned | S3 with DynamoDB locks | Native |

### 7.3 DR Failover Script (dr-failover.sh)

| Command | Purpose | Recovery Time |
|---------|---------|---------------|
| `status` | Check current RDS status | - |
| `failover` | Multi-AZ failover (same region) | 1-2 min |
| `pit-restore` | Point-in-time restore | 15-30 min |
| `dr-failover` | Cross-region activation | 30-60 min |
| `verify` | Data integrity check | - |
| `read-only` | Set read-only mode | Immediate |

### 7.4 Backup Vault Lock (Compliance)

```hcl
resource "aws_backup_vault_lock_configuration" "primary" {
  backup_vault_name   = aws_backup_vault.primary.name
  min_retention_days  = 7
  max_retention_days  = 365
  changeable_for_days = 3  # Compliance grace period
}
```

---

## 8. Monitoring & Observability

### 8.1 CloudWatch Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MECHMIND OPERATIONS DASHBOARD                             │
│                    Environment: {env} | Region: {region}                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐             │
│  │   LAMBDA INVOCATIONS       │  │   LAMBDA ERRORS            │             │
│  │   ─────────────────────    │  │   ─────────────────────    │             │
│  │   [api-main]      ████████ │  │   [api-main]      ▁▂▃▅▆    │             │
│  │   [worker-booking] █████   │  │   [worker-booking] ▁▂      │             │
│  │   [worker-notify]  ████    │  │   [worker-notify]  ▁       │             │
│  │                            │  │                            │             │
│  │   Total: 12.5K / 5min      │  │   Total: 3 / 5min          │             │
│  └────────────────────────────┘  └────────────────────────────┘             │
│                                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐             │
│  │   RDS CPU & CONNECTIONS    │  │   SQS MESSAGE COUNT        │             │
│  │   ─────────────────────    │  │   ─────────────────────    │             │
│  │   CPU ████████████████████ │  │   bookings  ████████       │             │
│  │   Conn ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁     │  │   notify    ████           │             │
│  │                            │  │   voice     ██             │             │
│  │   CPU: 45% | Conn: 12/100  │  │   Age: 0.5s (healthy)      │             │
│  └────────────────────────────┘  └────────────────────────────┘             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │   RECENT ERRORS (CloudWatch Logs Insights)                 │             │
│  │   ─────────────────────────────────────                    │             │
│  │   2024-01-15 14:32:15 ERROR [api-main] Database timeout    │             │
│  │   2024-01-15 14:28:42 ERROR [worker] SQS message failed    │             │
│  │   2024-01-15 14:15:03 WARN  [api-main] High latency        │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │   ACTIVE ALARMS                                            │             │
│  │   ─────────────                                            │             │
│  │   🟢 lambda-errors    🟢 rds-cpu    🟢 sqs-dlq-messages    │             │
│  │   🟢 rds-storage      🟢 rds-conn   🟢 backup-job-failed   │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Alert Configuration

| Alarm | Metric | Threshold | Evaluation | Action |
|-------|--------|-----------|------------|--------|
| lambda-errors | Errors | >5 | 2 periods (10min) | SNS → Email |
| lambda-duration | Duration | >20s | 3 periods (15min) | SNS → Email |
| lambda-throttles | Throttles | >0 | 1 period (5min) | SNS → Email |
| rds-cpu | CPUUtilization | >80% | 3 periods (15min) | SNS → Email |
| rds-storage | FreeStorageSpace | <2GB | 1 period (5min) | SNS → Email |
| rds-connections | DatabaseConnections | >80 | 2 periods (10min) | SNS → Email |
| rds-failover | Failover | >0 | 1 period (1min) | SNS → Email |
| sqs-dlq-messages | ApproximateNumberOfMessagesVisible | >0 | 1 period (5min) | SNS → Email |
| sqs-age | ApproximateAgeOfOldestMessage | >300s | 2 periods (10min) | SNS → Email |
| backup-job-failed | NumberOfBackupJobsFailed | >0 | 1 period (5min) | SNS → Email |
| copy-job-failed | NumberOfCopyJobsFailed | >0 | 1 period (5min) | SNS → Email |

### 8.3 Log Management

| Log Group | Retention | Format | Key Fields |
|-----------|-----------|--------|------------|
| /aws/lambda/mechmind-{env}-api-main | 7-14 days | JSON | timestamp, level, message, requestId |
| /aws/lambda/mechmind-{env}-worker-booking | 7-14 days | JSON | timestamp, level, message, jobId |
| /aws/lambda/mechmind-{env}-worker-notification | 7-14 days | JSON | timestamp, level, message |
| /aws/lambda/mechmind-{env}-voice-handler | 7-14 days | JSON | timestamp, level, message, callId |
| /aws/rds/instance/{db-id}/postgresql | 7 days | PostgreSQL | timestamp, level, message |

### 8.4 Custom Metrics

```hcl
# Lambda custom metrics
resource "aws_cloudwatch_log_metric_filter" "rds_errors" {
  name           = "${local.name_prefix}-rds-errors"
  pattern        = "[date, time, env, session, logLevel=ERROR, ...]"
  log_group_name = "/aws/rds/instance/.../postgresql"
  
  metric_transformation {
    name          = "RDSErrorCount"
    namespace     = "MechMind/RDS"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}
```

---

## 9. Appendices

### 9.1 Terraform Output Reference

| Output | Description | Sensitive |
|--------|-------------|-----------|
| `vpc_id` | VPC identifier | No |
| `database_endpoint` | RDS/Aurora endpoint | Yes |
| `lambda_api_function_url` | Public API URL | No |
| `sqs_booking_queue_url` | Booking queue URL | No |
| `s3_bucket_name` | Main storage bucket | No |
| `secrets_manager_db_secret_arn` | Database secret ARN | No |

### 9.2 Environment Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `production` |
| `DB_HOST` | Database host | `mechmind-prod-postgres.xxx.us-east-1.rds.amazonaws.com` |
| `DB_SECRET_ARN` | Database credentials secret | `arn:aws:secretsmanager:...` |
| `JWT_SECRET_ARN` | JWT signing key secret | `arn:aws:secretsmanager:...` |
| `VAPI_KEY_ARN` | Vapi.ai API key secret | `arn:aws:secretsmanager:...` |
| `SQS_BOOKING_QUEUE_URL` | Booking confirmations queue | `https://sqs.us-east-1...` |
| `SQS_NOTIFY_QUEUE_URL` | Notifications queue | `https://sqs.us-east-1...` |
| `S3_BUCKET_NAME` | Main storage bucket | `mechmind-prod-storage-123456789` |
| `LOG_LEVEL` | Logging level | `info` (prod), `debug` (dev) |

### 9.3 Cost Monitoring

```hcl
# Monthly budget alert
resource "aws_budgets_budget" "mechmind_monthly" {
  name         = "mechmind-monthly"
  budget_type  = "COST"
  limit_amount = "250"
  limit_unit   = "USD"
  
  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = ["alerts@mechmind.io"]
  }
  
  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 100
    threshold_type      = "PERCENTAGE"
    notification_type   = "FORECASTED"
    subscriber_email_addresses = ["alerts@mechmind.io"]
  }
}
```

### 9.4 Support Contacts

| Channel | Contact | Purpose |
|---------|---------|---------|
| Slack | #mechmind-platform | Real-time support |
| Email | platform@mechmind.io | Non-urgent issues |
| PagerDuty | On-call rotation | Production incidents |
| GitHub | mechmind-os/issues | Bug reports |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-28 | Platform Team | Initial release |

---

**END OF DOCUMENT**
