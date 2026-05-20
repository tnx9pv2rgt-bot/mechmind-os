'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Auth guard per le pagine dashboard.
 * - 'authenticated' → render children
 * - 'unauthenticated' (401/403 o user: null) → redirect /auth/login
 * - 'network-error' (backend down, 5xx, fetch abort) → presume authenticated,
 *   render children. Sarà la dashboard a mostrare il banner di errore.
 * - 'loading' → spinner
 */
export function AuthGuard({ children }: { children: React.ReactNode }): React.ReactElement | null {
  const { authStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [authStatus, router]);

  if (authStatus === 'loading') {
    return (
      <div className='min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-10 h-10 border-4 border-[var(--border-default)] border-t-blue-600 rounded-full animate-spin' />
          <p className='text-sm text-[var(--text-tertiary)]'>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }

  // 'authenticated' OR 'network-error' → render children
  return <>{children}</>;
}
