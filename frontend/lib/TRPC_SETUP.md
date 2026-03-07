# tRPC Client Integration Setup

This document explains the tRPC client integration for connecting the MechMind OS frontend to the Lambda backend.

## Overview

The tRPC integration provides end-to-end type-safe API calls between the Next.js frontend and the Lambda backend. It consists of:

- **tRPC Client** (`trpc-client.ts`): HTTP client with auth, retries, and error handling
- **tRPC Provider** (`trpc-provider.tsx`): React context provider with QueryClient
- **Custom Hooks** (`hooks/use-trpc.ts`): Pre-built hooks for common operations
- **API Mutations** (`api-mutations.ts`): Direct client functions for non-React usage
- **Type Definitions** (`types/api.ts`): Shared TypeScript types
- **API Route** (`app/api/trpc/[trpc]/route.ts`): Next.js proxy to backend

## File Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── trpc/[trpc]/
│   │       └── route.ts      # Next.js API route proxy
│   └── layout.tsx            # Root layout with Providers
├── components/
│   └── providers.tsx         # Application providers (updated)
├── hooks/
│   └── use-trpc.ts           # Custom tRPC hooks
├── lib/
│   ├── trpc-client.ts        # tRPC client initialization
│   ├── trpc-provider.tsx     # React provider component
│   ├── trpc-router-types.ts  # Router type definitions
│   ├── api-mutations.ts      # Direct mutation functions
│   └── TRPC_SETUP.md         # This file
└── types/
    ├── api.ts                # API entity types
    └── vehicles.ts           # Existing vehicle types
```

## Environment Variables

Create or update `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://api.mechmind-os.com/api/trpc

# For server-side requests (API routes, SSR)
INTERNAL_API_KEY=your-service-to-service-key

# CORS origins (comma-separated for production)
ALLOWED_ORIGINS=https://app.mechmind-os.com,https://admin.mechmind-os.com
```

## Quick Start

### 1. Using Hooks in Components

```tsx
'use client'

import { useVehicles, useCreateBooking } from '@/hooks/use-trpc'

export function VehicleList() {
  const { data, isLoading, error } = useVehicles(
    { status: 'active' },
    { page: 1, limit: 10 }
  )
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div>
      {data?.items.map(vehicle => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  )
}
```

### 2. Using Mutations

```tsx
'use client'

import { useCreateBooking } from '@/hooks/use-trpc'

export function NewBookingForm() {
  const createBooking = useCreateBooking()
  
  const handleSubmit = async (formData: BookingFormData) => {
    try {
      const booking = await createBooking.mutateAsync(formData)
      toast.success('Booking created!')
      router.push(`/bookings/${booking.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

### 3. Direct Client Usage (Non-React)

```typescript
import { createBooking, processPayment } from '@/lib/api-mutations'

async function handleBookingWorkflow(data: BookingFormData) {
  const booking = await createBooking(data)
  
  if (data.requiresPayment) {
    await processPayment(booking.id, {
      amount: data.estimatedCost,
      method: 'stripe',
      stripePaymentMethodId: data.paymentMethodId,
    })
  }
  
  return booking
}
```

### 4. Server-Side Rendering (SSR)

```tsx
// app/dashboard/page.tsx
import { dehydrate } from '@tanstack/react-query'
import { TRPCProvider, createServerHelpers } from '@/lib/trpc-provider'

export default async function DashboardPage() {
  const { trpc, queryClient } = createServerHelpers()
  
  // Prefetch data on server
  await trpc.analytics.summary.prefetch({ period: 'month' })
  await trpc.vehicle.stats.prefetch()
  
  return (
    <TRPCProvider dehydratedState={dehydrate(queryClient)}>
      <Dashboard />
    </TRPCProvider>
  )
}
```

## Available Hooks

### Vehicle Hooks
- `useVehicles(filters, options)` - List vehicles with pagination
- `useVehicle(id)` - Get single vehicle
- `useVehicleStats()` - Get vehicle statistics
- `useVehiclesByCustomer(customerId)` - Get customer's vehicles

### Customer Hooks
- `useCustomers(filters, options)` - List customers
- `useCustomer(id)` - Get single customer
- `useCustomerSearch(query, limit)` - Search customers
- `useUpdateCustomer()` - Update customer mutation

### Booking Hooks
- `useBookings(filters, options)` - List bookings
- `useBooking(id)` - Get single booking
- `useTodaysBookings()` - Get today's appointments
- `useBookingsByDateRange(from, to)` - Calendar view
- `useCreateBooking()` - Create booking mutation
- `useUpdateBookingStatus()` - Update status mutation
- `useCancelBooking()` - Cancel booking mutation

### Invoice Hooks
- `useInvoices(filters, options)` - List invoices
- `useInvoice(id)` - Get single invoice
- `useOverdueInvoices()` - Get overdue invoices
- `useCreateInvoice()` - Create invoice mutation
- `useProcessPayment()` - Process payment mutation
- `useSendInvoice()` - Send invoice via email

### Analytics Hooks
- `useAnalytics(period)` - Dashboard summary
- `useRevenueAnalytics(period)` - Revenue chart data
- `useServiceAnalytics(period)` - Service breakdown
- `useCustomerAnalytics(period)` - Customer metrics

## Direct Mutation Functions

All mutations are also available as direct async functions in `api-mutations.ts`:

### Vehicle Operations
- `createVehicle(data)`
- `updateVehicle(id, data)`
- `deleteVehicle(id)`
- `bulkUpdateVehicleStatus(ids, status)`

### Customer Operations
- `createCustomer(data)`
- `updateCustomer(id, data)`
- `deleteCustomer(id)`
- `importCustomers(customers)`

### Booking Operations
- `createBooking(data)`
- `updateBookingStatus(id, status, additionalData)`
- `cancelBooking(id, reason)`
- `deleteBooking(id)`
- `rescheduleBooking(id, newStartTime, newEndTime)`
- `checkAvailability(startTime, endTime, excludeBookingId)`

### Invoice Operations
- `createInvoice(data)`
- `createInvoiceFromBooking(bookingId, items, options)`
- `processPayment(invoiceId, paymentData)`
- `sendInvoice(invoiceId, email)`
- `cancelInvoice(id, reason)`
- `refundInvoice(invoiceId, amount, reason)`

### Batch Operations
- `batchCreate(type, items)` - Create multiple records

## Error Handling

The tRPC client includes comprehensive error handling:

### Error Types
- `TRPCClientError` - Base error class
- `NetworkError` - Connection issues
- `AuthError` - Authentication failures (401)
- `ServerError` - Backend errors (500+)

### Retry Logic
- Automatic retry for network errors
- Exponential backoff with jitter
- Max 3 retry attempts
- No retry for 4xx client errors

### Auth Handling
- Automatic redirect to login on 401
- Token extraction from cookies
- Header injection for all requests

## Caching Strategy

### Default Settings
- **Stale Time**: 5 minutes (data considered fresh)
- **Cache Time**: 10 minutes (unused data kept)
- **Refetch on Focus**: Disabled (better UX)
- **Refetch on Reconnect**: Enabled

### Per-Query Overrides
```tsx
const { data } = trpc.vehicle.get.useQuery(
  { id: vehicleId },
  {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  }
)
```

### Invalidation
Mutations automatically invalidate related queries:

```tsx
const createBooking = trpc.booking.create.useMutation({
  onSuccess: () => {
    // These are automatically called
    utils.booking.list.invalidate()
    utils.booking.today.invalidate()
  },
})
```

## Type Safety

All hooks and functions are fully typed. Types are defined in:
- `types/api.ts` - Entity and API types
- `lib/trpc-router-types.ts` - Router procedure types

### Example: Type-safe Queries
```typescript
// data is typed as PaginatedResponse<Vehicle>
const { data } = useVehicles({ status: 'active' })

// booking is typed as Booking
const { mutateAsync } = useCreateBooking()
const booking = await mutateAsync({
  customerId: '123',
  // TypeScript will error if required fields are missing
})
```

## Backend Router Structure

The frontend expects the backend to expose these routers:

```typescript
// Expected AppRouter structure
interface AppRouter {
  vehicle: {
    list: Query<PaginatedResponse<Vehicle>>
    get: Query<Vehicle>
    stats: Query<VehicleStats>
    byCustomer: Query<Vehicle[]>
    create: Mutation<Vehicle>
    update: Mutation<Vehicle>
    delete: Mutation<{ success: boolean }>
  }
  customer: { /* ... */ }
  booking: { /* ... */ }
  invoice: { /* ... */ }
  analytics: { /* ... */ }
  auth: { /* ... */ }
}
```

## Keeping Types in Sync

When the backend changes:

1. Update `types/api.ts` with new/changed entity types
2. Update `lib/trpc-router-types.ts` with new procedures
3. Add new hooks to `hooks/use-trpc.ts` if needed
4. Add mutation functions to `lib/api-mutations.ts`

## Troubleshooting

### "Cannot find module '@/lib/trpc-provider'"
Ensure the path alias is configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "Invalid hook call" errors
Ensure you're using hooks inside the TRPCProvider (check `components/providers.tsx`)

### CORS errors
1. Check `ALLOWED_ORIGINS` environment variable
2. Verify backend CORS settings
3. Check browser console for preflight errors

### 401 Unauthorized errors
1. Verify auth token is set in cookies (`auth_token`)
2. Check token expiration
3. Ensure `extractAuthToken` in route.ts handles your auth method

## Performance Tips

1. **Use pagination** - Always paginate list queries
2. **Prefetch data** - Use SSR for initial page load
3. **Stale while revalidate** - Use `placeholderData` for smooth pagination
4. **Batch requests** - tRPC automatically batches requests
5. **Debounce searches** - Debounce search inputs before calling `useCustomerSearch`

## Security Considerations

1. **Never expose sensitive API keys** - Use server-side env vars
2. **Validate all inputs** - Backend should validate all data
3. **Sanitize error messages** - Don't leak internal details to client
4. **Use HTTPS in production** - Backend URL should use TLS
5. **Implement rate limiting** - Backend should rate limit requests
