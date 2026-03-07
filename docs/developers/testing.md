# Testing Guide

This guide covers testing strategies and practices for MechMind OS.

## Testing Pyramid

```
        /\
       /  \
      / E2E\          (Few tests, high confidence)
     /--------\
    /Integration\      (Medium tests)
   /--------------\
  /    Unit Tests   \   (Many tests, fast feedback)
 /--------------------\
```

## Unit Testing

### Go Unit Tests

```go
// internal/service/booking_service_test.go
package service

import (
    "testing"
    "time"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// Mock repository
type MockBookingRepository struct {
    mock.Mock
}

func (m *MockBookingRepository) Create(booking *Booking) error {
    args := m.Called(booking)
    return args.Error(0)
}

func (m *MockBookingRepository) GetByID(id string) (*Booking, error) {
    args := m.Called(id)
    return args.Get(0).(*Booking), args.Error(1)
}

func TestBookingService_CreateBooking(t *testing.T) {
    // Arrange
    mockRepo := new(MockBookingRepository)
    service := NewBookingService(mockRepo)
    
    booking := &Booking{
        CustomerID: "cust-123",
        SlotID:     "slot-456",
        ServiceType: "Oil Change",
    }
    
    mockRepo.On("Create", booking).Return(nil)
    
    // Act
    err := service.CreateBooking(booking)
    
    // Assert
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}

func TestBookingService_CreateBooking_InvalidSlot(t *testing.T) {
    // Arrange
    mockRepo := new(MockBookingRepository)
    service := NewBookingService(mockRepo)
    
    booking := &Booking{
        CustomerID: "cust-123",
        SlotID:     "", // Invalid
        ServiceType: "Oil Change",
    }
    
    // Act
    err := service.CreateBooking(booking)
    
    // Assert
    assert.Error(t, err)
    assert.Equal(t, ErrInvalidSlot, err)
}
```

### Python Unit Tests

```python
# voice_service/tests/test_booking_handler.py
import pytest
from unittest.mock import Mock, AsyncMock, patch
from handlers.booking_handler import BookingHandler

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def handler(mock_db):
    return BookingHandler(mock_db)

@pytest.mark.asyncio
async def test_handle_booking_intent_success(handler, mock_db):
    # Arrange
    event = {
        "payload": {
            "customer_phone": "+14155551234",
            "requested_date": "2024-01-20",
            "service_type": "Oil Change"
        }
    }
    
    mock_db.fetch.return_value = [
        {"id": "slot-1", "start_time": "09:00"},
        {"id": "slot-2", "start_time": "10:00"}
    ]
    
    # Act
    result = await handler.handle_booking_intent(event)
    
    # Assert
    assert result["success"] is True
    assert "reservation_id" in result
    assert len(result["available_slots"]) == 2

@pytest.mark.asyncio
async def test_handle_booking_intent_no_slots(handler, mock_db):
    # Arrange
    event = {
        "payload": {
            "customer_phone": "+14155551234",
            "requested_date": "2024-01-20",
            "service_type": "Oil Change"
        }
    }
    
    mock_db.fetch.return_value = []
    
    # Act
    result = await handler.handle_booking_intent(event)
    
    # Assert
    assert result["success"] is False
    assert "No slots available" in result["message"]
```

### Frontend Unit Tests

```typescript
// frontend/src/components/BookingForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingForm } from './BookingForm';
import { bookingApi } from '../services/api';

jest.mock('../services/api');

describe('BookingForm', () => {
  it('submits booking successfully', async () => {
    // Arrange
    const mockCreateBooking = jest.fn().mockResolvedValue({ id: 'booking-123' });
    (bookingApi.create as jest.Mock) = mockCreateBooking;
    
    render(<BookingForm />);
    
    // Act
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '+14155551234' }
    });
    fireEvent.change(screen.getByLabelText('Service Type'), {
      target: { value: 'Oil Change' }
    });
    fireEvent.click(screen.getByText('Book Appointment'));
    
    // Assert
    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith({
        customer_phone: '+14155551234',
        service_type: 'Oil Change'
      });
    });
    
    expect(screen.getByText('Booking confirmed!')).toBeInTheDocument();
  });
  
  it('shows validation errors', async () => {
    render(<BookingForm />);
    
    fireEvent.click(screen.getByText('Book Appointment'));
    
    expect(screen.getByText('Phone is required')).toBeInTheDocument();
    expect(screen.getByText('Service type is required')).toBeInTheDocument();
  });
});
```

## Integration Testing

### API Integration Tests

```go
// tests/integration/booking_test.go
//go:build integration

package integration

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
)

type BookingIntegrationTestSuite struct {
    suite.Suite
    server *httptest.Server
    db     *sql.DB
}

func (s *BookingIntegrationTestSuite) SetupSuite() {
    // Start test database
    s.db = setupTestDatabase()
    
    // Create test server
    router := setupTestRouter(s.db)
    s.server = httptest.NewServer(router)
}

func (s *BookingIntegrationTestSuite) TearDownSuite() {
    s.server.Close()
    teardownTestDatabase(s.db)
}

func (s *BookingIntegrationTestSuite) TestCreateBooking() {
    // Arrange
    booking := map[string]interface{}{
        "slot_id":        "550e8400-e29b-41d4-a716-446655440000",
        "mechanic_id":    "550e8400-e29b-41d4-a716-446655440001",
        "customer_phone": "+14155551234",
        "service_type":   "Oil Change",
    }
    
    body, _ := json.Marshal(booking)
    
    // Act
    resp, err := http.Post(
        s.server.URL+"/v1/bookings",
        "application/json",
        bytes.NewBuffer(body),
    )
    
    // Assert
    s.NoError(err)
    s.Equal(http.StatusCreated, resp.StatusCode)
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    
    s.NotEmpty(result["id"])
    s.Equal("confirmed", result["status"])
}

func TestBookingIntegration(t *testing.T) {
    suite.Run(t, new(BookingIntegrationTestSuite))
}
```

### Database Integration Tests

```python
# tests/integration/test_database.py
import pytest
import asyncpg
from services.booking_service import BookingService

@pytest.fixture(scope="module")
async def db_pool():
    """Create test database pool"""
    pool = await asyncpg.create_pool(
        "postgresql://test:test@localhost:5433/mechmind_test"
    )
    yield pool
    await pool.close()

@pytest.fixture
async def transaction(db_pool):
    """Create transaction that rolls back after test"""
    async with db_pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        yield conn
        await tr.rollback()

@pytest.mark.asyncio
async def test_create_booking_with_advisory_lock(transaction):
    # Arrange
    service = BookingService(transaction)
    
    # Act
    booking = await service.create_booking(
        slot_id="test-slot-1",
        mechanic_id="test-mechanic-1",
        customer_phone="+14155551234",
        service_type="Oil Change"
    )
    
    # Assert
    assert booking["id"] is not None
    assert booking["status"] == "confirmed"
    
    # Verify in database
    result = await transaction.fetchrow(
        "SELECT * FROM bookings WHERE id = $1",
        booking["id"]
    )
    assert result is not None
```

## End-to-End Testing

### Cypress E2E Tests

```typescript
// frontend/cypress/e2e/booking.cy.ts
describe('Booking Flow', () => {
  beforeEach(() => {
    cy.login('test@shop.com', 'password');
  });

  it('creates a new booking', () => {
    // Navigate to booking page
    cy.visit('/bookings/new');
    
    // Select date
    cy.get('[data-testid="date-picker"]').click();
    cy.get('.calendar-day').contains('15').click();
    
    // Select time slot
    cy.get('[data-testid="slot-09:00"]').click();
    
    // Enter customer details
    cy.get('[name="customer_phone"]').type('+14155551234');
    cy.get('[name="service_type"]').select('Oil Change');
    
    // Submit
    cy.get('[type="submit"]').click();
    
    // Verify success
    cy.contains('Booking created successfully').should('be.visible');
    cy.url().should('include', '/bookings/');
  });

  it('prevents double booking', () => {
    // Create first booking
    cy.createBooking({
      slot_id: 'test-slot',
      customer_phone: '+14155551234'
    });
    
    // Try to book same slot
    cy.visit('/bookings/new');
    cy.selectSlot('test-slot');
    cy.get('[type="submit"]').click();
    
    // Should show error
    cy.contains('Slot is no longer available').should('be.visible');
  });
});
```

### API Contract Tests

```python
# tests/contract/test_api_contract.py
import pytest
from pact import Consumer, Provider

@pytest.fixture(scope="module")
def pact():
    return Consumer('mechmind-web').has_pact_with(Provider('mechmind-api'))

def test_get_bookings_contract(pact):
    expected = {
        "data": [
            {
                "id": "booking-123",
                "status": "confirmed",
                "customer": {
                    "name": "John Doe",
                    "phone": "+14155551234"
                }
            }
        ],
        "pagination": {
            "page": 1,
            "total": 10
        }
    }
    
    (pact
     .given('bookings exist')
     .upon_receiving('a request for bookings')
     .with_request('GET', '/v1/bookings', headers={'Authorization': 'Bearer token'})
     .will_respond_with(200, body=expected))
    
    with pact:
        result = booking_api.get_bookings(token='token')
        assert len(result['data']) > 0
```

## Performance Testing

### Load Testing with k6

```javascript
// tests/performance/booking_load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 200 },   // Ramp up
    { duration: '5m', target: 200 },   // Steady state
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  const payload = JSON.stringify({
    slot_id: `slot-${__VU}-${__ITER}`,
    mechanic_id: 'mechanic-1',
    customer_phone: `+1415555${1000 + __VU}`,
    service_type: 'Oil Change',
  });

  const res = http.post('http://localhost:8080/v1/bookings', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Database Performance Tests

```python
# tests/performance/test_db_performance.py
import pytest
import time
from concurrent.futures import ThreadPoolExecutor

@pytest.mark.performance
async def test_concurrent_booking_creation(db_pool):
    """Test concurrent booking creation performance"""
    
    async def create_booking(i):
        async with db_pool.acquire() as conn:
            start = time.time()
            await conn.execute(
                """
                INSERT INTO bookings (customer_id, slot_id, status)
                VALUES ($1, $2, 'confirmed')
                """,
                f"customer-{i}",
                f"slot-{i}"
            )
            return time.time() - start
    
    # Create 100 concurrent bookings
    start_time = time.time()
    tasks = [create_booking(i) for i in range(100)]
    durations = await asyncio.gather(*tasks)
    total_time = time.time() - start_time
    
    # Assert performance
    assert total_time < 5.0  # Should complete in under 5 seconds
    assert max(durations) < 0.5  # No single request over 500ms
```

## Security Testing

### OWASP ZAP Scan

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Start application
        run: docker-compose up -d
      
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:8080'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

### Dependency Vulnerability Scan

```bash
# Go dependencies
cd backend
go list -json -m all | nancy sleuth

# Python dependencies
cd voice-service
safety check

# JavaScript dependencies
cd frontend
npm audit
```

## Test Data Management

### Test Fixtures

```python
# tests/fixtures/bookings.py
import pytest
from datetime import datetime, timedelta

@pytest.fixture
def sample_customer():
    return {
        "id": "cust-test-001",
        "first_name": "Test",
        "last_name": "Customer",
        "phone": "+14155551001",
        "email": "test@example.com"
    }

@pytest.fixture
def sample_slot():
    return {
        "id": "slot-test-001",
        "mechanic_id": "mech-test-001",
        "start_time": datetime.now() + timedelta(days=1),
        "end_time": datetime.now() + timedelta(days=1, hours=1),
        "is_available": True
    }

@pytest.fixture
def sample_booking(sample_customer, sample_slot):
    return {
        "id": "booking-test-001",
        "customer_id": sample_customer["id"],
        "slot_id": sample_slot["id"],
        "mechanic_id": sample_slot["mechanic_id"],
        "status": "confirmed",
        "service_type": "Oil Change",
        "created_at": datetime.now()
    }
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run Go tests
        run: |
          cd backend
          go test ./... -race -coverprofile=coverage.out
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.out

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - name: Run integration tests
        run: |
          cd backend
          go test ./tests/integration/... -tags=integration
```

## Test Coverage

### Coverage Targets

| Component | Target Coverage |
|-----------|-----------------|
| Backend API | 80% |
| Voice Service | 75% |
| Frontend | 70% |
| Critical Paths | 90% |

### Viewing Coverage

```bash
# Generate coverage report
cd backend
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html

# Open in browser
open coverage.html
```
