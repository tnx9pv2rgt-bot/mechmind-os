# MechMind OS Integration Tests

This directory contains integration tests for the MechMind OS vehicle inspection system using Jest, React Testing Library, and MSW (Mock Service Worker).

## Test Structure

```
__tests__/
├── api/
│   ├── inspections.integration.test.ts    # Full inspection workflow tests
│   └── sync.integration.test.ts           # Offline sync tests
├── components/
│   └── InspectionForm.integration.test.tsx # Multi-step form tests
├── utils/
│   ├── test-utils.ts                      # Shared test utilities & MSW setup
│   └── setup.ts                           # Jest setup and global mocks
└── README.md                              # This file
```

## Running the Tests

### Prerequisites

Install the required dependencies:

```bash
# Install MSW for API mocking
npm install --save-dev msw@latest

# Install user-event for interaction testing
npm install --save-dev @testing-library/user-event@latest
```

### Run Integration Tests

```bash
# Run only integration tests
npm test -- --config=jest.integration.config.js

# Run with coverage
npm test -- --config=jest.integration.config.js --coverage

# Run in watch mode
npm test -- --config=jest.integration.config.js --watch

# Run specific test file
npm test -- --config=jest.integration.config.js inspections.integration
```

## Test Coverage

### 1. Inspection API Tests (`api/inspections.integration.test.ts`)

Tests the full inspection workflow:

- **Create Inspection**: POST /api/inspections
  - Valid data creation
  - Missing required fields validation
  - Minimal required fields

- **Add Sensory Data**: PUT /api/inspections/[id]/sensory
  - Adding sensory inspection data
  - Mold risk calculation (LOW, MEDIUM, HIGH)
  - Validation errors
  - Non-existent inspection handling

- **Add Warranty**: POST /api/inspections/[id]/warranty
  - Warranty creation
  - Type validation
  - Date validation
  - Coverage validation

- **Get Inspection**: GET /api/inspections/[id]
  - Retrieve inspection with all data
  - 404 for non-existent inspection

- **Full Workflow**: End-to-end tests
  - Complete inspection lifecycle
  - Concurrent updates
  - Error handling and edge cases

### 2. Sync API Tests (`api/sync.integration.test.ts`)

Tests offline sync functionality:

- **Queue Actions While Offline**
  - Action queuing
  - Priority ordering
  - Dependencies between items
  - Timestamp tracking

- **Process Sync Queue**
  - Processing pending items
  - Retry logic with failures
  - Conflict resolution
  - Priority-based processing
  - Queue cleanup

- **Data Consistency**
  - Data integrity across sync operations
  - Concurrent queue operations
  - Timestamp preservation

- **API Integration**
  - Backend API synchronization
  - Sync status checks
  - Queue processing via API

- **Edge Cases**
  - Empty queue processing
  - Max retries exceeded
  - Circular dependencies
  - Large data payloads
  - Special characters

### 3. Inspection Form Component Tests (`components/InspectionForm.integration.test.tsx`)

Tests the multi-step form:

- **Step 1: Header Info**
  - Vehicle selection
  - Inspection type selection
  - Inspector assignment
  - GPS location capture
  - Form validation

- **Navigation**
  - Step progression
  - Back navigation
  - Data persistence between steps
  - Validation before proceeding

- **Step 4: Sensory Inspection**
  - Humidity input
  - Odor detection checkboxes
  - AC system settings
  - Real-time mold risk calculation
  - Risk level display

- **Form Submission**
  - Complete form submission
  - Draft saving
  - Data validation

- **Edge Cases**
  - Rapid navigation
  - Boundary value testing
  - Invalid data handling

## Mock Service Worker (MSW)

The tests use MSW to intercept and mock API requests. This provides:

- Realistic API behavior without backend
- Request/response inspection
- Error simulation
- Network delay simulation

### Handler Creation

```typescript
import { createInspectionHandlers } from './utils/test-utils'

const testDatabase = {
  inspections: new Map(),
  sensoryInspections: new Map(),
  warranties: new Map(),
}

server.use(...createInspectionHandlers(testDatabase))
```

## Test Utilities

### Data Generators

```typescript
import {
  generateMockInspection,
  generateMockSensoryInspection,
  generateMockWarranty,
  generateMockVehicle,
  generateMockInspector,
} from './utils/test-utils'

const inspection = generateMockInspection({ mileage: 50000 })
const vehicle = generateMockVehicle()
```

### Form Testing

```typescript
import { renderWithForm } from './utils/test-utils'

const { getByTestId } = renderWithForm(<MyForm />, {
  formSchema: mySchema,
  formDefaultValues: { field: 'value' },
})
```

### IndexedDB Mock

```typescript
import { createMockIndexedDB } from './utils/test-utils'

const mockDB = createMockIndexedDB()
mockDB.addStore('offlineSyncQueue')
mockDB.put('offlineSyncQueue', 'item-id', itemData)
```

## Test Isolation

Each test is isolated through:

1. **Database Reset**: Test database is cleared before each test
2. **MSW Handlers**: Reset after each test
3. **Jest Mocks**: Cleared after each test
4. **Local Storage**: Mocked and cleared

## Adding New Tests

### API Integration Test

```typescript
describe('My New API', () => {
  beforeEach(() => {
    testDatabase.clear()
  })

  it('should do something', async () => {
    const response = await fetch('/api/my-endpoint')
    expect(response.status).toBe(200)
  })
})
```

### Component Integration Test

```typescript
describe('MyComponent', () => {
  it('should render', () => {
    const { getByTestId } = render(<MyComponent />)
    expect(getByTestId('my-element')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### MSW Not Working

Ensure MSW is installed:
```bash
npm install --save-dev msw
```

### Fetch Not Defined

Node.js 18+ includes fetch. For older versions, add to setup:
```typescript
import 'cross-fetch/polyfill'
```

### Test Timeouts

Increase timeout in jest.config.js:
```javascript
testTimeout: 30000
```

## CI/CD Integration

The tests can run in CI environments:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: npm test -- --config=jest.integration.config.js --ci --coverage
```

## References

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
