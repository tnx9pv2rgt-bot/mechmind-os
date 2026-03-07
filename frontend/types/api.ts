/**
 * tRPC API Types - MechMind OS Frontend
 * 
 * TypeScript type definitions matching the backend tRPC router.
 * These types ensure type safety across the frontend-backend boundary.
 * 
 * @module types/api
 * @version 1.0.0
 */

import { Vehicle, VehicleStats, VehicleFilters } from './vehicles'

// =============================================================================
// Core Entity Types
// =============================================================================

/**
 * Customer entity representing a vehicle owner or business client
 */
export interface Customer {
  /** Unique identifier (UUID) */
  id: string
  /** First name */
  firstName: string
  /** Last name */
  lastName: string
  /** Email address (unique) */
  email: string
  /** Phone number */
  phone: string
  /** Physical address */
  address?: string
  /** City */
  city?: string
  /** Postal code */
  postalCode?: string
  /** Tax ID / VAT number */
  taxId?: string
  /** Customer type */
  type: 'individual' | 'business'
  /** Account status */
  status: 'active' | 'inactive' | 'blocked'
  /** Number of registered vehicles */
  vehicleCount: number
  /** Total amount spent */
  totalSpent: number
  /** Timestamp of creation */
  createdAt: string
  /** Timestamp of last update */
  updatedAt: string
  /** Last login timestamp */
  lastLoginAt?: string
  /** Additional notes */
  notes?: string
}

/**
 * Vehicle entity (re-exported with API-specific extensions)
 */
export type { Vehicle, VehicleStats, VehicleFilters }

/**
 * Booking/Reservation status
 */
export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'

/**
 * Service category for bookings
 */
export type ServiceCategory =
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'diagnostic'
  | 'tire_change'
  | 'bodywork'
  | 'detailing'
  | 'other'

/**
 * Booking entity representing a service appointment
 */
export interface Booking {
  /** Unique identifier (UUID) */
  id: string
  /** Associated customer ID */
  customerId: string
  /** Customer details (populated in responses) */
  customer?: Customer
  /** Associated vehicle ID */
  vehicleId: string
  /** Vehicle details (populated in responses) */
  vehicle?: Vehicle
  /** Service category */
  serviceCategory: ServiceCategory
  /** Detailed service description */
  description: string
  /** Scheduled start time */
  startTime: string
  /** Scheduled end time */
  endTime: string
  /** Current status */
  status: BookingStatus
  /** Assigned mechanic ID */
  assignedTo?: string
  /** Mechanic name (populated in responses) */
  mechanicName?: string
  /** Estimated cost */
  estimatedCost?: number
  /** Final cost */
  finalCost?: number
  /** Whether a courtesy car is provided */
  courtesyCar: boolean
  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'urgent'
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Cancellation reason (if applicable) */
  cancellationReason?: string
  /** Customer notes */
  customerNotes?: string
  /** Internal notes */
  internalNotes?: string
}

/**
 * Invoice status
 */
export type InvoiceStatus = 
  | 'draft' 
  | 'sent' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled' 
  | 'refunded'

/**
 * Payment method types
 */
export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'bank_transfer' 
  | 'paypal' 
  | 'stripe' 
  | 'check'

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  /** Line item ID */
  id: string
  /** Description of service/part */
  description: string
  /** Quantity */
  quantity: number
  /** Unit price */
  unitPrice: number
  /** VAT/Tax rate percentage */
  taxRate: number
  /** Total amount (quantity * unitPrice) */
  total: number
}

/**
 * Invoice entity
 */
export interface Invoice {
  /** Unique identifier (UUID) */
  id: string
  /** Invoice number (human-readable) */
  invoiceNumber: string
  /** Associated customer ID */
  customerId: string
  /** Customer details (populated in responses) */
  customer?: Customer
  /** Associated booking ID (optional) */
  bookingId?: string
  /** Associated vehicle ID */
  vehicleId?: string
  /** Vehicle details (populated in responses) */
  vehicle?: Vehicle
  /** Line items */
  items: InvoiceLineItem[]
  /** Subtotal before tax */
  subtotal: number
  /** Total tax amount */
  taxAmount: number
  /** Grand total */
  total: number
  /** Amount paid */
  paidAmount: number
  /** Outstanding balance */
  balanceDue: number
  /** Current status */
  status: InvoiceStatus
  /** Issue date */
  issueDate: string
  /** Due date */
  dueDate: string
  /** Payment date (if paid) */
  paidAt?: string
  /** Payment method used */
  paymentMethod?: PaymentMethod
  /** Payment transaction ID */
  paymentTransactionId?: string
  /** Notes for customer */
  notes?: string
  /** Internal notes */
  internalNotes?: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
}

/**
 * Payment record
 */
export interface Payment {
  /** Unique identifier (UUID) */
  id: string
  /** Associated invoice ID */
  invoiceId: string
  /** Payment amount */
  amount: number
  /** Payment method */
  method: PaymentMethod
  /** Transaction ID from payment provider */
  transactionId?: string
  /** Payment timestamp */
  paidAt: string
  /** Payment status */
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  /** Refund reason (if refunded) */
  refundReason?: string
  /** Refund timestamp (if refunded) */
  refundedAt?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// =============================================================================
// Analytics Types
// =============================================================================

/**
 * Revenue analytics data point
 */
export interface RevenueDataPoint {
  /** Date/period label */
  date: string
  /** Revenue amount */
  revenue: number
  /** Number of transactions */
  transactionCount: number
}

/**
 * Service analytics data
 */
export interface ServiceAnalytics {
  /** Service category */
  category: ServiceCategory
  /** Number of bookings */
  count: number
  /** Total revenue */
  revenue: number
  /** Average completion time (minutes) */
  avgCompletionTime: number
}

/**
 * Customer analytics
 */
export interface CustomerAnalytics {
  /** Total customers */
  totalCustomers: number
  /** New customers this period */
  newCustomers: number
  /** Returning customers count */
  returningCustomers: number
  /** Average customer lifetime value */
  averageLTV: number
}

/**
 * Dashboard analytics summary
 */
export interface AnalyticsSummary {
  /** Period start date */
  periodStart: string
  /** Period end date */
  periodEnd: string
  /** Total revenue */
  totalRevenue: number
  /** Revenue change percentage from previous period */
  revenueChange: number
  /** Total bookings */
  totalBookings: number
  /** Bookings change percentage */
  bookingsChange: number
  /** New customers */
  newCustomers: number
  /** Customers change percentage */
  customersChange: number
  /** Completed services */
  completedServices: number
  /** Services change percentage */
  servicesChange: number
  /** Revenue chart data */
  revenueChart: RevenueDataPoint[]
  /** Service breakdown */
  serviceBreakdown: ServiceAnalytics[]
  /** Customer metrics */
  customerMetrics: CustomerAnalytics
}

// =============================================================================
// Query Parameter Types
// =============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number
  /** Items per page */
  limit: number
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Field to sort by */
  field: string
  /** Sort direction */
  direction: SortDirection
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  /** Start date (ISO string) */
  from?: string
  /** End date (ISO string) */
  to?: string
}

/**
 * Customer query filters
 */
export interface CustomerFilters {
  /** Search term (name, email, phone) */
  search?: string
  /** Filter by type */
  type?: 'individual' | 'business'
  /** Filter by status */
  status?: Customer['status']
  /** Date range for creation */
  createdAtRange?: DateRangeFilter
}

/**
 * Booking query filters
 */
export interface BookingFilters {
  /** Search term */
  search?: string
  /** Filter by status */
  status?: BookingStatus
  /** Filter by customer ID */
  customerId?: string
  /** Filter by vehicle ID */
  vehicleId?: string
  /** Date range for start time */
  dateRange?: DateRangeFilter
  /** Filter by mechanic */
  assignedTo?: string
}

/**
 * Invoice query filters
 */
export interface InvoiceFilters {
  /** Search term (invoice number, customer name) */
  search?: string
  /** Filter by status */
  status?: InvoiceStatus
  /** Filter by customer ID */
  customerId?: string
  /** Date range for issue date */
  dateRange?: DateRangeFilter
  /** Minimum amount */
  minAmount?: number
  /** Maximum amount */
  maxAmount?: number
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Data items */
  items: T[]
  /** Total count (for pagination) */
  total: number
  /** Current page */
  page: number
  /** Items per page */
  limit: number
  /** Total pages */
  totalPages: number
  /** Has next page */
  hasNextPage: boolean
  /** Has previous page */
  hasPrevPage: boolean
}

/**
 * API success response
 */
export interface ApiSuccessResponse<T> {
  /** Success flag */
  success: true
  /** Response data */
  data: T
  /** Response timestamp */
  timestamp: string
  /** Request ID for tracing */
  requestId?: string
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  /** Success flag */
  success: false
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Detailed error information */
  details?: Record<string, string[]>
  /** Response timestamp */
  timestamp: string
  /** Request ID for tracing */
  requestId?: string
}

/**
 * Union type for API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// =============================================================================
// Form Data Types (for mutations)
// =============================================================================

/**
 * Customer creation/update data
 */
export interface CustomerFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  city?: string
  postalCode?: string
  taxId?: string
  type: 'individual' | 'business'
  notes?: string
}

/**
 * Booking creation/update data
 */
export interface BookingFormData {
  customerId: string
  vehicleId: string
  serviceCategory: ServiceCategory
  description: string
  startTime: string
  endTime: string
  estimatedCost?: number
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  courtesyCar?: boolean
  customerNotes?: string
  internalNotes?: string
}

/**
 * Booking status update data
 */
export interface BookingStatusUpdateData {
  status: BookingStatus
  cancellationReason?: string
  finalCost?: number
  internalNotes?: string
}

/**
 * Invoice creation data
 */
export interface InvoiceFormData {
  customerId: string
  bookingId?: string
  vehicleId?: string
  items: Omit<InvoiceLineItem, 'id' | 'total'>[]
  issueDate: string
  dueDate: string
  notes?: string
  internalNotes?: string
}

/**
 * Payment processing data
 */
export interface PaymentFormData {
  amount: number
  method: PaymentMethod
  stripePaymentMethodId?: string
  metadata?: Record<string, unknown>
}

/**
 * Vehicle creation/update data
 */
export interface VehicleFormData {
  licensePlate: string
  vin: string
  make: string
  model: string
  year: number
  color: string
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'cng'
  currentKm: number
  ownerId: string
  notes?: string
}
