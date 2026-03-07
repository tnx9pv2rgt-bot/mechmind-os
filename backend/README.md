# MechMind OS v10 - Backend API

Multi-tenant SaaS for automotive repair shops with AI voice booking capabilities.

## Features

- **Multi-Tenancy with RLS**: Row-level security ensures complete data isolation between tenants
- **JWT Authentication**: Secure token-based authentication with tenant context
- **MFA Support**: TOTP-based multi-factor authentication
- **Advisory Locks**: PostgreSQL advisory locks prevent race conditions in booking operations
- **PII Encryption**: Customer personal data is encrypted at rest (AES-256)
- **GDPR Compliance**: Data export, consent tracking, and right to erasure
- **AI Voice Integration**: Webhook handlers for Vapi AI voice assistant
- **Queue Processing**: BullMQ for background job processing
- **Rate Limiting**: Redis-based rate limiting with sliding window
- **Notifications**: Email (Resend) and SMS (Twilio) support
- **Real-time**: SSE (Server-Sent Events) for live notifications

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache/Queue**: Redis 7 with BullMQ
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Container**: Docker with multi-stage builds

---

## Quick Start - Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Option 1: Local Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start PostgreSQL and Redis (using Docker)
docker run -d --name mechmind-postgres \
  -e POSTGRES_USER=mechmind \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=mechmind_os \
  -p 5432:5432 postgres:15-alpine

docker run -d --name mechmind-redis \
  -p 6379:6379 redis:7-alpine

# 4. Generate Prisma client
npm run prisma:generate

# 5. Run database migrations
npm run prisma:migrate

# 6. Seed database (optional)
npm run prisma:seed

# 7. Start development server
npm run start:dev
```

### Option 2: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd mechmind-os

# 2. Create environment file
cp backend/.env.example .env
# Edit .env with production values

# 3. Start all services
docker-compose up -d

# 4. Run migrations
docker-compose exec backend npx prisma migrate deploy

# 5. Check health
curl http://localhost:3000/health
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | API server port | Yes (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | No (default: 24h) |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `ENCRYPTION_KEY` | AES-256 encryption key (32 chars) | Yes |
| `ENCRYPTION_IV` | AES-256 IV (16 chars) | Yes |
| `VAPI_API_KEY` | Vapi.ai API key | For voice |
| `VAPI_WEBHOOK_SECRET` | Vapi webhook verification | For voice |
| `RESEND_API_KEY` | Resend email API key | For email |
| `SENDGRID_API_KEY` | SendGrid API key (alternative) | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | For SMS |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No (default: 100) |
| `LOG_LEVEL` | Logging level | No (default: info) |

---

## API Documentation

Once the server is running, access:
- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs-json

### Authentication Flow

```
POST /v1/auth/login
Headers: Content-Type: application/json
Body: { "email": "user@example.com", "password": "password" }
→ Returns: { "accessToken": "...", "refreshToken": "..." }

GET /v1/auth/me
Headers: Authorization: Bearer <accessToken>
→ Returns: Current user info
```

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/login` | User login |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Logout user |
| GET | `/v1/auth/me` | Get current user |
| POST | `/v1/auth/mfa/setup` | Setup MFA |
| POST | `/v1/auth/mfa/verify` | Verify MFA code |

#### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/bookings/reserve` | Reserve slot with advisory lock |
| POST | `/v1/bookings` | Create booking |
| GET | `/v1/bookings` | List bookings |
| GET | `/v1/bookings/:id` | Get booking details |
| PATCH | `/v1/bookings/:id` | Update booking |
| DELETE | `/v1/bookings/:id` | Cancel booking |

#### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/customers` | Create customer |
| GET | `/v1/customers` | List customers |
| GET | `/v1/customers/:id` | Get customer details |
| PATCH | `/v1/customers/:id` | Update customer |
| DELETE | `/v1/customers/:id` | Delete customer (GDPR) |
| GET | `/v1/customers/:id/export` | Export customer data |
| POST | `/v1/customers/:id/consent` | Record consent |

#### Voice Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/vapi/call-event` | Vapi call events |
| POST | `/webhooks/vapi/booking` | Booking intent |
| POST | `/webhooks/vapi/transfer` | Transfer requests |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/notifications/send` | Send notification |
| GET | `/v1/notifications/sse` | SSE stream |
| POST | `/webhooks/notifications/resend` | Resend webhooks |
| POST | `/webhooks/notifications/twilio` | Twilio status |

#### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/analytics/metrics` | Business metrics |
| GET | `/v1/analytics/unit-economics` | Unit economics |
| GET | `/v1/analytics/reports` | Generate reports |

---

## Architecture

### Multi-Tenancy with RLS

JWT tokens contain `tenantId` in the subject claim (`userId:tenantId`). The `TenantContextMiddleware` sets `app.current_tenant` for PostgreSQL RLS policies.

```typescript
// JWT Payload
{
  "sub": "user-123:tenant-456",
  "email": "user@example.com",
  "role": "ADMIN",
  "iat": 1234567890
}
```

### Race Condition Prevention

Booking reservations use PostgreSQL advisory locks:

```typescript
// 1. Acquire advisory lock
const lockAcquired = await prisma.acquireAdvisoryLock(tenantId, slotId);
if (!lockAcquired) throw new ConflictException('Slot being booked');

try {
  // 2. Execute in SERIALIZABLE transaction
  await prisma.withSerializableTransaction(async (tx) => {
    // Validate and create booking
  });
} finally {
  // 3. Always release lock
  await prisma.releaseAdvisoryLock(tenantId, slotId);
}
```

### PII Encryption

Customer personal data is encrypted using AES-256-CBC:

```typescript
// Encrypt before storing
encryptedPhone: encryptionService.encrypt(phone)

// Decrypt when reading
phone: encryptionService.decrypt(encryptedPhone)
```

---

## Deployment

### Production Deployment (Docker)

```bash
# 1. Setup environment on server
cp backend/.env.example .env
# Configure production values

# 2. Start services
docker-compose up -d

# 3. Run migrations
docker-compose exec backend npx prisma migrate deploy

# 4. Check status
docker-compose ps
docker-compose logs -f backend
```

### GitHub Actions CI/CD

The project includes a complete CI/CD pipeline:

1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Unit Tests** - Jest test suite with coverage
3. **Integration Tests** - Full integration test suite
4. **Build Docker** - Multi-arch image build and push to GHCR
5. **Deploy** - Automatic deployment to staging (develop) or production (main)

Required secrets:
- `SSH_PRIVATE_KEY` - Production server SSH key
- `SSH_PRIVATE_KEY_STAGING` - Staging server SSH key
- `PRODUCTION_HOST` / `STAGING_HOST` - Server addresses
- `SLACK_WEBHOOK_URL` - Notifications (optional)

### Manual Deployment

```bash
# Build Docker image
docker build -t mechmind-backend:latest ./backend

# Push to registry
docker tag mechmind-backend:latest ghcr.io/username/mechmind-backend:latest
docker push ghcr.io/username/mechmind-backend:latest

# On server
docker pull ghcr.io/username/mechmind-backend:latest
docker-compose up -d
```

---

## Development Commands

```bash
# Development with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production build
npm run build
npm run start:prod

# Testing
npm test                    # Unit tests
npm run test:watch          # Watch mode
npm run test:cov            # With coverage
npm run test:integration    # Integration tests

# Database
npm run prisma:generate     # Generate client
npm run prisma:migrate      # Run migrations
npm run prisma:studio       # Prisma Studio GUI
npm run prisma:seed         # Seed data

# Code quality
npm run lint                # ESLint
npm run format              # Prettier
```

---

## Health Checks

- **Liveness**: `GET /health` - Basic health check
- **Readiness**: `GET /health/ready` - Database and Redis connectivity
- **Metrics**: `GET /metrics` - Prometheus metrics

---

## Troubleshooting

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U mechmind
```

### Redis connection issues
```bash
# Check Redis
docker-compose exec redis redis-cli ping
```

### Migration failures
```bash
# Reset database (WARNING: data loss)
docker-compose exec backend npx prisma migrate reset

# Deploy migrations
docker-compose exec backend npx prisma migrate deploy
```

---

## Security Considerations

- All PII is encrypted at rest
- JWT tokens expire after 24 hours
- Rate limiting prevents brute force attacks
- RLS policies ensure tenant data isolation
- MFA available for sensitive operations
- Webhook signatures are verified
- SQL injection prevented by Prisma ORM

---

## License

UNLICENSED - Proprietary software

---

## Support

For support, contact: support@mechmind.io
