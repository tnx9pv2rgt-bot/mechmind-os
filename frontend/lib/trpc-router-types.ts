/**
 * tRPC Router Types - MechMind OS Frontend
 * 
 * Type definitions mirroring the backend tRPC router structure.
 * These types enable end-to-end type safety between frontend and backend.
 * 
 * NOTE: This file should be kept in sync with the backend router.
 * When backend routes change, update these type definitions accordingly.
 * 
 * @module lib/trpc-router-types
 * @version 1.0.0
 */

import type {
  Vehicle,
  VehicleStats,
  VehicleFilters,
  Customer,
  CustomerFilters,
  Booking,
  BookingFilters,
  BookingStatus,
  Invoice,
  InvoiceFilters,
  Payment,
  AnalyticsSummary,
  PaginatedResponse,
  CustomerFormData,
  VehicleFormData,
  BookingFormData,
  BookingStatusUpdateData,
  InvoiceFormData,
  PaymentFormData,
  PaginationParams,
  SortConfig,
} from '@/types/api'

// =============================================================================
// Router Procedure Types
// =============================================================================

/**
 * Procedure type for queries (read operations)
 */
interface QueryProcedure<TInput, TOutput> {
  query(input: TInput): Promise<TOutput>
}

/**
 * Procedure type for mutations (write operations)
 */
interface MutationProcedure<TInput, TOutput> {
  mutate(input: TInput): Promise<TOutput>
}

/**
 * Procedure type for subscriptions (real-time updates)
 */
interface SubscriptionProcedure<TInput, TOutput> {
  subscribe(input: TInput, opts: { onData: (data: TOutput) => void }): { unsubscribe: () => void }
}

// =============================================================================
// Vehicle Router
// =============================================================================

interface ListVehiclesInput extends PaginationParams {
  filters?: VehicleFilters
  sort?: SortConfig
}

interface GetVehicleInput {
  id: string
}

interface VehicleRouter {
  /** List all vehicles with pagination and filtering */
  list: QueryProcedure<ListVehiclesInput, PaginatedResponse<Vehicle>>
  /** Get a single vehicle by ID */
  get: QueryProcedure<GetVehicleInput, Vehicle>
  /** Get vehicle statistics */
  stats: QueryProcedure<void, VehicleStats>
  /** Get vehicles by customer ID */
  byCustomer: QueryProcedure<{ customerId: string }, Vehicle[]>
}

// =============================================================================
// Customer Router
// =============================================================================

interface ListCustomersInput extends PaginationParams {
  filters?: CustomerFilters
  sort?: SortConfig
}

interface UpdateCustomerInput {
  id: string
  data: CustomerFormData
}

interface DeleteCustomerInput {
  id: string
}

interface CustomerRouter {
  /** List all customers with pagination and filtering */
  list: QueryProcedure<ListCustomersInput, PaginatedResponse<Customer>>
  /** Get a single customer by ID */
  get: QueryProcedure<{ id: string }, Customer>
  /** Create a new customer */
  create: MutationProcedure<CustomerFormData, Customer>
  /** Update an existing customer */
  update: MutationProcedure<UpdateCustomerInput, Customer>
  /** Delete a customer */
  delete: MutationProcedure<DeleteCustomerInput, { success: boolean }>
  /** Search customers by name, email, or phone */
  search: QueryProcedure<{ query: string; limit?: number }, Customer[]>
}

// =============================================================================
// Booking Router
// =============================================================================

interface ListBookingsInput extends PaginationParams {
  filters?: BookingFilters
  sort?: SortConfig
}

interface UpdateBookingStatusInput {
  id: string
  data: BookingStatusUpdateData
}

interface DeleteBookingInput {
  id: string
}

interface BookingRouter {
  /** List all bookings with pagination and filtering */
  list: QueryProcedure<ListBookingsInput, PaginatedResponse<Booking>>
  /** Get a single booking by ID */
  get: QueryProcedure<{ id: string }, Booking>
  /** Create a new booking */
  create: MutationProcedure<BookingFormData, Booking>
  /** Update booking status */
  updateStatus: MutationProcedure<UpdateBookingStatusInput, Booking>
  /** Cancel a booking */
  cancel: MutationProcedure<{ id: string; reason?: string }, Booking>
  /** Delete a booking */
  delete: MutationProcedure<DeleteBookingInput, { success: boolean }>
  /** Get bookings by date range */
  byDateRange: QueryProcedure<{ from: string; to: string }, Booking[]>
  /** Get today's bookings */
  today: QueryProcedure<void, Booking[]>
  /** Subscribe to booking updates (real-time) */
  onUpdate: SubscriptionProcedure<void, Booking>
}

// =============================================================================
// Invoice Router
// =============================================================================

interface ListInvoicesInput extends PaginationParams {
  filters?: InvoiceFilters
  sort?: SortConfig
}

interface ProcessPaymentInput {
  invoiceId: string
  paymentData: PaymentFormData
}

interface SendInvoiceInput {
  id: string
  email?: string
}

interface InvoiceRouter {
  /** List all invoices with pagination and filtering */
  list: QueryProcedure<ListInvoicesInput, PaginatedResponse<Invoice>>
  /** Get a single invoice by ID */
  get: QueryProcedure<{ id: string }, Invoice>
  /** Create a new invoice */
  create: MutationProcedure<InvoiceFormData, Invoice>
  /** Process payment for an invoice */
  processPayment: MutationProcedure<ProcessPaymentInput, Payment>
  /** Send invoice to customer via email */
  send: MutationProcedure<SendInvoiceInput, { success: boolean; message: string }>
  /** Cancel an invoice */
  cancel: MutationProcedure<{ id: string; reason?: string }, Invoice>
  /** Get invoice by invoice number */
  byNumber: QueryProcedure<{ invoiceNumber: string }, Invoice>
  /** Get overdue invoices */
  overdue: QueryProcedure<PaginationParams, PaginatedResponse<Invoice>>
  /** Get customer invoice history */
  byCustomer: QueryProcedure<{ customerId: string }, Invoice[]>
}

// =============================================================================
// Analytics Router
// =============================================================================

interface GetAnalyticsInput {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  date?: string
}

interface AnalyticsRouter {
  /** Get dashboard analytics summary */
  summary: QueryProcedure<GetAnalyticsInput, AnalyticsSummary>
  /** Get revenue analytics */
  revenue: QueryProcedure<GetAnalyticsInput, AnalyticsSummary['revenueChart']>
  /** Get service breakdown analytics */
  services: QueryProcedure<GetAnalyticsInput, AnalyticsSummary['serviceBreakdown']>
  /** Get customer analytics */
  customers: QueryProcedure<GetAnalyticsInput, AnalyticsSummary['customerMetrics']>
}

// =============================================================================
// Auth Router
// =============================================================================

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName?: string
}

interface RefreshTokenInput {
  refreshToken: string
}

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

interface AuthRouter {
  /** Login with email and password */
  login: MutationProcedure<LoginInput, AuthResponse>
  /** Register a new account */
  register: MutationProcedure<RegisterInput, AuthResponse>
  /** Refresh access token */
  refresh: MutationProcedure<RefreshTokenInput, { accessToken: string; expiresIn: number }>
  /** Logout (invalidate tokens) */
  logout: MutationProcedure<void, { success: boolean }>
  /** Get current user info */
  me: QueryProcedure<void, AuthResponse['user']>
}

// =============================================================================
// Main App Router
// =============================================================================

/**
 * Main tRPC app router type definition
 * Mirrors the backend router structure for end-to-end type safety
 */
export interface AppRouter {
  /** Vehicle management procedures */
  vehicle: VehicleRouter
  /** Customer management procedures */
  customer: CustomerRouter
  /** Booking/Appointment procedures */
  booking: BookingRouter
  /** Invoice and billing procedures */
  invoice: InvoiceRouter
  /** Analytics and reporting procedures */
  analytics: AnalyticsRouter
  /** Authentication procedures */
  auth: AuthRouter
}

// =============================================================================
// Utility Types for Frontend Usage
// =============================================================================

/**
 * Helper type to extract input type from a procedure
 */
export type InferProcedureInput<TProcedure> = 
  TProcedure extends QueryProcedure<infer TInput, any> ? TInput :
  TProcedure extends MutationProcedure<infer TInput, any> ? TInput :
  TProcedure extends SubscriptionProcedure<infer TInput, any> ? TInput :
  never

/**
 * Helper type to extract output type from a procedure
 */
export type InferProcedureOutput<TProcedure> = 
  TProcedure extends QueryProcedure<any, infer TOutput> ? TOutput :
  TProcedure extends MutationProcedure<any, infer TOutput> ? TOutput :
  TProcedure extends SubscriptionProcedure<any, infer TOutput> ? TOutput :
  never

/**
 * All router paths for type-safe routing
 */
export type AppRouterPaths = keyof AppRouter
