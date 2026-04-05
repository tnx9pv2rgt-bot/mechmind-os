'use client';

import { useQueryState, useQueryStates, parseAsInteger, parseAsString } from 'nuqs';

/**
 * Standard URL-persisted filter state for list pages.
 *
 * Usage:
 *   const { filters, setFilters, resetFilters } = useUrlFilters();
 *
 * URL becomes: /dashboard/customers?q=mario&status=active&page=2&sort=name&order=asc
 */
export interface UrlFilters {
  q: string;
  status: string;
  page: number;
  sort: string;
  order: string;
}

export function useUrlFilters(defaults?: Partial<UrlFilters>): {
  filters: UrlFilters;
  setFilters: (updates: Partial<UrlFilters>) => void;
  setFilter: <K extends keyof UrlFilters>(key: K, value: UrlFilters[K]) => void;
  resetFilters: () => void;
} {
  const [filters, setFiltersRaw] = useQueryStates({
    q: parseAsString.withDefault(defaults?.q ?? ''),
    status: parseAsString.withDefault(defaults?.status ?? ''),
    page: parseAsInteger.withDefault(defaults?.page ?? 1),
    sort: parseAsString.withDefault(defaults?.sort ?? ''),
    order: parseAsString.withDefault(defaults?.order ?? 'desc'),
  });

  const setFilters = (updates: Partial<UrlFilters>): void => {
    const mapped: Record<string, string | number | null> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === undefined) {
        mapped[key] = null; // removes from URL
      } else {
        mapped[key] = value;
      }
    });
    // Reset page to 1 when changing filters (not page itself)
    if (!('page' in updates) && Object.keys(updates).some(k => k !== 'page')) {
      mapped.page = 1;
    }
    setFiltersRaw(mapped as Parameters<typeof setFiltersRaw>[0]);
  };

  const setFilter = <K extends keyof UrlFilters>(key: K, value: UrlFilters[K]): void => {
    setFilters({ [key]: value } as Partial<UrlFilters>);
  };

  const resetFilters = (): void => {
    setFiltersRaw({
      q: null,
      status: null,
      page: null,
      sort: null,
      order: null,
    });
  };

  return { filters, setFilters, setFilter, resetFilters };
}

/**
 * Simple single-value URL state hook.
 *
 * Usage:
 *   const [tab, setTab] = useUrlParam('tab', 'overview');
 */
export function useUrlParam(key: string, defaultValue: string = ''): [string, (value: string | null) => void] {
  const [value, setValue] = useQueryState(key, parseAsString.withDefault(defaultValue));
  return [value, setValue];
}

/**
 * URL-persisted page number.
 */
export function useUrlPage(defaultPage: number = 1): [number, (page: number) => void] {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(defaultPage));
  return [page, setPage];
}
