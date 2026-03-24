'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Upload,
  AlertCircle,
  Download,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { useCustomers, useDeleteCustomer, useGdprExport } from '@/hooks/useApi';
import { formatPhone, timeAgo } from '@/lib/utils/format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type CustomerType = 'all' | 'private' | 'business';

const PAGE_SIZE = 20;

const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  accent: '#ffffff',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  purple: '#a78bfa',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function CustomersPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [customerType, setCustomerType] = useState<CustomerType>('all');
  const [page, setPage] = useState(initialPage);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const deleteCustomer = useDeleteCustomer();
  const gdprExport = useGdprExport();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : '/dashboard/customers';
    window.history.replaceState(null, '', newUrl);
  }, [debouncedSearch, page]);

  const {
    data: customersData,
    isLoading,
    error,
    refetch,
  } = useCustomers({
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const customers = customersData?.data ?? [];
  const total = customersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filter by type client-side (until backend supports it)
  const filteredCustomers = customerType === 'all'
    ? customers
    : customers.filter((c) => {
        const raw = c as unknown as Record<string, unknown>;
        const notes = typeof raw.notes === 'string' ? raw.notes : undefined;
        if (customerType === 'business') {
          return notes?.includes('"customerType":"business"') || raw.companyName;
        }
        return !notes?.includes('"customerType":"business"');
      });

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer.mutateAsync(deleteTarget.id);
      toast.success(`Cliente "${deleteTarget.name}" eliminato`);
      setDeleteTarget(null);
    } catch {
      toast.error('Errore durante l\'eliminazione del cliente');
    }
  }, [deleteTarget, deleteCustomer]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='Eliminare il cliente?'
        description={`Stai per eliminare definitivamente il cliente "${deleteTarget?.name || ''}" e tutti i suoi dati associati. Questa azione non può essere annullata (GDPR Art. 17).`}
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDelete}
        loading={deleteCustomer.isPending}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              aria-label="Torna alla dashboard"
            >
              <ArrowLeft className="h-5 w-5" style={{ color: colors.textSecondary }} />
            </Link>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Clienti
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                {isLoading ? 'Caricamento...' : `${total} clienti totali`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/customers/import">
              <button
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors border"
                style={{
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importa CSV</span>
                <span className="sm:hidden">Importa</span>
              </button>
            </Link>
            <Link href="/dashboard/customers/new/step1">
              <button
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.bg,
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Cliente</span>
                <span className="sm:hidden">Nuovo</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 space-y-6">
        {/* Search + Filter */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div
            className="rounded-2xl border p-4 space-y-4"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.textMuted }} />
              <input
                type="text"
                placeholder="Cerca clienti per nome, email o telefono..."
                aria-label="Cerca clienti"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 h-12 rounded-xl border text-sm focus:outline-none focus:border-white/30 transition-colors"
                style={{
                  backgroundColor: colors.glowStrong,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                }}
              />
            </div>
            {/* Filter Chips */}
            <div className="flex items-center justify-center flex-wrap gap-2">
              {[
                { value: 'all' as const, label: 'Tutti' },
                { value: 'private' as const, label: 'Privati' },
                { value: 'business' as const, label: 'Aziende' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => { setCustomerType(filter.value); setPage(1); }}
                  className="h-10 px-4 rounded-full text-sm font-medium transition-colors border"
                  style={
                    customerType === filter.value
                      ? { backgroundColor: colors.accent, color: colors.bg, borderColor: colors.accent }
                      : { backgroundColor: 'transparent', color: colors.textSecondary, borderColor: colors.border }
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
              Impossibile caricare i clienti
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textTertiary }}>
              Si è verificato un errore. Riprova.
            </p>
            <button
              onClick={() => refetch()}
              className="h-10 px-4 rounded-full text-sm font-medium border transition-colors hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              Riprova
            </button>
          </div>
        ) : filteredCustomers.length === 0 && !debouncedSearch ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
              Nessun cliente ancora
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textTertiary }}>
              Aggiungi il primo cliente per iniziare a gestire la tua officina.
            </p>
            <Link href="/dashboard/customers/new/step1">
              <button
                className="h-10 px-4 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                + Aggiungi Cliente
              </button>
            </Link>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
              Nessun risultato
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textTertiary }}>
              Nessun cliente trovato per &quot;{debouncedSearch}&quot;
            </p>
            <button
              onClick={() => { setSearchQuery(''); setCustomerType('all'); }}
              className="h-10 px-4 rounded-full text-sm font-medium border transition-colors hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              Cancella filtri
            </button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            {/* Data Table */}
            <motion.div variants={itemVariants}>
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-left border-b"
                        style={{ borderColor: colors.borderSubtle }}
                      >
                        <th className="px-4 sm:px-6 py-4 font-medium text-xs uppercase tracking-wider" style={{ color: colors.textTertiary }}>Nome</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: colors.textTertiary }}>Email</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: colors.textTertiary }}>Telefono</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: colors.textTertiary }}>Veicoli</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-xs uppercase tracking-wider hidden xl:table-cell" style={{ color: colors.textTertiary }}>Ultimo Servizio</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-xs uppercase tracking-wider text-right" style={{ color: colors.textTertiary }}>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => {
                        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Senza nome';
                        const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase() || '??';
                        const vehicleCount = customer.vehicles?.length ?? 0;

                        return (
                          <tr
                            key={customer.id}
                            className="border-b last:border-0 transition-colors cursor-pointer group"
                            style={{ borderColor: colors.borderSubtle }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td className="px-4 sm:px-6 py-4">
                              <Link
                                href={`/dashboard/customers/${customer.id}`}
                                className="flex items-center gap-3"
                              >
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                                  style={{
                                    backgroundColor: colors.borderSubtle,
                                    color: colors.textPrimary,
                                  }}
                                >
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate" style={{ color: colors.textPrimary }}>
                                    {fullName}
                                  </p>
                                  {customer.loyaltyTier && (
                                    <span className="text-xs" style={{ color: colors.textMuted }}>
                                      {customer.loyaltyTier}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden md:table-cell" style={{ color: colors.textSecondary }}>
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="h-4 w-4 flex-shrink-0" style={{ color: colors.textMuted }} />
                                <span className="truncate">{customer.email || 'N/D'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden lg:table-cell" style={{ color: colors.textSecondary }}>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0" style={{ color: colors.textMuted }} />
                                <span>{customer.phone ? formatPhone(customer.phone) : 'N/D'}</span>
                              </div>
                            </td>
                            <td
                              className="px-4 sm:px-6 py-4 text-center hidden sm:table-cell"
                              style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                            >
                              {vehicleCount}
                            </td>
                            <td className="px-4 sm:px-6 py-4 hidden xl:table-cell" style={{ color: colors.textSecondary }}>
                              {customer.updatedAt ? timeAgo(customer.updatedAt) : 'Mai'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right">
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                                  }}
                                  className="p-2 rounded-lg transition-colors hover:bg-white/5"
                                  aria-label="Azioni cliente"
                                >
                                  <MoreHorizontal className="h-4 w-4" style={{ color: colors.textMuted }} />
                                </button>
                                {openMenuId === customer.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setOpenMenuId(null)}
                                    />
                                    <div
                                      className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl border py-1 min-w-[180px]"
                                      style={{
                                        backgroundColor: colors.surface,
                                        borderColor: colors.border,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          router.push(`/dashboard/customers/${customer.id}`);
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                                        style={{ color: colors.textPrimary }}
                                      >
                                        <Eye className="h-4 w-4" />
                                        Vedi dettaglio
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          router.push(`/dashboard/customers/${customer.id}?tab=anagrafica&edit=true`);
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                                        style={{ color: colors.textPrimary }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Modifica
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          gdprExport.mutate(customer.id, {
                                            onSuccess: () => toast.success('Export GDPR avviato'),
                                            onError: () => toast.error('Errore durante l\'export'),
                                          });
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                                        style={{ color: colors.textPrimary }}
                                      >
                                        <Download className="h-4 w-4" />
                                        Esporta dati (GDPR)
                                      </button>
                                      <div className="my-1" style={{ borderTop: `1px solid ${colors.borderSubtle}` }} />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setDeleteTarget({ id: customer.id, name: fullName });
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                                        style={{ color: colors.error }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Elimina
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
