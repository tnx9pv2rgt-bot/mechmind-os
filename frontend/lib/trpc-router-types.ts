/**
 * tRPC Router Types - MechMind OS Frontend
 *
 * Type definitions mirroring the backend tRPC router structure.
 * Uses initTRPC to create proper router types that satisfy AnyRouter.
 *
 * NOTE: This file should be kept in sync with the backend router.
 * When backend routes change, update these type definitions accordingly.
 *
 * @module lib/trpc-router-types
 * @version 1.0.0
 */

import { initTRPC } from '@trpc/server'
import { z } from 'zod'

import type {
  Vehicle,
  VehicleStats,
  VehicleFilters,
  Customer,
  CustomerFilters,
  Booking,
  BookingFilters,
  Invoice,
  InvoiceFilters,
  Payment,
  AnalyticsSummary,
  PaginatedResponse,
  CustomerFormData,
  BookingFormData,
  BookingStatusUpdateData,
  InvoiceFormData,
  PaymentFormData,
  PaginationParams,
  SortConfig,
} from '@/types/api'

// =============================================================================
// tRPC Instance (type-only, not used at runtime on the frontend)
// =============================================================================

const t = initTRPC.create()
const router = t.router
const publicProcedure = t.procedure

// =============================================================================
// Vehicle Router
// =============================================================================

const vehicleRouter = router({
  list: publicProcedure
    .input((val: unknown) => val as { page: number; limit: number; filters?: VehicleFilters; sort?: SortConfig })
    .query((): PaginatedResponse<Vehicle> => { throw new Error('stub') }),
  get: publicProcedure
    .input((val: unknown) => val as { id: string })
    .query((): Vehicle => { throw new Error('stub') }),
  stats: publicProcedure
    .query((): VehicleStats => { throw new Error('stub') }),
  byCustomer: publicProcedure
    .input((val: unknown) => val as { customerId: string })
    .query((): Vehicle[] => { throw new Error('stub') }),
})

// =============================================================================
// Customer Router
// =============================================================================

const customerRouter = router({
  list: publicProcedure
    .input((val: unknown) => val as { page: number; limit: number; filters?: CustomerFilters; sort?: SortConfig })
    .query((): PaginatedResponse<Customer> => { throw new Error('stub') }),
  get: publicProcedure
    .input((val: unknown) => val as { id: string })
    .query((): Customer => { throw new Error('stub') }),
  create: publicProcedure
    .input((val: unknown) => val as CustomerFormData)
    .mutation((): Customer => { throw new Error('stub') }),
  update: publicProcedure
    .input((val: unknown) => val as { id: string; data: CustomerFormData })
    .mutation((): Customer => { throw new Error('stub') }),
  delete: publicProcedure
    .input((val: unknown) => val as { id: string })
    .mutation((): { success: boolean } => { throw new Error('stub') }),
  search: publicProcedure
    .input((val: unknown) => val as { query: string; limit?: number })
    .query((): Customer[] => { throw new Error('stub') }),
})

// =============================================================================
// Booking Router
// =============================================================================

const bookingRouter = router({
  list: publicProcedure
    .input((val: unknown) => val as { page: number; limit: number; filters?: BookingFilters; sort?: SortConfig })
    .query((): PaginatedResponse<Booking> => { throw new Error('stub') }),
  get: publicProcedure
    .input((val: unknown) => val as { id: string })
    .query((): Booking => { throw new Error('stub') }),
  create: publicProcedure
    .input((val: unknown) => val as BookingFormData)
    .mutation((): Booking => { throw new Error('stub') }),
  updateStatus: publicProcedure
    .input((val: unknown) => val as { id: string; data: BookingStatusUpdateData })
    .mutation((): Booking => { throw new Error('stub') }),
  cancel: publicProcedure
    .input((val: unknown) => val as { id: string; reason?: string })
    .mutation((): Booking => { throw new Error('stub') }),
  delete: publicProcedure
    .input((val: unknown) => val as { id: string })
    .mutation((): { success: boolean } => { throw new Error('stub') }),
  byDateRange: publicProcedure
    .input((val: unknown) => val as { from: string; to: string })
    .query((): Booking[] => { throw new Error('stub') }),
  today: publicProcedure
    .query((): Booking[] => { throw new Error('stub') }),
})

// =============================================================================
// Invoice Router
// =============================================================================

const invoiceRouter = router({
  list: publicProcedure
    .input((val: unknown) => val as { page: number; limit: number; filters?: InvoiceFilters; sort?: SortConfig })
    .query((): PaginatedResponse<Invoice> => { throw new Error('stub') }),
  get: publicProcedure
    .input((val: unknown) => val as { id: string })
    .query((): Invoice => { throw new Error('stub') }),
  create: publicProcedure
    .input((val: unknown) => val as InvoiceFormData)
    .mutation((): Invoice => { throw new Error('stub') }),
  processPayment: publicProcedure
    .input((val: unknown) => val as { invoiceId: string; paymentData: PaymentFormData })
    .mutation((): Payment => { throw new Error('stub') }),
  send: publicProcedure
    .input((val: unknown) => val as { id: string; email?: string })
    .mutation((): { success: boolean; message: string } => { throw new Error('stub') }),
  cancel: publicProcedure
    .input((val: unknown) => val as { id: string; reason?: string })
    .mutation((): Invoice => { throw new Error('stub') }),
  byNumber: publicProcedure
    .input((val: unknown) => val as { invoiceNumber: string })
    .query((): Invoice => { throw new Error('stub') }),
  overdue: publicProcedure
    .input((val: unknown) => val as PaginationParams)
    .query((): PaginatedResponse<Invoice> => { throw new Error('stub') }),
  byCustomer: publicProcedure
    .input((val: unknown) => val as { customerId: string })
    .query((): Invoice[] => { throw new Error('stub') }),
})

// =============================================================================
// Analytics Router
// =============================================================================

const analyticsRouter = router({
  summary: publicProcedure
    .input((val: unknown) => val as { period: 'day' | 'week' | 'month' | 'quarter' | 'year'; date?: string })
    .query((): AnalyticsSummary => { throw new Error('stub') }),
  revenue: publicProcedure
    .input((val: unknown) => val as { period: 'day' | 'week' | 'month' | 'quarter' | 'year'; date?: string })
    .query((): AnalyticsSummary['revenueChart'] => { throw new Error('stub') }),
  services: publicProcedure
    .input((val: unknown) => val as { period: 'day' | 'week' | 'month' | 'quarter' | 'year'; date?: string })
    .query((): AnalyticsSummary['serviceBreakdown'] => { throw new Error('stub') }),
  customers: publicProcedure
    .input((val: unknown) => val as { period: 'day' | 'week' | 'month' | 'quarter' | 'year'; date?: string })
    .query((): AnalyticsSummary['customerMetrics'] => { throw new Error('stub') }),
})

// =============================================================================
// Auth Router
// =============================================================================

interface AuthResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: 'admin' | 'manager' | 'mechanic' | 'receptionist'
  }
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const authRouter = router({
  login: publicProcedure
    .input((val: unknown) => val as { email: string; password: string })
    .mutation((): AuthResponse => { throw new Error('stub') }),
  register: publicProcedure
    .input((val: unknown) => val as { email: string; password: string; firstName: string; lastName: string; companyName?: string })
    .mutation((): AuthResponse => { throw new Error('stub') }),
  refresh: publicProcedure
    .input((val: unknown) => val as { refreshToken: string })
    .mutation((): { accessToken: string; expiresIn: number } => { throw new Error('stub') }),
  logout: publicProcedure
    .mutation((): { success: boolean } => { throw new Error('stub') }),
  me: publicProcedure
    .query((): AuthResponse['user'] => { throw new Error('stub') }),
})

// =============================================================================
// Inspection Router
// =============================================================================

const inspectionRouter = router({
  list: publicProcedure
    .input((val: unknown) => val as { page: number; limit: number; filters?: Record<string, unknown>; sort?: SortConfig })
    .query((): PaginatedResponse<unknown> => { throw new Error('stub') }),
  get: publicProcedure
    .input((val: unknown) => val as { id: string })
    .query((): unknown => { throw new Error('stub') }),
  create: publicProcedure
    .input((val: unknown) => val as Record<string, unknown>)
    .mutation((): unknown => { throw new Error('stub') }),
  update: publicProcedure
    .input((val: unknown) => val as { id: string; data: Record<string, unknown> })
    .mutation((): unknown => { throw new Error('stub') }),
  complete: publicProcedure
    .input((val: unknown) => val as { id: string })
    .mutation((): unknown => { throw new Error('stub') }),
})

// =============================================================================
// Main App Router
// =============================================================================

const appRouter = router({
  vehicle: vehicleRouter,
  customer: customerRouter,
  booking: bookingRouter,
  invoice: invoiceRouter,
  analytics: analyticsRouter,
  auth: authRouter,
  inspection: inspectionRouter,
})

/**
 * Main tRPC app router type definition
 * Properly extends AnyRouter for type compatibility with createTRPCReact
 */
export type AppRouter = typeof appRouter

/**
 * All router paths for type-safe routing
 */
export type AppRouterPaths = keyof AppRouter['_def']['record']
