# MechMind OS v10 - Production Readiness Validation Plan 2026

**Version:** 2026.1  
**Date:** March 2026  
**Target Score:** 8.5/10 → 10/10  
**Estimated Duration:** 8 hours (1 intensive day)

---

## Executive Summary

This document outlines the complete validation plan to move MechMind OS from **documented architecture** to **battle-tested production readiness**. All errors from previous iterations have been corrected based on 2026 best practices from AWS, Grafana Labs, and EDPB.

### Key Corrections Applied (2026)

| Issue | Previous (Wrong) | Corrected (2026) |
|-------|------------------|------------------|
| k6 JSON Output | `cat results.json \| jq '.metrics'` | `handleSummary()` + `JSON.stringify(data)` |
| Lambda Memory | "512MB universal best practice" | Trade-off analysis: 512MB optimal for NestJS |
| GDPR Timing | `time curl` (wrong) | Separate: ACK time vs Execution time (async) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ API Gateway  │───▶│   Lambda     │───▶│ RDS PostgreSQL│      │
│  │   (HTTP)     │    │  (ARM64/512MB│    │  (Multi-AZ)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                     │              │
│         └───────────────────┴─────────────────────┘              │
│                        VPC (Private Subnets)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Infrastructure Deployment (4 hours)

### 1.1 AWS Setup

```bash
# Configure AWS CLI
aws configure
# OR use environment variables:
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=us-east-1

# Verify access
aws sts get-caller-identity
```

### 1.2 Terraform Deploy

```bash
cd infrastructure/terraform/environments/dev

# Initialize
terraform init

# Plan (review carefully)
terraform plan -out=tfplan

# Apply (takes ~15 min for RDS creation)
terraform apply tfplan
```

**Expected Outputs:**
- `api_gateway_endpoint`: https://xxx.execute-api.us-east-1.amazonaws.com/dev
- `lambda_function_url`: https://xxx.lambda-url.us-east-1.on.aws/
- `rds_endpoint`: mechmind-dev-xxx.cluster-xxx.us-east-1.rds.amazonaws.com

### 1.3 Database Migration

```bash
# Get connection string from Secrets Manager
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id mechmind/dev/database/credentials-xxx \
  --query SecretString --output text | jq -r '.url')

# Run Prisma migrations
cd backend
npx prisma migrate deploy

# Verify
psql $DATABASE_URL -c "\dt"
```

### 1.4 Lambda Deployment (AWS Lambda Web Adapter 2026)

```bash
# Lambda Web Adapter is a Lambda Layer (NOT an npm package)
# No serverless-express needed - cleaner, faster, AWS-native

# 1. Build TypeScript
npm run build

# 2. Package for deployment
./infrastructure/scripts/package-lambda.sh

# 3. Deploy (using AWS CLI + Lambda Web Adapter layer)
./infrastructure/scripts/deploy-lambda.sh dev
```

**Lambda Web Adapter Configuration**:
```yaml
# template.yaml (AWS SAM)
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: dist/
      Handler: lambda.handler
      Runtime: nodejs20.x
      Architectures: [arm64]
      MemorySize: 512  # Or 256 for dev
      Layers:
        # AWS Lambda Web Adapter Layer (2026 latest)
        - !Sub 'arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerArm64:23'
      Environment:
        Variables:
          AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
          PORT: 3000
          NODE_ENV: production
```

**Migration from serverless-express**:
- ✅ Remove `@codegenie/serverless-express` dependency
- ✅ Simpler handler code (no wrapper overhead)
- ✅ ~200ms faster cold start
- ✅ Native AWS support and security patches

**Source**: https://github.com/awslabs/aws-lambda-web-adapter

### Validation Checklist

- [ ] Lambda ARM64 architecture
- [ ] 512MB memory allocation
- [ ] VPC access configured
- [ ] RDS connectivity verified
- [ ] Secrets Manager integration
- [ ] CloudWatch logs enabled

---

## Step 2: k6 Race Condition Test (2 hours)

### 2.1 Install k6

```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo gpg -k
curl -s https://dl.k6.io/key.gpg | sudo gpg --no-default-keyring --keyring gnupg-ring:/etc/apt/trusted.gpg.d/k6.gpg --import
chmod 644 /etc/apt/trusted.gpg.d/k6.gpg
sudo apt-get update
sudo apt-get install k6
```

### 2.2 Create Test Slot

```bash
export API_URL=$(terraform output -raw api_gateway_endpoint)
export JWT_TOKEN=$(./scripts/get-test-jwt.sh)

# Create slot
SLOT_RESPONSE=$(curl -X POST "$API_URL/v1/booking-slots" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mechanicId": "mech-test-001",
    "startTime": "2026-03-15T10:00:00Z",
    "endTime": "2026-03-15T11:00:00Z"
  }')

export TEST_SLOT_ID=$(echo $SLOT_RESPONSE | jq -r '.id')
```

### 2.3 Run Test

```bash
cd tests/load/k6

# Execute race condition test
k6 run race-condition-2026.js \
  -e API_URL=$API_URL \
  -e TEST_SLOT_ID=$TEST_SLOT_ID \
  -e JWT_TOKEN=$JWT_TOKEN
```

### 2.4 Verify Results

```bash
# Check summary.json (VERO JSON, non JSONLINES)
cat k6-summary.json | jq '
{
  score: .thresholds.all_passed,
  p95_latency: .results.latency_ms.p95,
  status_check: .race_condition_analysis
}'

# Expected output:
# {
#   "score": true,
#   "p95_latency": 245,
#   "status_check": {
#     "expected_success": 1,
#     "expected_conflicts": 99,
#     "double_booking_verification": "REQUIRES_DB_CHECK"
#   }
# }

# Database verification
psql $DATABASE_URL -c "
  SELECT COUNT(*) as booking_count 
  FROM bookings 
  WHERE slot_id = '$TEST_SLOT_ID';
"
# Expected: 1
```

### Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Concurrent Users | 100 | ✅ |
| Success (201) | 1 | ✅ |
| Conflicts (409) | 99 | ✅ |
| Double Bookings | 0 | ✅ CRITICAL |
| p95 Latency | < 500ms | ✅ |
| Error Rate | < 1% | ✅ |

---

## Step 3: GDPR Deletion Test (2 hours)

### 3.1 Create Test Data

```bash
# Create 100 test customers with bookings
psql $DATABASE_URL << 'EOF'
DO $$
DECLARE
  i INT;
  tenant_id UUID := 'tenant-test-001';
  customer_id UUID;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO customers_encrypted (
      id, tenant_id, 
      phone_encrypted, email_encrypted, name_encrypted,
      gdpr_consent, gdpr_consent_date
    ) VALUES (
      gen_random_uuid(), tenant_id,
      pgp_sym_encrypt('+39-TEST-' || i::text, 'key'),
      pgp_sym_encrypt('test' || i || '@example.com', 'key'),
      pgp_sym_encrypt('Test User ' || i, 'key'),
      true, NOW()
    ) RETURNING id INTO customer_id;
    
    INSERT INTO bookings (id, tenant_id, customer_id, status)
    VALUES (gen_random_uuid(), tenant_id, customer_id, 'CONFIRMED');
  END LOOP;
END $$;
EOF
```

### 3.2 Execute Deletion Test

```bash
cd tests/gdpr
./validate-deletion-2026.sh $API_URL $JWT_TOKEN
```

### 3.3 Timing Breakdown (GDPR Art. 17 - Right to Erasure)

**⚠️ Critical Clarification**: GDPR mandates **30-day response** from deletion request, NOT 5-minute execution. "< 5min execution" is **operational excellence**, not **legal requirement**.

| Phase | Target | Legal Requirement | Notes |
|-------|--------|-------------------|-------|
| ACK HTTP Response | < 2,000ms | Immediate acknowledgment | API must respond immediately |
| Job Queued | < 5 sec | Background processing starts | BullMQ adds to queue |
| Execution Time (async) | < 24 hours (operational goal) | **NO deadline** | Job runs in background |
| Response to Customer | < 30 days | **GDPR Art. 17 MANDATORY** | Confirm deletion + provide report |
| Max Extension | 60 days | EDPB 2025 tolerance | Only with documented justification |

**Legal Framework**:
- **GDPR Art. 17(3)**: Controller must respond "without undue delay and in any event within one month"
- **EDPB Guidelines 2025**: Extension to 2 months (60 days) permissible for complex requests
- **MechMind Operational Goal**: < 5 min execution (best-in-class, not legally required)

**Source**: 
- GDPR Art. 17: https://gdpr-info.eu/art-17-gdpr/
- EDPB 2025 Guidelines: https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines

### 3.4 Verification Checklist

- [ ] PII fields NULL (phone, email, name)
- [ ] `is_deleted` = true
- [ ] `anonymized_at` timestamp set
- [ ] Booking references preserved (anonymized)
- [ ] Audit log entries created
- [ ] BullMQ job completed

---

## Master Validation Script

Execute all tests sequentially:

```bash
cd tests
./validation-master-2026.sh $API_URL $JWT_TOKEN
```

### Scoring Matrix

| Step | Max Score | Criteria |
|------|-----------|----------|
| Infrastructure | 2 | Lambda + RDS deployed |
| k6 Race Test | 4 | 0 double bookings + latency |
| GDPR Deletion | 4 | PII cleared + audit preserved |
| **Total** | **10** | **≥ 8 = Production Ready** |

---

## File Structure

```
mechmind-os/
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── vpc/              # VPC + subnets + endpoints
│   │   │   └── lambda-rds/       # Lambda + RDS + Secrets Manager
│   │   └── environments/
│   │       └── dev/              # Dev environment config
│   └── scripts/
│       ├── setup-aws.sh          # AWS CLI setup
│       └── deploy-lambda.sh      # Lambda deployment
├── backend/
│   └── src/
│       └── lambda.ts             # AWS Lambda handler
└── tests/
    ├── validation-master-2026.sh # Master test script
    ├── load/k6/
    │   └── race-condition-2026.js  # FIXED: handleSummary()
    └── gdpr/
        └── validate-deletion-2026.sh # FIXED: async timing
```

---

## 2026 Best Practices References

### AWS Lambda
- **Memory**: 512MB for CPU-bound (NestJS + Prisma)
- **Architecture**: ARM64 Graviton2 (20% cost savings)
- **Cold Start**: ~1s at 512MB
- **VPC**: Use endpoints to reduce NAT Gateway costs

### k6 Testing
- **JSON Output**: Use `handleSummary()` for aggregated JSON
- **Race Conditions**: Shared iterations for exact concurrency
- **Thresholds**: SLO-based (p95 < 500ms)

### GDPR (EDPB 2026)
- **Art. 17**: Right to erasure
- **SLA**: 30 days (up to 45 with justification)
- **Best-in-class**: < 5 minutes execution
- **Audit**: Preserve deletion records

---

## Troubleshooting

### Lambda Cold Start > 2s
- Check VPC configuration
- Enable Provisioned Concurrency if needed
- Verify no synchronous initialization

### k6 Test Fails
- Verify slot exists and is available
- Check JWT token validity
- Review CloudWatch logs for errors

### GDPR Job Timeout
- Check BullMQ worker status
- Verify database connection pool
- Review job logs in CloudWatch

---

## Next Steps After Validation

1. **Enable Monitoring**
   - CloudWatch dashboards
   - PagerDuty integration
   - Custom metrics (advisory lock wait times)

2. **Security Hardening**
   - WAF configuration
   - AWS Shield (if needed)
   - Penetration testing

3. **Operational Readiness**
   - Runbook documentation
   - On-call rotation
   - Quarterly DR drills

---

**Document Version:** 2026.1  
**Last Updated:** March 2026  
**Owner:** Platform Engineering Team
