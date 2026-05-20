/**
 * USE AUTH HOOK
 *
 * React hook for managing authentication state.
 * Distingue tra:
 *  - user autenticato (response 200 con user popolato)
 *  - user non autenticato (response 200 con user: null OR 401)
 *  - errore di rete / backend down (presumed authenticated, banner)
 */

'use client';

import { useState, useEffect, useContext, createContext, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
  tenantName?: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'network-error';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** true se /api/auth/me ha fallito per network/5xx (non un 401). */
  hasNetworkError: boolean;
  authStatus: AuthStatus;
  login: (jwtToken: string, refreshToken: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status >= 500 || res.status === 502 || res.status === 504) {
        // Backend down — non sappiamo se l'utente è auth, presumiamo di sì
        setAuthStatus('network-error');
        return;
      }
      if (!res.ok) {
        // 401/403 → non autenticato
        setUser(null);
        setAuthStatus('unauthenticated');
        return;
      }
      const data = (await res.json()) as { user: User | null };
      if (data.user) {
        setUser(data.user);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    } catch {
      // Network error (fetch abort, DNS fail, offline)
      setAuthStatus('network-error');
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback((): void => {
    void checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // anche se la chiamata fallisce, ripuliamo lo stato locale
    }
    setUser(null);
    setAuthStatus('unauthenticated');
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await checkAuth();
      } else {
        await logout();
      }
    } catch {
      await logout();
    }
  }, [checkAuth, logout]);

  const value: AuthContextType = {
    user,
    isLoading: authStatus === 'loading',
    isAuthenticated: authStatus === 'authenticated',
    hasNetworkError: authStatus === 'network-error',
    authStatus,
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
