# Multi-Tenancy Implementation Summary

## Overview
This document summarizes the implementation of multi-tenancy across all MechMind OS features, enabling multiple auto-repair shops to use the system with complete data isolation.

---

## 1. Database Updates

### File: `prisma/schema.prisma`

#### Added Models
- **Tenant** - Core tenant model with subscription info, limits, and settings
- **TenantUser** - User membership within tenants with roles/permissions
- **Customer** - Customer records scoped to tenants
- **Booking** - Appointments scoped to tenants
- **Notification** - Notifications scoped to tenants
- **TenantContext** - Helper table for RLS policies

#### Updated Models (Added tenantId)
All existing models now include `tenantId` field:
- Vehicle
- Inspector
- Inspection
- SensoryInspection
- Warranty
- WarrantyClaim
- InspectorEquipment
- AuditLog
- AIAnalysis
- VideoInspection
- CustomerApproval
- PartsOrder
- OfflineSyncQueue
- MaintenanceSchedule

#### Added Indexes
- `@@index([tenantId])` on all models for query performance
- `@@index([tenantId, status])` for status filtering
- `@@index([tenantId, createdAt])` for time-based queries
- `@@unique([tenantId, email])` on Customer for unique emails per tenant
- `@@unique([tenantId, vin])` on Vehicle for unique VINs per tenant

#### Added Enums
- `SubscriptionTier`: FREE, STARTER, PROFESSIONAL, ENTERPRISE
- `SubscriptionStatus`: TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED, SUSPENDED
- `TenantStatus`: PENDING_SETUP, ACTIVE, SUSPENDED, CANCELLED

---

## 2. Middleware

### File: `middleware/tenant.ts`

#### Features
- Extracts tenant from subdomain (shop1.mechmind.com)
- Extracts tenant from custom domain
- Extracts tenant from headers (x-tenant-id, x-tenant-slug)
- Extracts tenant from cookies
- Validates tenant subscription status
- Redirects if tenant not found or expired
- Sets tenant context headers for downstream use

#### Public Routes (No tenant required)
- `/api/tenant/register`
- `/api/tenant/setup`
- `/api/tenant/verify`
- `/api/tenant/resolve`
- `/api/auth/*`
- `/auth/*`
- `/tenant-select`
- `/subscription`

#### Error Handling
- `TENANT_NOT_FOUND` (404)
- `TENANT_SUSPENDED` (403)
- `TENANT_EXPIRED` (403)
- `SUBSCRIPTION_EXPIRED` (403)

### File: `middleware.ts` (Updated)

Integrated tenant middleware into main Next.js middleware with:
- Tenant resolution before request processing
- Cache strategies per route type
- Security headers for all routes
- Tenant cookies for session persistence

---

## 3. Tenant Context Module

### File: `lib/tenant/context.ts`

#### Functions
- `setTenantContext(context)` - Set tenant for current request
- `getTenantContext()` - Get current tenant (throws if not set)
- `tryGetTenantContext()` - Get tenant or null
- `hasTenantContext()` - Check if context exists
- `requireTenantId()` - Get tenant ID or throw
- `extractTenantFromRequest(request)` - Extract from HTTP request
- `getTenantFromRequest()` - Server-side tenant resolution
- `validateTenantSubscription(tenant)` - Check subscription status
- `hasFeature(tenant, feature)` - Check feature availability
- `withTenantFilter(where, tenantId)` - Add tenant filter to query
- `buildTenantQuery(tenantId, filters)` - Build scoped query

#### Error Classes
- `TenantNotFoundError`
- `TenantSuspendedError`
- `TenantExpiredError`
- `NoTenantContextError`

### File: `lib/tenant/index.ts`

Re-exports all tenant functionality for convenient imports.

---

## 4. Service Layer Updates

### File: `lib/services/maintenanceService.ts`

#### Updated Functions (All tenant-scoped)
```typescript
// All functions now accept optional tenantId parameter
createMaintenanceSchedule(data, tenantId?)
getMaintenanceScheduleById(id, tenantId?)
updateMaintenanceSchedule(id, data, tenantId?)
deleteMaintenanceSchedule(id, tenantId?)
listMaintenanceSchedules(filters, pagination, tenantId?)
getOverdueItems(tenantId?, vehicleId?)
getUpcomingItems(days, vehicleId?, tenantId?)
markAsCompleted(scheduleId, data, tenantId?)
checkOverdueStatus(tenantId?)
getMaintenanceSummary(tenantId?)
createFromInspection(inspectionId, findings, tenantId?)
```

#### Data Isolation
- All queries include `where: { tenantId }`
- Vehicle lookups verify `tenantId` match
- Schedule lookups filter by `tenantId`
- Summary aggregations scoped to tenant

### File: `lib/services/warrantyService.ts`

#### Updated Functions (All tenant-scoped)
```typescript
WarrantyService.createWarranty(data, tenantId?)
WarrantyService.getWarranty(warrantyId, tenantId?)
WarrantyService.getWarrantyByVehicle(vehicleId, tenantId?)
WarrantyService.updateStatus(warrantyId, tenantId?)
WarrantyService.updateAllStatuses(tenantId?)
WarrantyService.fileClaim(warrantyId, data, tenantId?)
WarrantyService.reviewClaim(claimId, decision, amount, notes, reviewedBy, tenantId?)
WarrantyService.markClaimPaid(claimId, tenantId?)
WarrantyService.getExpiringWarranties(days, tenantId?)
WarrantyService.getClaims(status, tenantId?)
WarrantyService.getClaimsByWarranty(warrantyId, tenantId?)
WarrantyService.getClaim(claimId, tenantId?)
WarrantyService.getRemainingCoverage(warrantyId, tenantId?)
WarrantyService.listWarranties(filters, tenantId?)
WarrantyService.updateWarranty(warrantyId, data, tenantId?)
WarrantyService.deleteWarranty(warrantyId, tenantId?)
WarrantyService.recordAlertSent(warrantyId, tenantId?)
```

### File: `lib/services/notificationService.ts` (New)

#### Functions
```typescript
createNotification(data, tenantId?)
sendToTenant(data, tenantId?)
sendMaintenanceNotifications(tenantId?)
sendWarrantyNotifications(daysThreshold, tenantId?)
listNotifications(filters, pagination, tenantId?)
markAsSent(notificationId, tenantId?)
markAsDelivered(notificationId, tenantId?)
markAsRead(notificationId, tenantId?)
markAsFailed(notificationId, errorMessage, tenantId?)
getNotificationStats(tenantId?)
```

---

## 5. Portal Authentication

### File: `lib/auth/portal-auth.ts`

#### Features
- Customer login with tenant verification
- Customer registration with tenant limits
- Token generation and verification
- Resource access verification
- Customer-vehicle relationship validation

#### Functions
```typescript
authenticateCustomer(credentials)
registerCustomer(data)
getCurrentCustomer(token)
verifyResourceAccess(customerId, tenantId, resourceType, resourceId)
getCustomerVehicles(customerId, tenantId)
getCustomerInspections(customerId, tenantId)
generateToken(user)
verifyToken(token)
```

#### Error Classes
- `PortalAuthError`
- `CustomerNotFoundError`
- `InvalidCredentialsError`
- `TenantMismatchError` - Customer doesn't belong to tenant
- `InactiveTenantError`

---

## 6. Tenant Onboarding API

### File: `app/api/tenant/register/route.ts`

#### POST /api/tenant/register
Creates a new tenant with:
- Tenant record with subscription info
- Admin user creation
- Sample/demo data (optional)
- Subdomain reservation
- Trial period (14 days)

#### Request Body
```typescript
{
  name: string           // Shop name
  slug: string           // Unique identifier
  subdomain?: string     // Optional custom subdomain
  email: string          // Contact email
  phone: string
  address: string
  city: string
  postalCode: string
  country: string        // default: 'IT'
  vatNumber?: string
  adminFirstName: string
  adminLastName: string
  adminPassword: string
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  createDemoData: boolean
  acceptTerms: boolean
}
```

#### Response
```typescript
{
  success: true
  tenant: {
    id: string
    name: string
    slug: string
    subdomain: string
    status: string
    subscriptionTier: string
    trialEndsAt: Date
  }
  urls: {
    dashboard: string
    setup: string
  }
}
```

### File: `app/api/tenant/resolve/route.ts`

#### GET /api/tenant/resolve
Resolves tenant by various identifiers:
- `?id=<tenantId>`
- `?slug=<tenantSlug>`
- `?subdomain=<subdomain>`
- `?domain=<customDomain>`

### File: `app/api/tenant/setup/route.ts`

#### POST /api/tenant/setup
Completes tenant setup with:
- Branding (logo, colors)
- Settings (timezone, currency, language)
- Business hours
- Notification preferences

#### GET /api/tenant/setup
Checks if tenant setup is complete.

---

## 7. Data Isolation Verification

### File: `lib/tenant/__tests__/data-isolation.test.ts`

#### Test Suites
1. **MaintenanceService Data Isolation**
   - Only returns schedules for current tenant
   - Rejects access to schedules from different tenants
   - `getOverdueItems` filters by tenant

2. **WarrantyService Data Isolation**
   - Only returns warranties for current tenant
   - `getExpiringWarranties` filters by tenant

3. **NotificationService Data Isolation**
   - `sendToTenant` only sends to tenant customers
   - `listNotifications` filters by tenant

4. **Portal Auth Customer-Tenant Isolation**
   - Rejects login if customer doesn't belong to tenant
   - Rejects access to resources from different tenants
   - Rejects login if tenant is inactive

5. **Cross-Tenant Data Leak Prevention**
   - No customer data leakage between tenants
   - No inspection data leakage between tenants

6. **Admin Multi-Tenant Dashboard Access**
   - Admin can query multiple tenants with explicit tenantId

---

## 8. Subscription Tiers

| Tier | Max Users | Max Vehicles | Max Customers | Features |
|------|-----------|--------------|---------------|----------|
| FREE | 2 | 10 | 50 | Basic inspections, Basic warranty |
| STARTER | 5 | 50 | 200 | + Maintenance |
| PROFESSIONAL | 20 | 500 | 2,000 | + Advanced analytics, Portal |
| ENTERPRISE | 100 | 10,000 | 50,000 | All features (* wildcard) |

---

## 9. Security Features

### Data Isolation
- All database queries include `tenantId` filter
- Foreign key relationships enforce tenant boundaries
- Unique constraints include `tenantId` (e.g., email per tenant)
- Portal authentication verifies customer-tenant relationship

### Subscription Enforcement
- Middleware validates subscription status
- Trial expiration checks
- Feature availability checks via `hasFeature()`
- Redirect to subscription page if expired

### Access Control
- Role-based permissions per tenant
- Resource access verification
- Tenant context validation in all services

---

## 10. Migration Guide

### Database Migration
```bash
# Generate migration
npx prisma migrate dev --name add_multi_tenancy

# Deploy migration
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Environment Variables
```env
# Required for tenant middleware
NEXT_PUBLIC_API_URL=http://localhost:3001
PORTAL_JWT_SECRET=your-secret-key

# Optional: Default tenant for development
DEFAULT_TENANT_ID=your-dev-tenant
```

---

## 11. Usage Examples

### Creating a Maintenance Schedule
```typescript
import { createMaintenanceSchedule } from '@/lib/services/maintenanceService'
import { setTenantContext } from '@/lib/tenant/context'

// Set context from middleware
setTenantContext({
  tenantId: 'tenant-123',
  tenantSlug: 'my-shop',
  permissions: ['*'],
  subscriptionTier: 'PROFESSIONAL',
  subscriptionStatus: 'ACTIVE',
  features: ['*'],
})

// Create schedule (tenantId auto-resolved from context)
const schedule = await createMaintenanceSchedule({
  vehicleId: 'vehicle-456',
  type: 'OIL_CHANGE',
  intervalKm: 15000,
  intervalMonths: 12,
  lastServiceDate: new Date(),
  lastServiceKm: 25000,
})

// Or explicitly pass tenantId (for admin operations)
const schedule = await createMaintenanceSchedule(data, 'tenant-123')
```

### Portal Authentication
```typescript
import { authenticateCustomer } from '@/lib/auth/portal-auth'

const { user, token } = await authenticateCustomer({
  email: 'customer@example.com',
  password: 'password123',
  tenantId: 'tenant-123', // Verifies customer belongs to tenant
})
```

### Registering a New Tenant
```typescript
const response = await fetch('/api/tenant/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Auto Shop',
    slug: 'my-auto-shop',
    email: 'admin@myautoshop.com',
    phone: '+39 123 4567890',
    address: 'Via Roma 123',
    city: 'Roma',
    postalCode: '00100',
    adminFirstName: 'Mario',
    adminLastName: 'Rossi',
    adminPassword: 'securepassword123',
    tier: 'STARTER',
    createDemoData: true,
    acceptTerms: true,
  }),
})
```

---

## 12. Files Modified/Created

### New Files
1. `lib/tenant/context.ts` - Tenant context management
2. `lib/tenant/index.ts` - Tenant module exports
3. `middleware/tenant.ts` - Tenant middleware
4. `lib/services/notificationService.ts` - Notification service
5. `lib/auth/portal-auth.ts` - Portal authentication (updated)
6. `app/api/tenant/register/route.ts` - Tenant registration
7. `app/api/tenant/resolve/route.ts` - Tenant resolution
8. `app/api/tenant/setup/route.ts` - Tenant setup
9. `lib/tenant/__tests__/data-isolation.test.ts` - Verification tests
10. `MULTI_TENANCY_IMPLEMENTATION.md` - This document

### Modified Files
1. `prisma/schema.prisma` - Added tenant models and fields
2. `middleware.ts` - Integrated tenant middleware
3. `lib/services/maintenanceService.ts` - Added tenant filtering
4. `lib/services/warrantyService.ts` - Added tenant filtering

---

## 13. Verification Checklist

- [x] Database schema includes tenantId on all models
- [x] Tenant model with subscription info created
- [x] Indexes added for tenant queries
- [x] Middleware extracts and validates tenant
- [x] Services filter by tenantId
- [x] Portal auth verifies customer-tenant relationship
- [x] Tenant registration API created
- [x] Tenant resolution API created
- [x] Sample data generation on registration
- [x] Data isolation tests created
- [x] Subscription tier enforcement
- [x] Feature availability checking
- [x] Error handling for invalid/expired tenants

---

## 14. Next Steps

1. Run database migrations
2. Test tenant registration flow
3. Verify data isolation with test tenants
4. Set up production subdomain routing
5. Configure Stripe for subscription billing
6. Implement admin dashboard for multi-tenant overview
7. Add tenant usage analytics
8. Set up automated subscription expiration checks
