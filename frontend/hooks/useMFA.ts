'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseMFAOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseMFAReturn {
  isLoading: boolean;
  error: string | null;
  enroll: () => Promise<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
    backupCodes: string[];
  }>;
  verify: (code: string) => Promise<void>;
  verifyLogin: (tempToken: string, code: string) => Promise<void>;
  disable: (code: string, password: string) => Promise<void>;
  generateBackupCodes: (code: string) => Promise<string[]>;
  getStatus: () => Promise<{
    enabled: boolean;
    verifiedAt?: Date;
    backupCodesCount: number;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useMFA(options: UseMFAOptions = {}): UseMFAReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }, []);

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return response.json();
  };

  const enroll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/mfa/enroll`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await handleResponse(response);
      options.onSuccess?.();
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll MFA';
      setError(errorMessage);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, options]);

  const verify = useCallback(
    async (code: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/auth/mfa/verify`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ token: code }),
        });

        await handleResponse(response);
        options.onSuccess?.();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify MFA';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders, options]
  );

  const verifyLogin = useCallback(
    async (tempToken: string, code: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/auth/mfa/verify-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tempToken, token: code }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const mfaError = new Error(data.message || 'Invalid code') as Error & {
            remainingAttempts?: number;
          };
          mfaError.remainingAttempts = data.remainingAttempts;
          throw mfaError;
        }

        const data = await response.json();

        // Store tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        options.onSuccess?.();
        return data;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify MFA';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const disable = useCallback(
    async (code: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/auth/mfa/disable`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          body: JSON.stringify({ token: code, password }),
        });

        await handleResponse(response);
        options.onSuccess?.();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to disable MFA';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders, options]
  );

  const generateBackupCodes = useCallback(
    async (code: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/auth/mfa/backup-codes`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ token: code }),
        });

        const data = await handleResponse(response);
        options.onSuccess?.();
        return data.backupCodes;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate backup codes';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders, options]
  );

  const getStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/mfa/status`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await handleResponse(response);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get MFA status';
      setError(errorMessage);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, options]);

  return {
    isLoading,
    error,
    enroll,
    verify,
    verifyLogin,
    disable,
    generateBackupCodes,
    getStatus,
  };
}

export default useMFA;
