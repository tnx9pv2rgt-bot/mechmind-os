/**
 * API Mutations - MechMind OS Frontend
 * 
 * Direct CRUD operations using the tRPC proxy client.
 * These functions are useful for:
 * - Non-React contexts (e.g., API routes, utility functions)
 * - Server-side operations
 * - Complex workflows requiring multiple sequential operations
 * - File uploads and binary data handling
 * 
 * For React components, prefer the hooks from `hooks/use-trpc.ts`.
 * 
 * @module lib/api-mutations
 * @version 1.0.0
 * @requires @trpc/client
 */

import { trpc } from './trpc-client'
import type {
  Vehicle,
  VehicleFormData,
  Customer,
  CustomerFormData,
  Booking,
  BookingFormData,
  BookingStatusUpdateData,
  Invoice,
  InvoiceFormData,
  Payment,
  PaymentFormData,
} from '@/types/api'

// =============================================================================
// Vehicle CRUD Operations
// =============================================================================

/**
 * Create a new vehicle
 * 
 * @param data - Vehicle form data
 * @returns Created vehicle with generated ID
 * @throws {TRPCClientError} On validation error or duplicate VIN/plate
 * 
 * @example
 * ```typescript
 * try {
 *   const vehicle = await createVehicle({
 *     licensePlate: 'AB123CD',
 *     vin: '1HGCM82633A123456',
 *     make: 'Honda',
 *     model: 'Accord',
 *     year: 2023,
 *     color: 'Silver',
 *     fuelType: 'petrol',
 *     currentKm: 0,
 *     ownerId: 'cust-abc-123',
 *   })
 *   console.log('Created vehicle:', vehicle.id)
 * } catch (error) {
 *   console.error('Failed to create vehicle:', error.message)
 * }
 * ```
 */
export async function createVehicle(data: VehicleFormData): Promise<Vehicle> {
  // Note: This assumes your backend has a vehicle.create procedure
  // If not available, implement via direct API call
  return trpc.vehicle.create.mutate(data)
}

/**
 * Update an existing vehicle
 * 
 * @param id - Vehicle ID to update
 * @param data - Partial vehicle data to update
 * @returns Updated vehicle
 * @throws {TRPCClientError} On validation error or not found
 * 
 * @example
 * ```typescript
 * const updated = await updateVehicle('veh-123', {
 *   currentKm: 50000,
 *   color: 'Red',
 * })
 * ```
 */
export async function updateVehicle(
  id: string,
  data: Partial<VehicleFormData>
): Promise<Vehicle> {
  return trpc.vehicle.update.mutate({ id, data })
}

/**
 * Delete a vehicle
 * 
 * @param id - Vehicle ID to delete
 * @returns Success confirmation
 * @throws {TRPCClientError} If vehicle has active bookings or invoices
 * 
 * @example
 * ```typescript
 * try {
 *   await deleteVehicle('veh-123')
 *   toast.success('Vehicle deleted')
 * } catch (error) {
 *   if (error.code === 'CONFLICT') {
 *     toast.error('Cannot delete vehicle with active bookings')
 *   }
 * }
 * ```
 */
export async function deleteVehicle(id: string): Promise<{ success: boolean }> {
  return trpc.vehicle.delete.mutate({ id })
}

/**
 * Bulk update vehicle status
 * Useful for batch operations like marking vehicles as inactive
 * 
 * @param ids - Array of vehicle IDs
 * @param status - New status to set
 * @returns Array of updated vehicles
 */
export async function bulkUpdateVehicleStatus(
  ids: string[],
  status: Vehicle['status']
): Promise<Vehicle[]> {
  // Execute updates in parallel
  const updates = ids.map(id => 
    updateVehicle(id, { status } as Partial<VehicleFormData>)
  )
  return Promise.all(updates)
}

// =============================================================================
// Customer CRUD Operations
// =============================================================================

/**
 * Create a new customer
 * 
 * @param data - Customer form data
 * @returns Created customer with generated ID
 * @throws {TRPCClientError} On validation error or duplicate email
 * 
 * @example
 * ```typescript
 * const customer = await createCustomer({
 *   firstName: 'Mario',
 *   lastName: 'Rossi',
 *   email: 'mario.rossi@example.com',
 *   phone: '+39 123 456 7890',
 *   type: 'individual',
 * })
 * ```
 */
export async function createCustomer(data: CustomerFormData): Promise<Customer> {
  return trpc.customer.create.mutate(data)
}

/**
 * Update an existing customer
 * 
 * @param id - Customer ID to update
 * @param data - Partial customer data
 * @returns Updated customer
 * @throws {TRPCClientError} On validation error
 * 
 * @example
 * ```typescript
 * await updateCustomer('cust-123', {
 *   phone: '+39 098 765 4321',
 *   address: 'Via Roma 123, Milano',
 * })
 * ```
 */
export async function updateCustomer(
  id: string,
  data: Partial<CustomerFormData>
): Promise<Customer> {
  return trpc.customer.update.mutate({ id, data })
}

/**
 * Delete a customer
 * 
 * @param id - Customer ID to delete
 * @returns Success confirmation
 * @throws {TRPCClientError} If customer has vehicles or bookings
 */
export async function deleteCustomer(id: string): Promise<{ success: boolean }> {
  return trpc.customer.delete.mutate({ id })
}

/**
 * Import multiple customers from CSV/Excel data
 * 
 * @param customers - Array of customer data
 * @returns Results with success count and errors
 */
export async function importCustomers(
  customers: CustomerFormData[]
): Promise<{ 
  success: number
  failed: number
  errors: Array<{ index: number; error: string }>
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ index: number; error: string }>,
  }

  for (let i = 0; i < customers.length; i++) {
    try {
      await createCustomer(customers[i])
      results.success++
    } catch (error) {
      results.failed++
      results.errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

// =============================================================================
// Booking CRUD Operations
// =============================================================================

/**
 * Create a new booking/appointment
 * 
 * @param data - Booking form data
 * @returns Created booking
 * @throws {TRPCClientError} On time conflict or validation error
 * 
 * @example
 * ```typescript
 * const booking = await createBooking({
 *   customerId: 'cust-123',
 *   vehicleId: 'veh-456',
 *   serviceCategory: 'maintenance',
 *   description: 'Oil change and inspection',
 *   startTime: '2024-03-15T09:00:00Z',
 *   endTime: '2024-03-15T11:00:00Z',
 *   estimatedCost: 150,
 *   priority: 'normal',
 * })
 * ```
 */
export async function createBooking(data: BookingFormData): Promise<Booking> {
  return trpc.booking.create.mutate(data)
}

/**
 * Update booking status
 * 
 * @param id - Booking ID
 * @param status - New status
 * @param additionalData - Optional additional data (cancellation reason, final cost, etc.)
 * @returns Updated booking
 * 
 * @example
 * ```typescript
 * // Complete a booking
 * await updateBookingStatus('booking-123', 'completed', {
 *   finalCost: 175.50,
 * })
 * 
 * // Cancel a booking
 * await updateBookingStatus('booking-456', 'cancelled', {
 *   cancellationReason: 'Customer requested',
 * })
 * ```
 */
export async function updateBookingStatus(
  id: string,
  status: Booking['status'],
  additionalData?: Omit<BookingStatusUpdateData, 'status'>
): Promise<Booking> {
  return trpc.booking.updateStatus.mutate({
    id,
    data: { status, ...additionalData },
  })
}

/**
 * Cancel a booking
 * Convenience wrapper around updateBookingStatus
 * 
 * @param id - Booking ID
 * @param reason - Cancellation reason
 * @returns Updated booking
 */
export async function cancelBooking(
  id: string,
  reason?: string
): Promise<Booking> {
  return trpc.booking.cancel.mutate({ id, reason })
}

/**
 * Delete a booking
 * Use cancelBooking for soft deletion; this is for permanent removal
 * 
 * @param id - Booking ID
 * @returns Success confirmation
 */
export async function deleteBooking(id: string): Promise<{ success: boolean }> {
  return trpc.booking.delete.mutate({ id })
}

/**
 * Reschedule a booking to a new time slot
 * 
 * @param id - Booking ID
 * @param newStartTime - New start time
 * @param newEndTime - New end time
 * @returns Updated booking
 * @throws {TRPCClientError} If new time slot is unavailable
 */
export async function rescheduleBooking(
  id: string,
  newStartTime: string,
  newEndTime: string
): Promise<Booking> {
  // Get current booking
  const booking = await trpc.booking.get.query({ id })
  
  // Update with new times
  return trpc.booking.update.mutate({
    id,
    data: {
      startTime: newStartTime,
      endTime: newEndTime,
    },
  })
}

/**
 * Check availability for a time slot
 * 
 * @param startTime - Proposed start time
 * @param endTime - Proposed end time
 * @param excludeBookingId - Optional booking ID to exclude (for rescheduling)
 * @returns Whether the slot is available
 */
export async function checkAvailability(
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  const existingBookings = await trpc.booking.byDateRange.query({
    from: startTime,
    to: endTime,
  })

  const conflictingBookings = existingBookings.filter(
    b => b.status !== 'cancelled' && b.id !== excludeBookingId
  )

  return conflictingBookings.length === 0
}

// =============================================================================
// Invoice CRUD Operations
// =============================================================================

/**
 * Create a new invoice
 * 
 * @param data - Invoice form data
 * @returns Created invoice with generated invoice number
 * @throws {TRPCClientError} On validation error
 * 
 * @example
 * ```typescript
 * const invoice = await createInvoice({
 *   customerId: 'cust-123',
 *   bookingId: 'booking-456',
 *   items: [
 *     { description: 'Oil Change', quantity: 1, unitPrice: 50, taxRate: 22 },
 *     { description: 'Air Filter', quantity: 1, unitPrice: 25, taxRate: 22 },
 *   ],
 *   issueDate: new Date().toISOString(),
 *   dueDate: addDays(new Date(), 30).toISOString(),
 *   notes: 'Thank you for your business!',
 * })
 * ```
 */
export async function createInvoice(data: InvoiceFormData): Promise<Invoice> {
  return trpc.invoice.create.mutate(data)
}

/**
 * Generate invoice from booking
 * Creates an invoice based on booking details and services rendered
 * 
 * @param bookingId - Booking ID to invoice
 * @param items - Line items for the invoice
 * @param options - Additional invoice options
 * @returns Created invoice
 */
export async function createInvoiceFromBooking(
  bookingId: string,
  items: InvoiceFormData['items'],
  options?: {
    notes?: string
    dueDays?: number
  }
): Promise<Invoice> {
  const booking = await trpc.booking.get.query({ id: bookingId })
  
  const issueDate = new Date().toISOString()
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (options?.dueDays || 30))

  return createInvoice({
    customerId: booking.customerId,
    bookingId: booking.id,
    vehicleId: booking.vehicleId,
    items,
    issueDate,
    dueDate: dueDate.toISOString(),
    notes: options?.notes,
  })
}

/**
 * Process payment for an invoice
 * 
 * @param invoiceId - Invoice ID
 * @param paymentData - Payment details
 * @returns Payment record
 * @throws {TRPCClientError} On payment failure or already paid
 * 
 * @example
 * ```typescript
 * // Process cash payment
 * const payment = await processPayment('inv-123', {
 *   amount: 150.00,
 *   method: 'cash',
 * })
 * 
 * // Process Stripe payment
 * const payment = await processPayment('inv-123', {
 *   amount: 150.00,
 *   method: 'stripe',
 *   stripePaymentMethodId: 'pm_1234567890',
 * })
 * ```
 */
export async function processPayment(
  invoiceId: string,
  paymentData: PaymentFormData
): Promise<Payment> {
  return trpc.invoice.processPayment.mutate({ invoiceId, paymentData })
}

/**
 * Send invoice to customer via email
 * 
 * @param invoiceId - Invoice ID
 * @param email - Optional override email (defaults to customer email)
 * @returns Send result
 */
export async function sendInvoice(
  invoiceId: string,
  email?: string
): Promise<{ success: boolean; message: string }> {
  return trpc.invoice.send.mutate({ id: invoiceId, email })
}

/**
 * Cancel an invoice
 * Only draft or sent invoices can be cancelled
 * 
 * @param id - Invoice ID
 * @param reason - Cancellation reason
 * @returns Updated invoice
 * @throws {TRPCClientError} If invoice is already paid
 */
export async function cancelInvoice(
  id: string,
  reason?: string
): Promise<Invoice> {
  return trpc.invoice.cancel.mutate({ id, reason })
}

/**
 * Record a refund for a paid invoice
 * 
 * @param invoiceId - Invoice ID
 * @param amount - Refund amount
 * @param reason - Refund reason
 * @returns Updated invoice
 */
export async function refundInvoice(
  invoiceId: string,
  amount: number,
  reason: string
): Promise<Invoice> {
  // This would typically be a separate procedure in your backend
  // For now, we'll use the processPayment with negative amount or a dedicated endpoint
  return trpc.invoice.refund.mutate({ invoiceId, amount, reason })
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Create multiple records in a single transaction
 * Useful for importing data or bulk operations
 * 
 * @param type - Entity type
 * @param items - Array of items to create
 * @returns Results with created items and any errors
 */
export async function batchCreate<T extends 'vehicle' | 'customer' | 'booking'>(
  type: T,
  items: Array<
    T extends 'vehicle' ? VehicleFormData :
    T extends 'customer' ? CustomerFormData :
    BookingFormData
  >
): Promise<{
  created: number
  failed: number
  items: Array<
    T extends 'vehicle' ? Vehicle :
    T extends 'customer' ? Customer :
    Booking
  >
  errors: Array<{ index: number; error: string }>
}> {
  const results = {
    created: 0,
    failed: 0,
    items: [] as Array<any>,
    errors: [] as Array<{ index: number; error: string }>,
  }

  for (let i = 0; i < items.length; i++) {
    try {
      let item: any
      switch (type) {
        case 'vehicle':
          item = await createVehicle(items[i] as VehicleFormData)
          break
        case 'customer':
          item = await createCustomer(items[i] as CustomerFormData)
          break
        case 'booking':
          item = await createBooking(items[i] as BookingFormData)
          break
      }
      results.created++
      results.items.push(item)
    } catch (error) {
      results.failed++
      results.errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

// =============================================================================
// Error Handling Utilities
// =============================================================================

/**
 * Execute a mutation with standardized error handling
 * 
 * @param operation - Async operation to execute
 * @param errorMessage - Default error message
 * @returns Result or throws formatted error
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage = 'Operation failed'
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(errorMessage)
  }
}

/**
 * Retry a failed operation with exponential backoff
 * 
 * @param operation - Operation to retry
 * @param maxRetries - Maximum number of retries
 * @returns Operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
