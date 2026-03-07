# MechMind OS E2E Testing with Playwright

This directory contains End-to-End (E2E) tests for MechMind OS using [Playwright](https://playwright.dev/).

## 📊 Test Coverage

| Module | Test File | Cases |
|--------|-----------|-------|
| Authentication | `auth/login.spec.ts` | 25+ |
| Multi-Factor Auth | `auth/mfa.spec.ts` | 20+ |
| Booking Management | `bookings/booking-flow.spec.ts` | 30+ |
| Race Conditions | `bookings/race-condition.spec.ts` | 20+ |
| Dashboard Navigation | `dashboard/navigation.spec.ts` | 30+ |
| Customer Management | `customers/customer-management.spec.ts` | 15+ |
| Vehicle Management | `vehicles/vehicle-management.spec.ts` | 12+ |
| **Inspection Workflow** | `inspection-workflow.spec.ts` | 25+ |
| **Offline Mode** | `offline-mode.spec.ts` | 20+ |
| **Warranty Claims** | `warranty-claim.spec.ts` | 25+ |
| **AI Damage Detection** | `ai-damage-detection.spec.ts` | 35+ |
| Settings | `settings/settings.spec.ts` | 25+ |
| Invoice Management | `invoices/invoice-management.spec.ts` | 20+ |
| **Total** | | **300+** |

## 🚀 Quick Start

### Install Dependencies

```bash
cd frontend
npm install
npx playwright install
```

### Run Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (for debugging)
npm run test:e2e:ui

# Run specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode with step-through
npm run test:e2e:debug

# Generate code by recording interactions
npm run test:e2e:codegen

# Show HTML report
npm run test:e2e:report

# Run specific test file
npx playwright test e2e/inspection-workflow.spec.ts

# Run tests matching pattern
npx playwright test --grep "AI Damage"
```

## 📁 Project Structure

```
e2e/
├── auth/                       # Authentication tests
│   ├── login.spec.ts           # Login/logout flows
│   └── mfa.spec.ts             # MFA/2FA tests
├── bookings/                   # Booking management
│   ├── booking-flow.spec.ts    # CRUD operations
│   └── race-condition.spec.ts  # Concurrency tests
├── customers/                  # Customer management
│   └── customer-management.spec.ts
├── dashboard/                  # Dashboard & navigation
│   └── navigation.spec.ts
├── fixtures/                   # Test fixtures & helpers
│   ├── auth.fixture.ts         # Auth page objects
│   └── inspection.fixture.ts   # Inspection test fixtures
├── helpers/                    # Test utilities
│   └── test-data.ts            # Test data factory
├── invoices/                   # Invoice management
│   └── invoice-management.spec.ts
├── pages/                      # Page Object Models
│   ├── inspection.page.ts      # Inspection page POM
│   ├── warranty.page.ts        # Warranty page POM
│   └── ai-damage.page.ts       # AI damage detection POM
├── settings/                   # Settings tests
│   └── settings.spec.ts
├── utils/                      # Test utilities
│   └── test-helpers.ts         # Common test functions
├── vehicles/                   # Vehicle management
│   └── vehicle-management.spec.ts
├── ai-damage-detection.spec.ts # AI damage detection tests
├── global-setup.ts             # Global test setup
├── global-teardown.ts          # Global test cleanup
├── inspection-workflow.spec.ts # Inspection workflow tests
├── offline-mode.spec.ts        # Offline functionality tests
├── warranty-claim.spec.ts      # Warranty claim tests
└── README.md
```

## 🧪 New Test Suites

### Inspection Workflow Tests (`inspection-workflow.spec.ts`)

Tests the complete 7-step vehicle inspection workflow:

- **Step 1: Header Info**
  - Vehicle selection
  - Inspection type selection
  - Inspector assignment
  - GPS location capture

- **Step 2: Exterior Inspection**
  - Photo upload
  - 360° video recording
  - Damage annotation

- **Step 3: Interior Inspection**
  - Odometer reading
  - Interior condition assessment
  - Infotainment check

- **Step 4: Sensory Inspection**
  - Humidity measurement
  - Odor detection (smoke, pet, mold)
  - AC drain test
  - Mold risk calculation

- **Step 5: Engine & Mechanical**
  - Fluid levels check
  - Belt condition
  - Battery test

- **Step 6: Tires & Suspension**
  - Tire tread depth
  - Tire pressure
  - Suspension condition

- **Step 7: Electronics & OBD**
  - Error codes
  - Electronics check
  - Final submission

### Offline Mode Tests (`offline-mode.spec.ts`)

Tests offline functionality:

- Network state detection (online/offline)
- Form data persistence offline
- Request queuing
- Auto-sync when back online
- Conflict resolution
- Photo upload queueing

### Warranty Claim Tests (`warranty-claim.spec.ts`)

Tests warranty workflow:

- Warranty dashboard display
- Countdown timer
- Remaining coverage tracking
- Filing new claims
- Evidence upload
- Claim status tracking
- Blockchain verification
- Alert settings
- Upcoming expirations

### AI Damage Detection Tests (`ai-damage-detection.spec.ts`)

Tests AI-powered damage analysis:

- Photo upload
- AI analysis trigger
- Bounding box display
- Damage type classification
- Cost estimation
- Confidence thresholds
- Tire wear analysis
- Zoom and navigation

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in `frontend/`:

```env
# Test Configuration
BASE_URL=http://localhost:3000
API_URL=http://localhost:4000

# Test Users
TEST_USER_EMAIL=test@mechmind.local
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@mechmind.local
TEST_ADMIN_PASSWORD=AdminPassword123!
TEST_MFA_CODE=123456
TEST_RECOVERY_CODE=ABCD-EFGH-IJKL-MNOP

# Database (for CI)
DATABASE_URL=postgresql://user:pass@localhost:5432/mechmind_test

# AI Service (for damage detection tests)
AI_SERVICE_URL=http://localhost:5000
AI_API_KEY=test-key
```

### Playwright Config

See `playwright.config.ts` for:
- Browser configurations (Chrome, Firefox, WebKit)
- Mobile viewport testing
- Parallel execution settings
- Screenshot and video capture
- CI/CD integration

## 🧪 Writing Tests

### Using Page Object Models

```typescript
import { test, expect } from './fixtures/inspection.fixture';

test('complete inspection workflow', async ({ inspectionPage }) => {
  await inspectionPage.gotoNewInspection();
  
  // Step 1: Header Info
  await inspectionPage.fillHeaderInfo({
    vehicleId: 'veh-001',
    inspectionType: 'PERIODIC',
    inspectorId: 'insp-001',
  });
  await inspectionPage.goToNextStep();
  
  // Step 2-7: Continue filling...
  
  // Submit
  await inspectionPage.submitInspection();
  
  // Verify
  await inspectionPage.expectInspectionDetailPage();
});
```

### Using Test Fixtures

```typescript
import { test, expect } from './fixtures/inspection.fixture';

test('file warranty claim', async ({ warrantyPage }) => {
  await warrantyPage.gotoWarrantyDashboard('warranty-001');
  
  await warrantyPage.fileClaim({
    amount: 500,
    description: 'Engine repair needed',
  });
  
  await warrantyPage.waitForClaimToAppear('Engine repair needed');
});
```

### Using Test Data Factory

```typescript
import { test, expect } from './fixtures/auth.fixture';
import { TestDataFactory } from './helpers/test-data';

const vehicle = TestDataFactory.vehicle();
const customer = TestDataFactory.customer();
```

### Pre-authenticated Tests

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.use({ storageState: 'e2e/.auth/mechanic.json' });

test('mechanic can create inspection', async ({ page }) => {
  // Already logged in as mechanic
  await page.goto('/dashboard/inspections/new');
  // ...
});
```

## 🔄 Race Condition Testing

The `race-condition.spec.ts` file includes tests for:
- Double booking prevention
- Inventory overselling prevention
- Concurrent modification detection
- Optimistic locking

Run these tests specifically:
```bash
npx playwright test e2e/bookings/race-condition.spec.ts --workers=1
```

## 📸 Debugging

### Screenshots & Videos

Failed tests automatically capture:
- Screenshot on failure
- Video trace (retain-on-failure)
- Full trace (on-first-retry)

View traces:
```bash
npx playwright show-report
```

### Trace Viewer

```bash
# Run with tracing enabled
npx playwright test --trace on

# View specific trace
npx playwright show-trace test-results/trace.zip
```

## 🏗️ CI/CD Integration

GitHub Actions workflow is configured in `.github/workflows/e2e.yml`:

- Runs on push to `main` and `develop`
- Tests on Chrome and Firefox
- Parallel execution with sharding (4 shards)
- Artifacts upload for failed tests
- Database service container

## 📝 Best Practices

1. **Use Page Objects**: Leverage POMs in `pages/` directory for reusable interactions
2. **Use Fixtures**: Leverage fixtures for common setup and authenticated sessions
3. **Test Data**: Use `TestDataFactory` for consistent test data
4. **Selectors**: Prefer semantic selectors (`getByRole`, `getByLabel`)
5. **Retries**: Tests automatically retry on CI (2 retries)
6. **Isolation**: Each test runs in isolation with clean state
7. **Cross-browser**: Tests run on Chrome and Firefox by default

## 🔍 Code Generation

Record interactions to generate test code:

```bash
npx playwright codegen http://localhost:3000
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-test)
- [Selectors Guide](https://playwright.dev/docs/selectors)

## 🐛 Troubleshooting

### Tests failing locally?

1. Ensure backend is running: `npm run dev` in backend folder
2. Check database is seeded: `npm run db:seed:e2e` in backend
3. Clear auth state: `rm -rf e2e/.auth/`
4. Update browsers: `npx playwright install`

### Flaky tests?

- Increase timeouts in `playwright.config.ts`
- Add `await expect().toBeVisible()` before interactions
- Use `page.waitForLoadState('networkidle')` after navigation
- Check for race conditions in application code

### AI Damage Detection tests failing?

- Ensure AI service is running
- Check `AI_SERVICE_URL` environment variable
- Mock AI responses for consistent tests

### Offline mode tests failing?

- Ensure service worker is registered
- Check browser console for errors
- Verify offline support is enabled in app

## 🆕 Recent Additions

### v2.0.0 - Inspection System Tests
- Added comprehensive inspection workflow tests
- Added offline mode functionality tests
- Added warranty claim workflow tests
- Added AI damage detection tests
- Added Page Object Models for reusability
- Added inspection-specific fixtures and helpers
