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
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useCustomers, useDeleteCustomer, useGdprExport } from '@/hooks/useApi';
import { formatPhone, timeAgo } from '@/lib/utils/format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type CustomerType = 'all' | 'private' | 'business';

const PAGE_SIZE = 20;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
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
    <div>
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
      <header className="">
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Clienti
            </h1>
            <p className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1">
              {isLoading ? 'Caricamento...' : `${total} clienti totali`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/customers/import">
              <AppleButton variant="secondary" icon={<Upload className="h-4 w-4" />}>
                <span className="hidden sm:inline">Importa CSV</span>
                <span className="sm:hidden">Importa</span>
              </AppleButton>
            </Link>
            <Link href="/dashboard/customers/new/step1">
              <AppleButton variant="primary" icon={<Plus className="h-4 w-4" />}>
                <span className="hidden sm:inline">Nuovo Cliente</span>
                <span className="sm:hidden">Nuovo</span>
              </AppleButton>
            </Link>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Search + Filter */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <Input
                    type="text"
                    placeholder="Cerca clienti per nome, email o telefono..."
                    aria-label="Cerca clienti"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Filter Chips */}
                <div className="flex items-center justify-center flex-wrap gap-2">
                  {[
                    { value: 'all' as const, label: 'Tutti' },
                    { value: 'private' as const, label: 'Privati' },
                    { value: 'business' as const, label: 'Aziende' },
                  ].map((filter) => (
                    <AppleButton
                      key={filter.value}
                      variant={customerType === filter.value ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => { setCustomerType(filter.value); setPage(1); }}
                    >
                      {filter.label}
                    </AppleButton>
                  ))}
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Content */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className="text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Elenco Clienti
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-[var(--status-error)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Impossibile caricare i clienti
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => refetch()}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : filteredCustomers.length === 0 && !debouncedSearch ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Nessun cliente ancora. Aggiungi il primo cliente per iniziare.
                  </p>
                  <Link href="/dashboard/customers/new/step1">
                    <AppleButton variant="ghost" className="mt-4">
                      Aggiungi Cliente
                    </AppleButton>
                  </Link>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-[var(--text-tertiary)]/40 mb-4" />
                  <p className="text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Nessun cliente trovato per &quot;{debouncedSearch}&quot;
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => { setSearchQuery(''); setCustomerType('all'); }}
                  >
                    Cancella filtri
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]">
                          <th className="px-4 sm:px-6 py-4 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Nome</th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-medium hidden md:table-cell text-[var(--text-primary)] dark:text-[var(--text-primary)]">Email</th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-medium hidden lg:table-cell text-[var(--text-primary)] dark:text-[var(--text-primary)]">Telefono</th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-medium hidden sm:table-cell text-[var(--text-primary)] dark:text-[var(--text-primary)]">Veicoli</th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-medium hidden xl:table-cell text-[var(--text-primary)] dark:text-[var(--text-primary)]">Ultimo Servizio</th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-medium text-right text-[var(--text-primary)] dark:text-[var(--text-primary)]">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.map((customer) => {
                          const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Senza nome';
                          const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase() || '??';
                          const vehicleCount = customer.vehicles?.length ?? 0;

                          return (
                            <motion.tr
                              key={customer.id}
                              variants={listItemVariants}
                              className="border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)] last:border-0 transition-colors cursor-pointer group hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-active)]"
                            >
                              <td className="px-4 sm:px-6 py-4">
                                <Link
                                  href={`/dashboard/customers/${customer.id}`}
                                  className="flex items-center gap-3"
                                >
                                  <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-sm font-medium flex-shrink-0 text-[var(--brand)]">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-body font-medium truncate text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                      {fullName}
                                    </p>
                                    {customer.loyaltyTier && (
                                      <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                        {customer.loyaltyTier}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                <div className="flex items-center gap-2 truncate text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  <Mail className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{customer.email || 'N/D'}</span>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                                <div className="flex items-center gap-2 text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  <Phone className="h-4 w-4 flex-shrink-0" />
                                  <span>{customer.phone ? formatPhone(customer.phone) : 'N/D'}</span>
                                </div>
                              </td>
                              <td
                                className="px-4 sm:px-6 py-4 text-center hidden sm:table-cell text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {vehicleCount}
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden xl:table-cell text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                {customer.updatedAt ? timeAgo(customer.updatedAt) : 'Mai'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <div className="relative inline-block">
                                  <AppleButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                                    }}
                                    aria-label="Azioni cliente"
                                    icon={<MoreHorizontal className="h-4 w-4" />}
                                  />
                                  {openMenuId === customer.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setOpenMenuId(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-apple border border-[var(--border-default)]/20 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] py-1 min-w-[180px]">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            router.push(`/dashboard/customers/${customer.id}`);
                                          }}
                                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)]"
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
                                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)]"
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
                                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)]"
                                        >
                                          <Download className="h-4 w-4" />
                                          Esporta dati (GDPR)
                                        </button>
                                        <div className="my-1 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]" />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setDeleteTarget({ id: customer.id, name: fullName });
                                          }}
                                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--status-error)] transition-colors hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)]"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Elimina
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
