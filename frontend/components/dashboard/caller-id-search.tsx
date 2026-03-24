'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Phone, User, Loader2 } from 'lucide-react';

interface CustomerResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  vehicles?: Array<{
    licensePlate: string;
    make: string;
    model: string;
  }>;
}

function getAuthToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export function CallerIdSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchCustomers = useCallback(async (phone: string) => {
    if (phone.length < 4) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/customers/search?phone=${encodeURIComponent(phone)}`, {
        headers,
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = await res.json();
      const data = json.data || json || [];
      setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        searchCustomers(value);
      }, 300);
    },
    [searchCustomers]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className='relative'>
      <div className='flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1'>
        <Phone className='h-3.5 w-3.5 text-gray-400' />
        <input
          type='text'
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder='Cerca per telefono...'
          aria-label='Ricerca cliente per telefono'
          className='bg-transparent text-white text-xs placeholder-gray-400 outline-none w-36 focus:w-48 transition-all'
        />
        {isLoading && <Loader2 className='h-3 w-3 text-gray-400 animate-spin' />}
      </div>

      {isOpen && results.length > 0 && (
        <div className='absolute top-full mt-2 right-0 w-72 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-2xl border border-gray-200 dark:border-[#424242] max-h-80 overflow-y-auto z-[9999]'>
          {results.map(customer => (
            <Link
              key={customer.id}
              href={`/dashboard/customers/${customer.id}`}
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              className='flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#353535] transition-colors border-b border-gray-100 dark:border-[#424242] last:border-0'
            >
              <div className='w-8 h-8 rounded-full bg-apple-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5'>
                <User className='h-4 w-4 text-apple-blue' />
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-gray-900 dark:text-[#ececec] truncate'>
                  {customer.firstName} {customer.lastName}
                </p>
                {customer.phone && (
                  <p className='text-xs text-gray-500 dark:text-[#636366]'>{customer.phone}</p>
                )}
                {customer.vehicles && customer.vehicles.length > 0 && (
                  <p className='text-xs text-gray-400 dark:text-[#535353] mt-0.5'>
                    {customer.vehicles[0].licensePlate} - {customer.vehicles[0].make}{' '}
                    {customer.vehicles[0].model}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {isOpen && query.length >= 4 && !isLoading && results.length === 0 && (
        <div className='absolute top-full mt-2 right-0 w-72 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-2xl border border-gray-200 dark:border-[#424242] p-4 z-[9999]'>
          <p className='text-sm text-gray-500 dark:text-[#636366] text-center'>
            Nessun cliente trovato
          </p>
        </div>
      )}
    </div>
  );
}
