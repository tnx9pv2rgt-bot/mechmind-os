// ✅ Pagina lista corretta — Pattern MechMind OS
'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default function ExampleListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  // SWR fetch — MAI mock data
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/examples?${params}`,
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );

  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">
          Errore nel caricamento dei dati
        </p>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-[#1c1c1e] min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-[#ececec]">
          Elementi
        </h1>
        <Link
          href="/dashboard/examples/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Nuovo elemento
        </Link>
      </div>

      {/* Filtri */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-[#2f2f2f] dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-[#2f2f2f] dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
        >
          <option value="">Tutti gli stati</option>
          <option value="ACTIVE">Attivo</option>
          <option value="INACTIVE">Inattivo</option>
        </select>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-[#636366]">
            Nessun elemento trovato
          </p>
        </div>
      ) : (
        <>
          {/* Lista */}
          <div className="space-y-2">
            {items.map((item: { id: string; name: string }) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg dark:bg-[#2c2c2e] dark:border-[#424242]"
              >
                <p className="dark:text-[#ececec]">{item.name}</p>
              </div>
            ))}
          </div>

          {/* Paginazione */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500 dark:text-[#636366]">
              {total} elementi totali
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border rounded-lg disabled:opacity-50 dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
              >
                Precedente
              </button>
              <span className="px-3 py-2 dark:text-[#ececec]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border rounded-lg disabled:opacity-50 dark:border-[#424242] dark:text-[#ececec] min-h-[44px]"
              >
                Successivo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
