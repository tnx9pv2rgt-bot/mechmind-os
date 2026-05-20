/**
 * Tests for useMFA hook (hooks/useMFA.ts)
 * Tests: enrollment, verification, login, backup codes, disable, status.
 */

// =============================================================================
// Mocks (must be before imports)
// =============================================================================
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMFA } from '@/hooks/useMFA';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_ENROLL_RESPONSE = {
  secret: 'JBSWY3DPEBLW64TMMQ======',
  qrCode: 'data:image/png;base64,iVBORw0KGgo=',
  manualEntryKey: 'MANUAL-KEY-123',
  backupCodes: ['CODE1', 'CODE2', 'CODE3'],
};

const MOCK_STATUS_RESPONSE = {
  enabled: true,
  backupCodesCount: 3,
};

// =============================================================================
// Tests
// =============================================================================
describe('useMFA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset svuota anche la coda mockResolvedValueOnce, clearAllMocks no
    mockFetch.mockReset();
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    (window.localStorage.setItem as jest.Mock).mockReturnValue(undefined);
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useMFA());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.enroll).toBe('function');
    expect(typeof result.current.verify).toBe('function');
    expect(typeof result.current.verifyLogin).toBe('function');
    expect(typeof result.current.disable).toBe('function');
  });

  it('enroll returns secret and QR code on success', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ENROLL_RESPONSE,
    });

    const { result } = renderHook(() => useMFA());

    let enrollResult = null;
    await act(async () => {
      enrollResult = await result.current.enroll();
    });

    expect(enrollResult).toMatchObject({
      secret: expect.any(String),
      qrCode: expect.any(String),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/mfa/enroll'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('enroll calls onSuccess callback on success', async () => {
    const onSuccess = jest.fn();
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ENROLL_RESPONSE,
    });

    const { result } = renderHook(() => useMFA({ onSuccess }));

    await act(async () => {
      await result.current.enroll();
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('enroll sets error on failure', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Enrollment failed' }),
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.enroll();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('verify sends code to server', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.verify('123456');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/mfa/verify'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('123456'),
      })
    );
  });

  it('verify calls onSuccess when successful', async () => {
    const onSuccess = jest.fn();
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useMFA({ onSuccess }));

    await act(async () => {
      await result.current.verify('123456');
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('verifyLogin stores tokens when successful', async () => {
    const mockTokens = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
    };
    (window.localStorage.setItem as jest.Mock).mockClear();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokens,
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.verifyLogin('temp-token', '123456');
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token-123');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-456');
  });

  it('verifyLogin throws error on failed verification', async () => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid code' }),
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.verifyLogin('temp-token', 'invalid-code');
      } catch {
        // Expected
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('disable sends code and password', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.disable('123456', 'password123');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/mfa/disable'),
      expect.objectContaining({
        method: 'DELETE',
        body: expect.stringContaining('password123'),
      })
    );
  });

  it('generateBackupCodes returns array of codes', async () => {
    const mockCodes = ['BACKUP1', 'BACKUP2', 'BACKUP3'];
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backupCodes: mockCodes }),
    });

    const { result } = renderHook(() => useMFA());

    let codes = null;
    await act(async () => {
      codes = await result.current.generateBackupCodes('123456');
    });

    expect(codes).toEqual(mockCodes);
  });

  it('getStatus returns MFA status info', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_STATUS_RESPONSE,
    });

    const { result } = renderHook(() => useMFA());

    let status = null;
    await act(async () => {
      status = await result.current.getStatus();
    });

    expect(status).toMatchObject({
      enabled: expect.any(Boolean),
      backupCodesCount: expect.any(Number),
    });
  });

  it('calls onError callback when operation fails', async () => {
    const onError = jest.fn();
    (window.localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Error' }),
    });

    const { result } = renderHook(() => useMFA({ onError }));

    await act(async () => {
      try {
        await result.current.enroll();
      } catch {
        // Expected
      }
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
