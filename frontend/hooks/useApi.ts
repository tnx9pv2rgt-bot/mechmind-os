'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';

// =============================================================================
// Types
// =============================================================================

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface DashboardStats {
  revenue: number;
  revenueChange: number;
  bookingsToday: number;
  bookingsChange: number;
  avgTicket: number;
  avgTicketChange: number;
  vehiclesInShop: number;
  vehiclesChange: number;
  recentBookings: Booking[];
  alerts: Alert[];
  tenantName: string;
  // Efficiency & conversion metrics
  efficiency: number;
  efficiencyChange: number;
  conversion: number;
  conversionChange: number;
  // Financial metrics
  unpaidAmount: number;
  overdueAmount: number;
  grossMargin: number;
  cashFlow7d: number;
  revenueTarget: number;
  // 2026 Compliance KPIs
  scorteInAllarme: number;
  preventiviInScadenza: number;
  rightToRepairPct: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
}

interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  serviceCategory: string;
  serviceName?: string;
  status: string;
  scheduledAt: string;
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyTier?: string;
  totalSpent?: number;
  visitCount?: number;
  vehicles?: Vehicle[];
  createdAt: string;
  updatedAt: string;
}

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  notes?: string;
  status: string;
  mileage?: number;
  customerId?: string;
  customer?: { id: string; firstName?: string; lastName?: string };
  lastServiceDate?: string;
  nextServiceDueKm?: number;
  createdAt: string;
  updatedAt: string;
}

interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

interface SlotAvailability {
  date: string;
  availableSlots: BookingSlot[];
  totalSlots: number;
  availableCount: number;
}

interface CreateBookingInput {
  customerId: string;
  vehicleId?: string;
  slotId: string;
  scheduledDate: string;
  durationMinutes?: number;
  serviceIds?: string[];
  notes?: string;
  source?: string;
  technicianId?: string;
  liftPosition?: string;
}

interface CreateCustomerInput {
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  gdprConsent?: boolean;
  gdprConsentAt?: string;
  gdprPrivacyVersion?: string;
  gdprConsentMethod?: string;
  marketingConsent?: boolean;
  marketingConsentAt?: string;
  notes?: string;
}

interface CreateVehicleInput {
  customerId: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  notes?: string;
  status?: string;
  mileage?: number;
}

interface BookingStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

interface TenantSettings {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  logo?: string;
  hourlyRate?: number;
  openingHours?: Record<string, string>;
  notificationPreferences?: Record<string, boolean>;
  team?: TeamMember[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

// =============================================================================
// Dashboard
// =============================================================================

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await api.get<DashboardStats | { data: DashboardStats }>('/dashboard');
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as DashboardStats);
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 3,
  });
}

// =============================================================================
// Bookings
// =============================================================================

export function useBookings(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  date?: string;
}) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Booking> | { data: Booking[] }>(
        '/bookings',
        params as Record<string, string | number>
      );
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) {
        return {
          data: raw.data,
          total: raw.data.length,
          page: params?.page || 1,
          limit: params?.limit || 20,
        };
      }
      return raw as PaginatedResponse<Booking>;
    },
    staleTime: 30_000,
  });
}

export function useBooking(id: string | undefined) {
  return useQuery<Booking>({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const res = await api.get<Booking | { data: Booking }>(`/bookings/${id}`);
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as Booking);
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBookingInput) => {
      const res = await api.post<Booking>('/bookings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await api.patch<Booking>(`/bookings/${id}`, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.delete<{ success: boolean }>(
        `/bookings/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBookingStats(params?: { fromDate?: string; toDate?: string }) {
  return useQuery<BookingStats>({
    queryKey: ['bookings', 'stats', params],
    queryFn: async () => {
      const res = await api.get<BookingStats | { data: BookingStats }>(
        '/bookings/calendar/stats',
        params as Record<string, string>
      );
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as BookingStats);
    },
    staleTime: 30_000,
  });
}

export function useAvailableSlots(date: string | undefined, duration?: number) {
  return useQuery<SlotAvailability>({
    queryKey: ['slots', 'available', date, duration],
    queryFn: async () => {
      const params: Record<string, string | number> = { date: date! };
      if (duration) params.duration = duration;
      const res = await api.get<SlotAvailability | { data: SlotAvailability }>(
        '/bookings/slots/available',
        params
      );
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as SlotAvailability);
    },
    enabled: !!date,
    staleTime: 15_000,
  });
}

export function useSearchCustomers(query: string) {
  return useQuery<Customer[]>({
    queryKey: ['customers', 'search', query],
    queryFn: async () => {
      const res = await api.get<{ data: Customer[] } | Customer[]>('/customers/search', {
        name: query,
      });
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) return raw.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: query.length >= 2,
    staleTime: 10_000,
  });
}

// =============================================================================
// Customers
// =============================================================================

export function useCustomers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Customer> | { data: Customer[] }>(
        '/customers',
        params as Record<string, string | number>
      );
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) {
        return {
          data: raw.data,
          total: raw.data.length,
          page: params?.page || 1,
          limit: params?.limit || 20,
        };
      }
      return raw as PaginatedResponse<Customer>;
    },
    staleTime: 30_000,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery<Customer>({
    queryKey: ['customers', id],
    queryFn: async () => {
      const res = await api.get<Customer | { data: Customer }>(`/customers/${id}`);
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as Customer);
    },
    enabled: !!id,
  });
}

export function useGdprExport() {
  return useMutation({
    mutationFn: async (customerId: string) => {
      const res = await api.post<{ requestId: string }>(`/gdpr/customers/${customerId}/export`);
      return res.data;
    },
  });
}

export function useGdprDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customerId: string) => {
      const res = await api.post<{ requestId: string }>(`/gdpr/customers/${customerId}/delete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const res = await api.post<{ data: Customer }>('/customers', data);
      const raw = res.data;
      return 'data' in raw ? raw.data : (raw as Customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateCustomerInput>) => {
      const res = await api.patch<{ data: Customer }>(`/customers/${id}`, data);
      const raw = res.data;
      return 'data' in raw ? raw.data : (raw as Customer);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ success: boolean }>(`/customers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCustomerVehicles(customerId: string | undefined) {
  return useQuery<Vehicle[]>({
    queryKey: ['customers', customerId, 'vehicles'],
    queryFn: async () => {
      const res = await api.get<{ data: Vehicle[] } | Vehicle[]>(
        `/customers/${customerId}/vehicles`
      );
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) return raw.data;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!customerId,
  });
}

// =============================================================================
// Vehicles
// =============================================================================

export function useVehicles(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery<PaginatedResponse<Vehicle>>({
    queryKey: ['vehicles', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Vehicle> | { data: Vehicle[] }>(
        '/vehicles',
        params as Record<string, string | number>
      );
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) {
        return {
          data: raw.data,
          total: raw.data.length,
          page: params?.page || 1,
          limit: params?.limit || 20,
        };
      }
      return raw as PaginatedResponse<Vehicle>;
    },
    staleTime: 30_000,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVehicleInput) => {
      const res = await api.post<{ data: Vehicle }>('/vehicles', data);
      const raw = res.data;
      return 'data' in raw ? raw.data : (raw as Vehicle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateVehicleInput>) => {
      const res = await api.patch<{ data: Vehicle }>(`/vehicles/${id}`, data);
      const raw = res.data;
      return 'data' in raw ? raw.data : (raw as Vehicle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ success: boolean }>(`/vehicles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// =============================================================================
// Settings
// =============================================================================

export function useTenantSettings() {
  return useQuery<TenantSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<TenantSettings | { data: TenantSettings }>('/settings');
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as TenantSettings);
    },
    retry: false,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TenantSettings>) => {
      const res = await api.put<TenantSettings>('/settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// =============================================================================
// MFA
// =============================================================================

export function useMfaStatus() {
  return useQuery<{ enabled: boolean; methods?: string[] }>({
    queryKey: ['mfa', 'status'],
    queryFn: async () => {
      const res = await api.get<
        { enabled: boolean; methods?: string[] } | { data: { enabled: boolean } }
      >('/auth/mfa/status');
      const raw = res.data;
      return 'data' in raw && raw.data ? raw.data : (raw as { enabled: boolean });
    },
    retry: false,
  });
}

export function useMfaEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ secret: string; qrCodeUrl: string; backupCodes: string[] }>(
        '/auth/mfa/enroll'
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa'] });
    },
  });
}

export function useMfaVerify() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { code: string }) => {
      const res = await api.post<{ verified: boolean }>('/auth/mfa/verify', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa'] });
    },
  });
}

// =============================================================================
// Password
// =============================================================================

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await api.post<{ success: boolean }>('/auth/password/change', data);
      return res.data;
    },
  });
}

// =============================================================================
// Parts & Suppliers
// =============================================================================

interface Supplier {
  id: string;
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  paymentTerms?: string;
  createdAt: string;
}

interface Part {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  manufacturer?: string;
  partNumber?: string;
  costPrice?: number;
  retailPrice?: number;
  minStockLevel?: number;
  currentStock?: number;
  stockQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  isLowStock?: boolean;
  supplierId?: string;
  supplierName?: string;
  supplier?: Supplier;
  // EU Right to Repair 2024/1799
  partType?: 'GENUINE' | 'AFTERMARKET' | 'REGENERATED' | 'USED';
  warrantyMonths?: number;
  originCode?: string;
  barcode?: string;
  createdAt: string;
}

interface CreateSupplierInput {
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface CreatePartInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  costPrice?: number;
  retailPrice?: number;
  supplierId?: string;
}

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get<Supplier[] | { data: Supplier[] }>('/parts/suppliers');
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) {
        return raw.data;
      }
      return Array.isArray(raw) ? raw : [];
    },
    staleTime: 60_000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSupplierInput) => {
      const res = await api.post<Supplier>('/parts/suppliers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useParts(params?: {
  search?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<PaginatedResponse<Part>>({
    queryKey: ['parts', params],
    queryFn: async () => {
      const queryParams: Record<string, string | number> = {};
      if (params?.search) queryParams.search = params.search;
      if (params?.supplierId) queryParams.supplierId = params.supplierId;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      const res = await api.get<PaginatedResponse<Part> | { data: Part[] }>('/parts', queryParams);
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) {
        return {
          data: raw.data,
          total: raw.data.length,
          page: params?.page || 1,
          limit: params?.limit || 20,
        };
      }
      if (Array.isArray(raw)) {
        return { data: raw, total: raw.length, page: 1, limit: 20 };
      }
      return raw as PaginatedResponse<Part>;
    },
    staleTime: 30_000,
  });
}

export function useCreatePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePartInput) => {
      const res = await api.post<Part>('/parts', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
  });
}

// =============================================================================
// Work Orders
// =============================================================================

interface WorkOrder {
  id: string;
  orderNumber?: string;
  status: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  description?: string;
  totalAmount?: number;
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
}

export function useWorkOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
}) {
  return useQuery<PaginatedResponse<WorkOrder>>({
    queryKey: ['work-orders', params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<WorkOrder> | { data: WorkOrder[] }>(
        '/work-orders',
        params as Record<string, string | number>
      );
      const raw = res.data;
      if ('data' in raw && Array.isArray(raw.data)) {
        return {
          data: raw.data,
          total: raw.data.length,
          page: params?.page || 1,
          limit: params?.limit || 20,
        };
      }
      return raw as PaginatedResponse<WorkOrder>;
    },
    staleTime: 30_000,
  });
}

// =============================================================================
// Re-export types for pages
// =============================================================================

export type {
  DashboardStats,
  Booking,
  BookingSlot,
  SlotAvailability,
  CreateBookingInput,
  Customer,
  CreateCustomerInput,
  Vehicle,
  CreateVehicleInput,
  TenantSettings,
  TeamMember,
  Alert,
  PaginatedResponse,
  ApiError,
  Supplier,
  Part,
  WorkOrder,
};
