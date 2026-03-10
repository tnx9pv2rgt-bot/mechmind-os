/**
 * tRPC Custom Hooks - MechMind OS Frontend
 * 
 * Pre-built hooks for common tRPC queries and mutations.
 * These hooks provide a clean abstraction over the raw tRPC hooks
 * with sensible defaults, caching strategies, and error handling.
 * 
 * @module hooks/use-trpc
 * @version 1.0.0
 * @requires @trpc/react-query
 */

import { useCallback } from 'react'
import { trpc } from '@/lib/trpc-provider'
import type {
  Vehicle,
  VehicleFilters,
  Customer,
  CustomerFilters,
  Booking,
  BookingFilters,
  BookingStatus,
  Invoice,
  InvoiceFilters,
  AnalyticsSummary,
  PaginatedResponse,
  CustomerFormData,
  BookingFormData,
  BookingStatusUpdateData,
  InvoiceFormData,
  PaymentFormData,
  Payment,
} from '@/types/api'

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Default pagination parameters
 */
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

/**
 * Options for list queries
 */
interface ListQueryOptions {
  /** Page number (1-based) */
  page?: number
  /** Items per page */
  limit?: number
  /** Enable the query */
  enabled?: boolean
}

// =============================================================================
// Vehicle Hooks
// =============================================================================

/**
 * Hook for fetching paginated vehicle list with filtering
 * 
 * @param filters - Vehicle filter criteria
 * @param options - Query options (pagination, enabled state)
 * @returns Query result with vehicles, pagination info, and loading state
 * 
 * @example
 * ```tsx
 * function VehicleList() {
 *   const [page, setPage] = useState(1)
 *   const { data, isLoading } = useVehicles(
 *     { status: 'active', search: 'ABC' },
 *     { page, limit: 10 }
 *   )
 *   
 *   return (
 *     <div>
 *       {isLoading ? <Spinner /> : (
 *         <>
 *           {data?.items.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
 *           <Pagination 
 *             currentPage={page} 
 *             totalPages={data?.totalPages || 1}
 *             onPageChange={setPage}
 *           />
 *         </>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useVehicles(
  filters: VehicleFilters = {},
  options: ListQueryOptions = {}
) {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, enabled = true } = options

  return trpc.vehicle.list.useQuery(
    { page, limit, filters },
    {
      enabled,
      // Keep previous data while fetching new page for smooth pagination
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching a single vehicle by ID
 * 
 * @param id - Vehicle ID (nullish values disable the query)
 * @returns Query result with vehicle data
 * 
 * @example
 * ```tsx
 * function VehicleDetail({ vehicleId }: { vehicleId: string }) {
 *   const { data: vehicle, isLoading, error } = useVehicle(vehicleId)
 *   
 *   if (isLoading) return <Loading />
 *   if (error) return <Error message={error.message} />
 *   if (!vehicle) return <NotFound />
 *   
 *   return <VehicleCard vehicle={vehicle} />
 * }
 * ```
 */
export function useVehicle(id: string | null | undefined) {
  return trpc.vehicle.get.useQuery(
    { id: id! },
    { enabled: !!id }
  )
}

/**
 * Hook for fetching vehicle statistics
 * 
 * @returns Query result with vehicle stats (total, active, in service, etc.)
 * 
 * @example
 * ```tsx
 * function DashboardStats() {
 *   const { data: stats } = useVehicleStats()
 *   
 *   return (
 *     <div className="grid grid-cols-4 gap-4">
 *       <StatCard label="Total" value={stats?.total} />
 *       <StatCard label="Active" value={stats?.active} />
 *       <StatCard label="In Service" value={stats?.inService} />
 *       <StatCard label="Overdue" value={stats?.overdue} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useVehicleStats() {
  return trpc.vehicle.stats.useQuery(undefined, {
    // Stats don't change frequently, cache for longer
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching vehicles by customer
 * 
 * @param customerId - Customer ID
 * @returns Query result with customer's vehicles
 */
export function useVehiclesByCustomer(customerId: string | null | undefined) {
  return trpc.vehicle.byCustomer.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  )
}

// =============================================================================
// Customer Hooks
// =============================================================================

/**
 * Hook for fetching paginated customer list
 * 
 * @param filters - Customer filter criteria
 * @param options - Query options
 * @returns Query result with customers and pagination info
 * 
 * @example
 * ```tsx
 * function CustomerDirectory() {
 *   const [search, setSearch] = useState('')
 *   const { data, isLoading } = useCustomers(
 *     { search, type: 'individual' },
 *     { limit: 25 }
 *   )
 *   
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <CustomerTable customers={data?.items} loading={isLoading} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useCustomers(
  filters: CustomerFilters = {},
  options: ListQueryOptions = {}
) {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, enabled = true } = options

  return trpc.customer.list.useQuery(
    { page, limit, filters },
    {
      enabled,
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching a single customer by ID
 * 
 * @param id - Customer ID
 * @returns Query result with customer data
 */
export function useCustomer(id: string | null | undefined) {
  return trpc.customer.get.useQuery(
    { id: id! },
    { enabled: !!id }
  )
}

/**
 * Hook for searching customers (autocomplete/dropdown use cases)
 * 
 * @param query - Search query (min 2 characters)
 * @param limit - Maximum results to return
 * @returns Query result with matching customers
 * 
 * @example
 * ```tsx
 * function CustomerAutocomplete() {
 *   const [query, setQuery] = useState('')
 *   const { data: customers } = useCustomerSearch(query, 10)
 *   
 *   return (
 *     <Autocomplete
 *       options={customers || []}
 *       onSearch={setQuery}
 *       getOptionLabel={(c) => `${c.firstName} ${c.lastName}`}
 *     />
 *   )
 * }
 * ```
 */
export function useCustomerSearch(query: string, limit = 10) {
  return trpc.customer.search.useQuery(
    { query, limit },
    { enabled: query.length >= 2 }
  )
}

/**
 * Hook for updating a customer
 * 
 * @returns Mutation function and state
 * 
 * @example
 * ```tsx
 * function EditCustomerForm({ customer }: { customer: Customer }) {
 *   const updateCustomer = useUpdateCustomer()
 *   
 *   const onSubmit = async (data: CustomerFormData) => {
 *     await updateCustomer.mutateAsync({
 *       id: customer.id,
 *       data,
 *     })
 *     toast.success('Customer updated')
 *   }
 *   
 *   return <form onSubmit={handleSubmit(onSubmit)}>...</form>
 * }
 * ```
 */
export function useUpdateCustomer() {
  const utils = trpc.useUtils()

  return trpc.customer.update.useMutation({
    onSuccess: (updatedCustomer) => {
      // Invalidate affected queries
      utils.customer.list.invalidate()
      utils.customer.get.invalidate({ id: updatedCustomer.id })
    },
  })
}

// =============================================================================
// Booking Hooks
// =============================================================================

/**
 * Hook for fetching paginated booking list
 * 
 * @param filters - Booking filter criteria
 * @param options - Query options
 * @returns Query result with bookings and pagination
 * 
 * @example
 * ```tsx
 * function BookingCalendar() {
 *   const { data: bookings } = useBookings({
 *     dateRange: { from: startOfWeek, to: endOfWeek }
 *   })
 *   
 *   return <Calendar events={bookings?.items.map(toCalendarEvent)} />
 * }
 * ```
 */
export function useBookings(
  filters: BookingFilters = {},
  options: ListQueryOptions = {}
) {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, enabled = true } = options

  return trpc.booking.list.useQuery(
    { page, limit, filters },
    {
      enabled,
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching a single booking by ID
 * 
 * @param id - Booking ID
 * @returns Query result with booking data
 */
export function useBooking(id: string | null | undefined) {
  return trpc.booking.get.useQuery(
    { id: id! },
    { enabled: !!id }
  )
}

/**
 * Hook for fetching today's bookings
 * 
 * @returns Query result with today's appointments
 */
export function useTodaysBookings() {
  return trpc.booking.today.useQuery(undefined, {
    // Refresh frequently for today's bookings
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes
  })
}

/**
 * Hook for fetching bookings by date range (for calendar views)
 * 
 * @param from - Start date (ISO string)
 * @param to - End date (ISO string)
 * @returns Query result with bookings in date range
 */
export function useBookingsByDateRange(from: string, to: string) {
  return trpc.booking.byDateRange.useQuery(
    { from, to },
    { enabled: !!from && !!to }
  )
}

/**
 * Hook for creating a new booking
 * 
 * @returns Mutation function and state
 * 
 * @example
 * ```tsx
 * function NewBookingForm() {
 *   const createBooking = useCreateBooking()
 *   
 *   const onSubmit = async (data: BookingFormData) => {
 *     const booking = await createBooking.mutateAsync(data)
 *     router.push(`/bookings/${booking.id}`)
 *     toast.success('Booking created successfully')
 *   }
 *   
 *   return <BookingForm onSubmit={onSubmit} loading={createBooking.isPending} />
 * }
 * ```
 */
export function useCreateBooking() {
  const utils = trpc.useUtils()

  return trpc.booking.create.useMutation({
    onSuccess: () => {
      // Invalidate all booking-related queries
      utils.booking.list.invalidate()
      utils.booking.today.invalidate()
      utils.booking.byDateRange.invalidate()
    },
  })
}

/**
 * Hook for updating booking status
 * 
 * @returns Mutation function and state
 * 
 * @example
 * ```tsx
 * function BookingActions({ booking }: { booking: Booking }) {
 *   const updateStatus = useUpdateBookingStatus()
 *   
 *   const handleComplete = () => {
 *     updateStatus.mutate({
 *       id: booking.id,
 *       data: { status: 'completed', finalCost: 150 }
 *     })
 *   }
 *   
 *   return <Button onClick={handleComplete}>Mark Complete</Button>
 * }
 * ```
 */
export function useUpdateBookingStatus() {
  const utils = trpc.useUtils()

  return trpc.booking.updateStatus.useMutation({
    onSuccess: (updatedBooking) => {
      utils.booking.list.invalidate()
      utils.booking.get.invalidate({ id: updatedBooking.id })
      utils.booking.today.invalidate()
    },
  })
}

/**
 * Hook for cancelling a booking
 * 
 * @returns Mutation function and state
 */
export function useCancelBooking() {
  const utils = trpc.useUtils()

  return trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate()
      utils.booking.today.invalidate()
    },
  })
}

// =============================================================================
// Invoice Hooks
// =============================================================================

/**
 * Hook for fetching paginated invoice list
 * 
 * @param filters - Invoice filter criteria
 * @param options - Query options
 * @returns Query result with invoices and pagination
 */
export function useInvoices(
  filters: InvoiceFilters = {},
  options: ListQueryOptions = {}
) {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, enabled = true } = options

  return trpc.invoice.list.useQuery(
    { page, limit, filters },
    {
      enabled,
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching a single invoice by ID
 * 
 * @param id - Invoice ID
 * @returns Query result with invoice data
 */
export function useInvoice(id: string | null | undefined) {
  return trpc.invoice.get.useQuery(
    { id: id! },
    { enabled: !!id }
  )
}

/**
 * Hook for fetching overdue invoices
 * 
 * @param options - Query options
 * @returns Query result with overdue invoices
 */
export function useOverdueInvoices(options: ListQueryOptions = {}) {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options
  return trpc.invoice.overdue.useQuery({ page, limit })
}

/**
 * Hook for creating a new invoice
 * 
 * @returns Mutation function and state
 * 
 * @example
 * ```tsx
 * function CreateInvoiceForm({ booking }: { booking: Booking }) {
 *   const createInvoice = useCreateInvoice()
 *   
 *   const onSubmit = async (data: InvoiceFormData) => {
 *     const invoice = await createInvoice.mutateAsync({
 *       customerId: booking.customerId,
 *       bookingId: booking.id,
 *       items: data.items,
 *       // ...
 *     })
 *     window.open(`/invoices/${invoice.id}/pdf`)
 *   }
 *   
 *   return <InvoiceForm onSubmit={onSubmit} />
 * }
 * ```
 */
export function useCreateInvoice() {
  const utils = trpc.useUtils()

  return trpc.invoice.create.useMutation({
    onSuccess: () => {
      utils.invoice.list.invalidate()
    },
  })
}

/**
 * Hook for processing invoice payment
 * 
 * @returns Mutation function and state
 * 
 * @example
 * ```tsx
 * function PaymentForm({ invoice }: { invoice: Invoice }) {
 *   const processPayment = useProcessPayment()
 *   
 *   const handlePayment = async (paymentMethodId: string) => {
 *     await processPayment.mutateAsync({
 *       invoiceId: invoice.id,
 *       paymentData: {
 *         amount: invoice.balanceDue,
 *         method: 'stripe',
 *         stripePaymentMethodId: paymentMethodId,
 *       }
 *     })
 *   }
 *   
 *   return <StripePaymentForm onSubmit={handlePayment} />
 * }
 * ```
 */
export function useProcessPayment() {
  const utils = trpc.useUtils()

  return trpc.invoice.processPayment.useMutation({
    onSuccess: (_, variables) => {
      utils.invoice.get.invalidate({ id: variables.invoiceId })
      utils.invoice.list.invalidate()
    },
  })
}

/**
 * Hook for sending invoice via email
 * 
 * @returns Mutation function and state
 */
export function useSendInvoice() {
  const utils = trpc.useUtils()

  return trpc.invoice.send.useMutation({
    onSuccess: (_, variables) => {
      utils.invoice.get.invalidate({ id: variables.id })
    },
  })
}

// =============================================================================
// Analytics Hooks
// =============================================================================

/**
 * Hook for fetching dashboard analytics summary
 * 
 * @param period - Time period for analytics
 * @returns Query result with analytics data
 * 
 * @example
 * ```tsx
 * function DashboardOverview() {
 *   const [period, setPeriod] = useState<'week' | 'month'>('month')
 *   const { data: analytics } = useAnalytics(period)
 *   
 *   return (
 *     <div>
 *       <RevenueChart data={analytics?.revenueChart} />
 *       <KpiCards metrics={analytics} />
 *       <ServiceBreakdown data={analytics?.serviceBreakdown} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useAnalytics(period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return trpc.analytics.summary.useQuery(
    { period },
    {
      // Analytics data can be cached longer
      staleTime: 15 * 60 * 1000, // 15 minutes
    }
  )
}

/**
 * Hook for fetching revenue analytics only
 * 
 * @param period - Time period
 * @returns Query result with revenue chart data
 */
export function useRevenueAnalytics(period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return trpc.analytics.revenue.useQuery({ period })
}

/**
 * Hook for fetching service breakdown analytics
 * 
 * @param period - Time period
 * @returns Query result with service analytics
 */
export function useServiceAnalytics(period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return trpc.analytics.services.useQuery({ period })
}

/**
 * Hook for fetching customer analytics
 * 
 * @param period - Time period
 * @returns Query result with customer metrics
 */
export function useCustomerAnalytics(period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return trpc.analytics.customers.useQuery({ period })
}

// =============================================================================
// Optimistic Updates Utilities
// =============================================================================

/**
 * Helper for optimistic updates on lists
 * Updates the cache before the server responds for better UX
 * 
 * @example
 * ```tsx
 * const mutation = trpc.booking.create.useMutation({
 *   onMutate: async (newBooking) => {
 *     return optimisticListUpdate(
 *       utils.booking.list,
 *       newBooking,
 *       (item) => item.id === 'temp-id'
 *     )
 *   },
 *   onError: (err, variables, context) => {
 *     // Rollback on error
 *     utils.booking.list.setInfiniteQueryData(
 *       [{ page: 1, limit: 10 }],
 *       context?.previousData
 *     )
 *   }
 * })
 * ```
 */
export function useOptimisticListUpdate<T extends { id: string }>() {
  const utils = trpc.useUtils()

  return useCallback(
    async (
      queryKey: Parameters<typeof utils.booking.list.fetch>[0],
      newItem: T,
      queryUtils: typeof utils
    ) => {
      // Cancel outgoing refetches
      await queryUtils.booking.list.cancel(queryKey)

      // Snapshot previous value
      const previousData = queryUtils.booking.list.getData(queryKey)

      // Optimistically update
      queryUtils.booking.list.setData(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          items: [newItem as unknown as (typeof old.items)[number], ...old.items],
          total: old.total + 1,
        }
      })

      return { previousData }
    },
    []
  )
}
