# Developer Setup Guide

This guide will help you set up your local development environment for MechMind OS.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.21+ | Backend API |
| Python | 3.11+ | Voice service, webhooks |
| Node.js | 18+ | Frontend |
| Docker | 24+ | Infrastructure |
| kubectl | 1.28+ | Kubernetes |
| Terraform | 1.5+ | Infrastructure as Code |

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/mechmind/mechmind-os.git
cd mechmind-os
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mechmind_dev
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-private.pem

# External Services
VAPI_API_KEY=your-vapi-key
VAPI_WEBHOOK_SECRET=your-webhook-secret
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx

# Application
APP_ENV=development
LOG_LEVEL=debug
```

### 3. Generate Keys

```bash
# Generate JWT keys
mkdir -p keys
openssl genrsa -out keys/jwt-private.pem 2048
openssl rsa -in keys/jwt-private.pem -pubout -out keys/jwt-public.pem
```

### 4. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and other services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 5. Database Setup

```bash
# Run migrations
cd backend
go run cmd/migrate/main.go up

# Seed development data
go run cmd/seed/main.go
```

### 6. Run API Server

```bash
# Start API server
cd backend
go run cmd/api/main.go

# API will be available at http://localhost:8080
```

### 7. Run Voice Service

```bash
# In a new terminal
cd voice-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start voice service
uvicorn main:app --reload --port 8081
```

### 8. Run Frontend

```bash
# In a new terminal
cd frontend
npm install

# Start development server
npm run dev

# Frontend will be available at http://localhost:3000
```

## Project Structure

```
mechmind-os/
├── backend/              # Go API services
│   ├── cmd/              # Application entrypoints
│   ├── internal/         # Internal packages
│   │   ├── api/          # HTTP handlers
│   │   ├── domain/       # Business logic
│   │   ├── repository/   # Database access
│   │   └── service/      # Service layer
│   ├── pkg/              # Public packages
│   └── migrations/       # Database migrations
├── voice-service/        # Python voice integration
│   ├── handlers/         # Webhook handlers
│   ├── services/         # Business logic
│   └── tests/            # Test suite
├── frontend/             # React web application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   └── store/        # State management
│   └── public/
├── infrastructure/       # Terraform/IaC
│   ├── terraform/        # AWS resources
│   └── kubernetes/       # K8s manifests
└── docs/                 # Documentation
```

## IDE Setup

### VS Code

Recommended extensions:
- Go
- Python
- ESLint
- Prettier
- Docker
- Kubernetes

```json
// .vscode/settings.json
{
  "go.formatTool": "goimports",
  "go.lintTool": "golangci-lint",
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### GoLand / IntelliJ

1. Install Go plugin
2. Configure Go SDK
3. Enable goimports on save
4. Set up run configurations for API and tests

## Database Development

### Connection

```bash
# Connect to local database
psql postgresql://user:password@localhost:5432/mechmind_dev
```

### Creating Migrations

```bash
# Create new migration
cd backend
migrate create -ext sql -dir migrations -seq add_customer_preferences

# Edit generated files:
# migrations/000XXX_add_customer_preferences.up.sql
# migrations/000XXX_add_customer_preferences.down.sql
```

### Migration Example

```sql
-- migrations/000XXX_add_customer_preferences.up.sql
CREATE TABLE customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    preference_type VARCHAR(50) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_preferences_customer ON customer_preferences(customer_id);

-- migrations/000XXX_add_customer_preferences.down.sql
DROP TABLE customer_preferences;
```

## Testing

### Unit Tests

```bash
# Run Go tests
cd backend
go test ./... -v

# Run with coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Run Python tests
cd voice-service
pytest -v --cov=.
```

### Integration Tests

```bash
# Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
cd backend
go test ./tests/integration/... -tags=integration

# Stop test infrastructure
docker-compose -f docker-compose.test.yml down
```

### Frontend Tests

```bash
cd frontend

# Run unit tests
npm test

# Run e2e tests
npm run test:e2e
```

## Debugging

### API Debugging

```bash
# Run with debugger
dlv debug ./cmd/api/main.go

# Or use VS Code launch configuration
```

### Voice Service Debugging

```bash
# Run with debug logging
LOG_LEVEL=debug uvicorn main:app --reload
```

### Database Debugging

```bash
# Enable query logging
psql -c "ALTER SYSTEM SET log_statement = 'all';"
psql -c "SELECT pg_reload_conf();"

# View logs
docker-compose logs -f postgres
```

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Migration Errors

```bash
# Fix migration version
migrate -path migrations -database "$DATABASE_URL" force VERSION

# Rollback last migration
migrate -path migrations -database "$DATABASE_URL" down 1
```

## Useful Commands

```bash
# Reset development database
docker-compose down -v
docker-compose up -d
make migrate-up
make seed

# View logs
docker-compose logs -f api
docker-compose logs -f voice-service

# Rebuild containers
docker-compose build --no-cache

# Clean up Docker
docker system prune -a
```

## Next Steps

- Read [Testing Guide](testing.md)
- Review [Contributing Guidelines](contributing.md)
- Explore [API Documentation](../api/openapi.yaml)
