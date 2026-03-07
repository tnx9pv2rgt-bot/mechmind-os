# MechMind OS v10 - Notifications & Observability Deployment Guide

## 1. Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5.0
- Node.js 20 LTS
- Docker and Docker Compose

## 2. Infrastructure Deployment

### 2.1 Deploy AWS SES and SNS

```bash
cd infrastructure/terraform
terraform init
terraform plan -var="environment=production"
terraform apply
```

### 2.2 Configure DNS Records

After Terraform apply, add these DNS records:

```
# DKIM Records (3 CNAME records)
_xxxx._domainkey.mechmind.io CNAME xxxx.dkim.amazonses.com
_yyyy._domainkey.mechmind.io CNAME yyyy.dkim.amazonses.com
_zzzz._domainkey.mechmind.io CNAME zzzz.dkim.amazonses.com

# SPF
mechmind.io TXT "v=spf1 include:amazonses.com ~all"

# DMARC
_dmarc.mechmind.io TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@mechmind.io"
```

## 3. Backend Deployment

### 3.1 Environment Variables

Add to `backend/.env`:

```bash
# WebSocket
WS_REDIS_URL=redis://localhost:6379

# AWS SES
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
SES_FROM_EMAIL=noreply@mechmind.io
SES_CONFIGURATION_SET=mechmind-production

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.datadoghq.com
OTEL_SERVICE_NAME=mechmind-api
DD_API_KEY=xxx
```

### 3.2 Install Dependencies

```bash
cd backend
npm install
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io aws-sdk
```

### 3.3 Run Migrations

```bash
npx prisma migrate deploy
```

### 3.4 Start Application

```bash
npm run start:prod
```

## 4. Frontend Deployment

### 4.1 Environment Variables

Add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_WS_URL=wss://api.mechmind.io
```

### 4.2 Install Dependencies

```bash
cd frontend
npm install
npm install socket.io-client
```

### 4.3 Build and Deploy

```bash
npm run build
vercel --prod
```

## 5. Testing

### 5.1 Run Unit Tests

```bash
cd backend
npm test -- --testPathPattern=notifications
```

### 5.2 Run Integration Tests

```bash
npm run test:integration
```

### 5.3 Run E2E Tests

```bash
cd tests/e2e
npx playwright test
```

## 6. Verification

### 6.1 Check WebSocket Connection

Open browser console on dashboard:

```javascript
// Should show WebSocket connected
console.log(socket.connected); // true
```

### 6.2 Test Email Delivery

```bash
curl -X POST https://api.mechmind.io/notifications/test \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"userId":"test-user","tenantId":"test-tenant"}'
```

### 6.3 Check SES Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Send \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## 7. Troubleshooting

### WebSocket Connection Fails

1. Check Redis is running: `redis-cli ping`
2. Verify CORS settings in gateway
3. Check JWT token validity

### Email Not Sending

1. Verify SES domain verification status
2. Check IAM permissions
3. Review CloudWatch logs
4. Check bounce/complaint rates

### High Latency

1. Enable Redis adapter clustering
2. Check PostgreSQL connection pooling
3. Review OpenTelemetry traces

## 8. Rollback Procedure

```bash
# Rollback infrastructure
terraform destroy -target=aws_ses_domain_identity.main

# Rollback backend
git revert HEAD
npm run deploy

# Rollback frontend
vercel --rollback
```
