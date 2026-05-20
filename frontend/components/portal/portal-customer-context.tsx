'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { PortalAuthService } from '@/lib/auth/portal-auth-client';
import { Customer } from '@/lib/types/portal';

interface PortalCustomerContextValue {
  customer: Customer | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const PortalCustomerContext = createContext<PortalCustomerContextValue>({
  customer: null,
  isLoading: true,
  refetch: async () => {},
});

export function usePortalCustomer(): PortalCustomerContextValue {
  return useContext(PortalCustomerContext);
}

interface PortalCustomerProviderProps {
  children: ReactNode;
}

export function PortalCustomerProvider({ children }: PortalCustomerProviderProps): ReactNode {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomer = useCallback(async () => {
    const auth = PortalAuthService.getInstance();
    if (!auth.isAuthenticated()) {
      auth.init();
    }

    const token = auth.getToken();
    if (!token) {
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/portal/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCustomer(json.data as Customer);
        } else {
          setCustomer(null);
        }
      } else {
        // Fallback: build a partial Customer from the locally stored PortalUser
        const user = auth.getUser();
        if (user) {
          setCustomer({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: false,
            phoneVerified: false,
            marketingConsent: false,
            gdprConsent: false,
          });
        } else {
          setCustomer(null);
        }
      }
    } catch {
      // Network error - fallback to local data
      const user = auth.getUser();
      if (user) {
        setCustomer({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: false,
          phoneVerified: false,
          marketingConsent: false,
          gdprConsent: false,
        });
      } else {
        setCustomer(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  return (
    <PortalCustomerContext.Provider value={{ customer, isLoading, refetch: fetchCustomer }}>
      {children}
    </PortalCustomerContext.Provider>
  );
}
