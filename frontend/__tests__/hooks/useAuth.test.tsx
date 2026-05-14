/**
 * Tests for useAuth hook (hooks/useAuth.tsx)
 * Tests: login, logout, refresh, auth state, provider.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import React from 'react';

// =============================================================================
// Mocks
// =============================================================================
const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_USER = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  tenantId: 'tenant-123',
  tenantName: 'Test Tenant',
};

// =============================================================================
// Tests
// =============================================================================
describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthProvider & useAuth', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, {}, children);

    it('initializes with isLoading true and user null', () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('loads user on mount when auth check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: MOCK_USER }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
    });

    it('sets user to null when auth check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('login triggers checkAuth which updates user state', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: MOCK_USER }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeNull();

      await act(async () => {
        result.current.login('jwt-token', 'refresh-token');
      });

      await waitFor(() => expect(result.current.user).toEqual(MOCK_USER));
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('logout clears user and redirects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: MOCK_USER }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.user).toEqual(MOCK_USER));

      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      await waitFor(() => expect(result.current.user).toBeNull());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('refresh re-checks auth on success', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: MOCK_USER }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { ...MOCK_USER, name: 'Updated Name' } }),
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.user).toEqual(MOCK_USER));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.user?.name).toBe('Updated Name');
    });

    it('refresh calls logout on failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: MOCK_USER }),
        })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true }); // logout fetch

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.user).toEqual(MOCK_USER));

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => expect(result.current.user).toBeNull());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('refresh logs out on network error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: MOCK_USER }),
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true }); // logout fetch

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.user).toEqual(MOCK_USER));

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => expect(result.current.user).toBeNull());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('stores user with tenant info when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: MOCK_USER }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.user).not.toBeNull());

      expect(result.current.user?.tenantId).toBe('tenant-123');
      expect(result.current.user?.tenantName).toBe('Test Tenant');
    });

    it('handles malformed auth response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing user field
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user).toBeFalsy();
    });
  });
});
