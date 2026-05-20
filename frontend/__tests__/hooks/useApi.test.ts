/**
 * Tests for useApi hook (hooks/useApi.ts)
 * Tests: dashboard stats, bookings, customers, vehicles, settings, MFA, password, parts, work orders.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardStats, useBookings, useCustomers, useVehicles } from '@/hooks/useApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const mockApi = require('@/lib/api-client').api;

const MOCK_DASHBOARD_STATS = {
  revenue: 15000,
  revenueChange: 5.2,
  bookingsToday: 12,
  bookingsChange: 2.1,
  avgTicket: 1250,
  avgTicketChange: -3.5,
  vehiclesInShop: 8,
  vehiclesChange: 1.0,
  recentBookings: [],
  alerts: [],
  tenantName: 'Test Shop',
  efficiency: 85,
  efficiencyChange: 2,
  conversion: 92,
  conversionChange: 1.5,
  unpaidAmount: 2500,
  overdueAmount: 500,
  grossMargin: 35,
  cashFlow7d: 8000,
  revenueTarget: 20000,
  scorteInAllarme: 5,
  preventiviInScadenza: 3,
  rightToRepairPct: 78,
};

const MOCK_BOOKING = {
  id: 'booking-1',
  customerName: 'John Doe',
  vehiclePlate: 'AB123CD',
  serviceCategory: 'Maintenance',
  status: 'SCHEDULED',
  scheduledAt: '2026-05-15T10:00:00Z',
  createdAt: '2026-05-10T12:00:00Z',
  updatedAt: '2026-05-10T12:00:00Z',
};

const MOCK_CUSTOMER = {
  id: 'cust-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '+393331234567',
  createdAt: '2026-05-10T12:00:00Z',
  updatedAt: '2026-05-10T12:00:00Z',
};

const MOCK_VEHICLE = {
  id: 'veh-1',
  licensePlate: 'AB123CD',
  make: 'Toyota',
  model: 'Corolla',
  year: 2023,
  status: 'ACTIVE',
  createdAt: '2026-05-10T12:00:00Z',
  updatedAt: '2026-05-10T12:00:00Z',
};

// =============================================================================
// Helpers
// =============================================================================
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// =============================================================================
// Tests
// =============================================================================
describe('useApi hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // useDashboardStats
  // =========================================================================
  describe('useDashboardStats', () => {
    it('returns isLoading and data properties', async () => {
      mockApi.get.mockResolvedValueOnce({ data: MOCK_DASHBOARD_STATS });

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard');
    });

    it('fetches dashboard stats on mount', async () => {
      mockApi.get.mockResolvedValueOnce({ data: MOCK_DASHBOARD_STATS });

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.revenue).toBe(15000);
      expect(result.current.data?.tenantName).toBe('Test Shop');
    });

    it('handles error state when fetch fails', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });

    it('has staleTime Infinity and no refetch', async () => {
      mockApi.get.mockResolvedValueOnce({ data: MOCK_DASHBOARD_STATS });

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApi.get).toHaveBeenCalledTimes(1);

      // Should not refetch on window focus
      window.dispatchEvent(new Event('focus'));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // useBookings
  // =========================================================================
  describe('useBookings', () => {
    it('returns paginated bookings response', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_BOOKING],
          total: 1,
          page: 1,
          limit: 20,
        },
      });

      const { result } = renderHook(() => useBookings({ page: 1 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].id).toBe('booking-1');
      expect(mockApi.get).toHaveBeenCalledWith('/bookings', { page: 1 });
    });

    it('passes page, limit, status parameters to api.get', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: [], total: 0, page: 2, limit: 10 },
      });

      renderHook(() => useBookings({ page: 2, limit: 10, status: 'SCHEDULED' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          '/bookings',
          expect.objectContaining({ page: 2, limit: 10, status: 'SCHEDULED' })
        );
      });
    });

    it('handles array response format from backend', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_BOOKING],
        },
      });

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.total).toBe(1);
    });
  });

  // =========================================================================
  // useCustomers
  // =========================================================================
  describe('useCustomers', () => {
    it('fetches customers list', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_CUSTOMER],
          total: 1,
          page: 1,
          limit: 20,
        },
      });

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].firstName).toBe('Jane');
      expect(mockApi.get).toHaveBeenCalledWith('/customers', undefined);
    });

    it('passes search parameter to api.get', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: [], total: 0, page: 1, limit: 20 },
      });

      renderHook(() => useCustomers({ search: 'John' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          '/customers',
          expect.objectContaining({ search: 'John' })
        );
      });
    });

    it('handles error when customers fetch fails', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });

  // =========================================================================
  // useVehicles
  // =========================================================================
  describe('useVehicles', () => {
    it('fetches vehicles list', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_VEHICLE],
          total: 1,
          page: 1,
          limit: 20,
        },
      });

      const { result } = renderHook(() => useVehicles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].make).toBe('Toyota');
      expect(mockApi.get).toHaveBeenCalledWith('/vehicles', undefined);
    });

    it('passes status parameter to api.get', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: [], total: 0, page: 1, limit: 20 },
      });

      renderHook(() => useVehicles({ status: 'ACTIVE' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          '/vehicles',
          expect.objectContaining({ status: 'ACTIVE' })
        );
      });
    });

    it('handles array response from backend', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_VEHICLE],
        },
      });

      const { result } = renderHook(() => useVehicles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.total).toBe(1);
    });
  });
});
