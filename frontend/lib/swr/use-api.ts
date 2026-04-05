'use client';

import useSWR, { type SWRConfiguration, type SWRResponse, type KeyedMutator, useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { useCallback } from 'react';
import { toast } from 'sonner';

// ─── Fetcher ────────────────────────────────────────────────────────
async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const error = new Error('Errore durante il caricamento dei dati') as Error & { status: number };
    error.status = res.status;
    if (res.status === 401) {
      window.location.href = '/auth';
    }
    throw error;
  }
  return res.json();
}

// ─── Mutation fetchers ──────────────────────────────────────────────
async function postFetcher<T>(url: string, { arg }: { arg: Record<string, unknown> }): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patchFetcher<T>(url: string, { arg }: { arg: Record<string, unknown> }): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Paginated response type ────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Query params builder ───────────────────────────────────────────
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ─── Generic List Hook ──────────────────────────────────────────────
export interface UseListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  status?: string;
  [key: string]: string | number | boolean | undefined;
}

export function useList<T>(
  basePath: string,
  options: UseListOptions = {},
  config?: SWRConfiguration,
): SWRResponse<PaginatedResponse<T>> & { isEmpty: boolean } {
  const qs = buildQueryString(options as Record<string, string | number | boolean | undefined>);
  const result = useSWR<PaginatedResponse<T>>(`${basePath}${qs}`, apiFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    ...config,
  });

  return {
    ...result,
    isEmpty: !result.isLoading && (result.data?.data?.length ?? 0) === 0,
  };
}

// ─── Generic Detail Hook ────────────────────────────────────────────
export function useDetail<T>(
  basePath: string,
  id: string | undefined,
  config?: SWRConfiguration,
): SWRResponse<T> {
  return useSWR<T>(id ? `${basePath}/${id}` : null, apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    ...config,
  });
}

// ─── Generic Create Hook with Optimistic Update ─────────────────────
export function useCreate<T>(basePath: string, options?: {
  successMessage?: string;
  onSuccess?: (data: T) => void;
}): {
  trigger: (data: Record<string, unknown>) => Promise<T>;
  isMutating: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<T, Error, string, Record<string, unknown>>(
    basePath,
    postFetcher,
    {
      onSuccess: (data) => {
        toast.success(options?.successMessage ?? 'Creato con successo');
        // Invalidate list cache
        mutate((key: string) => typeof key === 'string' && key.startsWith(basePath), undefined, { revalidate: true });
        options?.onSuccess?.(data);
      },
      onError: (err) => {
        toast.error(`Errore: ${err.message}`);
      },
    },
  );
  return { trigger, isMutating };
}

// ─── Generic Update Hook with Optimistic Update ─────────────────────
export function useUpdate<T>(basePath: string, id: string, options?: {
  successMessage?: string;
  onSuccess?: (data: T) => void;
}): {
  trigger: (data: Record<string, unknown>) => Promise<T>;
  isMutating: boolean;
} {
  const { mutate } = useSWRConfig();
  const url = `${basePath}/${id}`;
  const { trigger, isMutating } = useSWRMutation<T, Error, string, Record<string, unknown>>(
    url,
    patchFetcher,
    {
      onSuccess: (data) => {
        toast.success(options?.successMessage ?? 'Aggiornato con successo');
        mutate(url, data, false);
        mutate((key: string) => typeof key === 'string' && key.startsWith(basePath), undefined, { revalidate: true });
        options?.onSuccess?.(data);
      },
      onError: (err) => {
        toast.error(`Errore: ${err.message}`);
      },
    },
  );
  return { trigger, isMutating };
}

// ─── Generic Delete Hook with Optimistic Update ─────────────────────
export function useDelete<T = unknown>(basePath: string, options?: {
  successMessage?: string;
  onSuccess?: () => void;
}): {
  deleteItem: (id: string) => Promise<void>;
  isMutating: boolean;
} {
  const { mutate } = useSWRConfig();
  let isMutating = false;

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    isMutating = true;
    try {
      await deleteFetcher(`${basePath}/${id}`);
      toast.success(options?.successMessage ?? 'Eliminato con successo');
      // Optimistic: remove from all list caches
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith(basePath),
        undefined,
        { revalidate: true },
      );
      options?.onSuccess?.();
    } catch (err) {
      toast.error(`Errore: ${(err as Error).message}`);
    } finally {
      isMutating = false;
    }
  }, [basePath, mutate, options]);

  return { deleteItem, isMutating };
}

// ─── Optimistic list mutation helper ────────────────────────────────
export function useOptimisticDelete<T extends { id: string }>(
  listKey: string,
  basePath: string,
): {
  deleteWithOptimistic: (id: string, mutate: KeyedMutator<PaginatedResponse<T>>) => Promise<void>;
} {
  const deleteWithOptimistic = useCallback(async (
    id: string,
    listMutate: KeyedMutator<PaginatedResponse<T>>,
  ): Promise<void> => {
    // Optimistic: remove from UI immediately
    await listMutate(
      async (current) => {
        await deleteFetcher(`${basePath}/${id}`);
        if (!current) return current;
        return {
          ...current,
          data: current.data.filter((item) => item.id !== id),
          total: current.total - 1,
        };
      },
      {
        optimisticData: (current) => {
          if (!current) return current!;
          return {
            ...current,
            data: current.data.filter((item) => item.id !== id),
            total: current.total - 1,
          };
        },
        rollbackOnError: true,
        revalidate: false,
      },
    );
    toast.success('Eliminato con successo');
  }, [basePath]);

  return { deleteWithOptimistic };
}
