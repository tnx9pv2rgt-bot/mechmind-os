'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { fetcher, FetchError } from './fetcher';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps): ReactNode {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        onError: (error: FetchError) => {
          if (error.status === 401) {
            window.location.href = '/auth';
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
