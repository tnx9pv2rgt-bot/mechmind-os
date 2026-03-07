# MechMind OS v10 - k6 Load Testing Suite

Comprehensive load testing suite for MechMind OS using [k6](https://k6.io/), designed to validate critical performance and reliability requirements.

## Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

This load testing suite validates the following critical requirements:

| Test | Description | Threshold |
|------|-------------|-----------|
| **Race Condition** | 100 concurrent bookings for same slot | Zero double bookings, p99 < 500ms |
| **Lock Contention** | 1000 VUs across 100 slots | p99 lock wait < 100ms, zero deadlocks |
| **Voice Throughput** | 100 calls/sec simulation | p99 latency < 2.5s, error rate < 1% |
| **GDPR Deletion** | Delete 10k customer records | Duration < 1 hour, zero PII leaks |

## Test Coverage

### 1. Race Condition Test (`race-condition-test.js`)

Tests concurrent booking attempts to ensure zero double bookings.

```bash
k6 run race-condition-test.js
```

**Scenario:**
- 100 VUs attempt to book the same slot simultaneously
- Uses PostgreSQL advisory locks for conflict resolution
- Validates exactly 1 success and 99 conflicts (409)

**Custom Metrics:**
- `double_booking_detected` - Must be 0
- `lock_wait_ms` - Advisory lock wait times
- `booking_success_rate` - Success rate tracking

### 2. Lock Contention Test (`lock-contention-test.js`)

Measures database lock performance under high concurrency.

```bash
k6 run lock-contention-test.js
```

**Scenario:**
- 1000 VUs distributed across 100 different slots
- 10 VUs per slot to simulate realistic contention
- Tests advisory lock implementation

**Custom Metrics:**
- `lock_wait_ms` - Lock wait times (p99 < 100ms)
- `deadlock_detected` - Must be 0
- `booking_success_rate` - Should be 100%

### 3. Voice Throughput Test (`voice-throughput-test.js`)

Validates voice webhook handling at 100 calls/second.

```bash
k6 run voice-throughput-test.js
```

**Scenario:**
- Constant arrival rate of 100 calls/sec
- Burst test at 200 calls/sec
- Tests HMAC signature verification
- Validates SQS queue processing

**Custom Metrics:**
- `voice_response_time` - End-to-end latency (p99 < 2.5s)
- `webhook_processing_time` - Server processing time
- `lost_webhooks` - SQS DLQ check (must be 0)

### 4. GDPR Deletion Test (`gdpr-deletion-test.js`)

Tests bulk data deletion and PII anonymization.

```bash
k6 run gdpr-deletion-test.js
```

**Scenario:**
- Create 10,000 test customer records
- Trigger batch GDPR deletion job
- Verify PII anonymization
- Check referential integrity

**Custom Metrics:**
- `deletion_job_duration` - Must be < 1 hour
- `pii_leak_detected` - Must be 0
- `records_per_second` - Deletion throughput

## Installation

### Prerequisites

- k6 >= 0.48.0
- Node.js >= 18 (for utility scripts)
- Access to target environment

### Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

**Windows (Chocolatey):**
```bash
choco install k6
```

### Verify Installation

```bash
k6 version
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Target environment (`local`, `staging`, `prod`) | `local` |
| `BASE_URL` | API base URL | `http://localhost:3000` |
| `JWT_TOKEN` | Authentication token | *(required)* |
| `VAPI_WEBHOOK_SECRET` | Webhook signing secret | `test-webhook-secret` |
| `TEST_TENANT_ID` | Test tenant UUID | Auto-generated |
| `TEST_SHOP_ID` | Test shop UUID | Auto-generated |
| `SHARED_SLOT_ID` | Slot ID for race condition test | Auto-generated |

### Environment-Specific Configuration

Configuration is managed in `config.js`:

```javascript
export const ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:3000',
    timeoutMs: 30000,
    // ...
  },
  staging: {
    baseUrl: 'https://api-staging.mechmind.io',
    timeoutMs: 30000,
    // ...
  },
  prod: {
    baseUrl: 'https://api.mechmind.io',
    timeoutMs: 30000,
    // ...
  },
};
```

### Setting Environment Variables

**Linux/macOS:**
```bash
export ENVIRONMENT=staging
export JWT_TOKEN="your-jwt-token"
export VAPI_WEBHOOK_SECRET="your-webhook-secret"
```

**Windows (PowerShell):**
```powershell
$env:ENVIRONMENT="staging"
$env:JWT_TOKEN="your-jwt-token"
```

## Running Tests

### Run All Tests

```bash
./run-tests.sh
```

With options:
```bash
./run-tests.sh --env staging --token <jwt-token> --skip-gdpr
```

### Run Individual Tests

```bash
# Race condition test
k6 run race-condition-test.js

# Lock contention test
k6 run lock-contention-test.js

# Voice throughput test
k6 run voice-throughput-test.js

# GDPR deletion test (long running)
k6 run gdpr-deletion-test.js
```

### Run with Docker

```bash
docker run -v $(pwd):/tests -e JWT_TOKEN=$JWT_TOKEN grafana/k6 run /tests/race-condition-test.js
```

### Run with Cloud Output (Grafana Cloud)

```bash
export K6_CLOUD_TOKEN="your-cloud-token"
k6 cloud race-condition-test.js
```

## Interpreting Results

### Console Output

k6 provides real-time metrics during test execution:

```
     ✓ status is 201 or 409
     ✓ no server errors
     ✓ response time < 500ms

     checks.........................: 100.00% ✓ 300      ✗ 0
     data_received..................: 45 kB   1.5 kB/s
     data_sent......................: 23 kB   766 B/s
     http_req_duration..............: avg=156.23ms min=45.12ms med=142.5ms max=498.3ms p(90)=287.4ms p(95)=398.1ms p(99)=485.2ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 100
```

### Custom Metrics

After test completion, check custom metrics:

```bash
# View summary
k6 run --summary-export=summary.json race-condition-test.js
cat summary.json | jq '.metrics.double_booking_detected'

# View detailed results
k6 run --out json=results.json race-condition-test.js
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All thresholds passed |
| 97 | Thresholds failed |
| 98 | Test aborted |
| 99 | Test failed (script error) |

### Results Directory

Test results are stored in `results/<timestamp>/`:

```
results/
└── 20240228_143022/
    ├── race-condition.json          # Raw JSON output
    ├── race-condition-summary.json  # Summary metrics
    ├── lock-contention.json
    ├── voice-throughput.json
    └── SUMMARY.md                   # Human-readable summary
```

## CI/CD Integration

### GitHub Actions

The test suite includes a GitHub Actions workflow at `.github/workflows/load-tests.yml`:

**Features:**
- Scheduled daily runs at 2:00 AM UTC
- Manual workflow dispatch with parameter selection
- Parallel test execution
- Artifact upload for results
- Slack notifications on failure

**Required Secrets:**
- `TEST_JWT_TOKEN` - Authentication token
- `VAPI_WEBHOOK_SECRET` - Webhook secret
- `TEST_TENANT_ID` - Test tenant ID
- `TEST_SHOP_ID` - Test shop ID
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications

**Manual Trigger:**
```bash
gh workflow run load-tests.yml -f environment=staging -f skip_race=false
```

### Jenkins Integration

```groovy
pipeline {
    agent any
    
    environment {
        JWT_TOKEN = credentials('test-jwt-token')
        ENVIRONMENT = 'staging'
    }
    
    stages {
        stage('Load Tests') {
            steps {
                sh '''
                    cd tests/load/k6
                    k6 run --out influxdb=http://influxdb:8086/k6 race-condition-test.js
                '''
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'tests/load/k6/results/**/*'
        }
    }
}
```

## Troubleshooting

### Common Issues

#### "API health check failed"

- Verify API is running: `curl $BASE_URL/health`
- Check network connectivity
- Verify `BASE_URL` environment variable

#### "JWT authentication failed"

- Verify `JWT_TOKEN` is set and valid
- Check token expiration
- Ensure token has required permissions

#### "Connection refused" / "Timeout"

- Check firewall settings
- Verify API port is accessible
- Increase timeout in config: `timeoutMs: 60000`

#### High error rates

- Check API server logs
- Verify database connection pool settings
- Monitor resource usage (CPU, memory)

### Debug Mode

Enable verbose logging:

```bash
k6 run --verbose race-condition-test.js
```

### Dry Run

Test without making actual requests (useful for script validation):

```bash
k6 run --dry-run race-condition-test.js
```

### Performance Tuning

For high-load tests, adjust VU allocation:

```javascript
export const options = {
  scenarios: {
    high_load: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      preAllocatedVUs: 500,  // Pre-allocate VUs
      maxVUs: 1000,          // Maximum VUs
    },
  },
};
```

## Contributing

When adding new tests:

1. Follow the existing file structure and naming conventions
2. Add custom metrics for test-specific validation
3. Include proper thresholds for pass/fail criteria
4. Update this README with test details
5. Add test to `run-tests.sh` and GitHub Actions workflow

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/)

## License

Part of MechMind OS v10 - Internal Use Only
