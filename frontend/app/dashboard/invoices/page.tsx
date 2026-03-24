'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
import {
  FileText,
  Plus,
  Euro,
  Clock,
  Send,
  CheckCircle,
  Search,
  Loader2,
  Eye,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

// =============================================================================
// Design Tokens
// =============================================================================
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

// =============================================================================
// Animation Variants
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// =============================================================================
// Types & Config
// =============================================================================
interface Invoice {
  id: string;
  number: string;
  customerName: string;
  createdAt: string;
  dueDate: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

interface InvoiceStats {
  monthlyRevenue: number;
  pendingCount: number;
  sentCount: number;
  paidCount: number;
}

type InvoiceStatus = 'ALL' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bozza', color: colors.textMuted },
  SENT: { label: 'Inviata', color: colors.info },
  PAID: { label: 'Pagata', color: colors.success },
  OVERDUE: { label: 'Scaduta', color: colors.error },
  CANCELLED: { label: 'Annullata', color: colors.textMuted },
};

const statusOptions: { value: InvoiceStatus; label: string }[] = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'SENT', label: 'Inviata' },
  { value: 'PAID', label: 'Pagata' },
  { value: 'OVERDUE', label: 'Scaduta' },
  { value: 'CANCELLED', label: 'Annullata' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function InvoicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: invoicesData,
    error: invoicesError,
    isLoading: invoicesLoading,
    mutate: mutateInvoices,
  } = useSWR<{ data?: Invoice[] } | Invoice[]>('/api/invoices', fetcher);
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR<{ data?: InvoiceStats } | InvoiceStats>('/api/invoices/stats', fetcher);

  const isLoading = invoicesLoading || statsLoading;

  const invoices: Invoice[] = (() => {
    if (!invoicesData) return [];
    const list = (invoicesData as { data?: Invoice[] }).data || invoicesData || [];
    return Array.isArray(list) ? list : [];
  })();

  const stats: InvoiceStats = (() => {
    if (!statsData) return { monthlyRevenue: 0, pendingCount: 0, sentCount: 0, paidCount: 0 };
    const d = (statsData as { data?: InvoiceStats }).data || statsData || {};
    return {
      monthlyRevenue: (d as InvoiceStats).monthlyRevenue || 0,
      pendingCount: (d as InvoiceStats).pendingCount || 0,
      sentCount: (d as InvoiceStats).sentCount || 0,
      paidCount: (d as InvoiceStats).paidCount || 0,
    };
  })();

  const handleSend = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore invio');
      mutateInvoices();
      mutateStats();
      toast.success('Fattura inviata con successo');
    } catch {
      toast.error('Errore durante l\'invio della fattura');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePay = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore pagamento');
      mutateInvoices();
      mutateStats();
      toast.success('Pagamento registrato con successo');
    } catch {
      toast.error('Errore durante la registrazione del pagamento');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      !searchQuery ||
      inv.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { label: 'Fatturato Mese', value: formatCurrency(stats.monthlyRevenue), icon: Euro, iconColor: colors.success },
    { label: 'In Attesa', value: String(stats.pendingCount), icon: Clock, iconColor: colors.warning },
    { label: 'Inviate', value: String(stats.sentCount), icon: Send, iconColor: colors.info },
    { label: 'Pagate', value: String(stats.paidCount), icon: CheckCircle, iconColor: colors.success },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: colors.textTertiary }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Fatture
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Gestisci fatture e documenti fiscali
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/invoices/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
            style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
          >
            <Plus className="h-4 w-4" />
            Nuova Fattura
          </button>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* KPI Cards */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              className="rounded-2xl border h-[120px] flex flex-col justify-center px-5"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              }}
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4" style={{ color: stat.iconColor }} />
                <span className="text-[13px]" style={{ color: colors.textTertiary }}>{stat.label}</span>
              </div>
              <span
                className="text-[28px] font-light"
                style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {isLoading ? '...' : stat.value}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Status Filter Pills */}
        <motion.div className="flex justify-center flex-wrap gap-2" variants={itemVariants}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className="h-10 px-4 rounded-full text-[13px] font-medium transition-all border"
              style={{
                backgroundColor: statusFilter === opt.value ? colors.textPrimary : 'transparent',
                color: statusFilter === opt.value ? colors.bg : colors.textSecondary,
                borderColor: statusFilter === opt.value ? colors.textPrimary : colors.borderSubtle,
              }}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          variants={itemVariants}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Cerca per cliente o numero fattura..."
              aria-label="Cerca fatture"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
              style={{
                backgroundColor: colors.glowStrong,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
              }}
            />
          </div>
        </motion.div>

        {/* Invoice List */}
        <motion.div variants={itemVariants}>
          {invoicesError || statsError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
                Impossibile caricare le fatture
              </p>
              <button
                onClick={() => { mutateInvoices(); mutateStats(); }}
                className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                Riprova
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.textMuted }} />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
                Nessuna fattura trovata
              </p>
              <p className="text-[13px] mb-6" style={{ color: colors.textTertiary }}>
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Crea la prima fattura per iniziare'}
              </p>
              {!searchQuery && statusFilter === 'ALL' && (
                <button
                  onClick={() => router.push('/dashboard/invoices/new')}
                  className="px-5 py-2.5 rounded-full text-sm font-medium"
                  style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
                >
                  + Nuova Fattura
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  {filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inv, idx, arr) => {
                    const status = statusConfig[inv.status] || statusConfig.DRAFT;
                    return (
                      <motion.div
                        key={inv.id}
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors group"
                        style={{
                          borderBottom: idx < arr.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                        }}
                        variants={itemVariants}
                        onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        {/* Status color bar */}
                        <div
                          className="w-1 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: status.color }}
                        />

                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: colors.glowStrong }}
                        >
                          <FileText className="h-5 w-5" style={{ color: colors.textTertiary }} />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
                            {inv.number || `#${inv.id.slice(0, 8)}`}
                          </p>
                          <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                            {inv.customerName} &bull; {new Date(inv.createdAt).toLocaleDateString('it-IT')}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span
                          className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full hidden sm:inline-block"
                          style={{
                            backgroundColor: `${status.color}20`,
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>

                        {/* Amount */}
                        <p
                          className="text-[14px] font-semibold min-w-[100px] text-right"
                          style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatCurrency(inv.total)}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                            className="p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-white/5"
                            style={{ color: colors.textMuted }}
                            aria-label="Visualizza"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSend(inv.id)}
                              disabled={actionLoading === inv.id}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:bg-white/5 disabled:opacity-50 flex items-center gap-1.5"
                              style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
                            >
                              {actionLoading === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Invia
                            </button>
                          )}
                          {inv.status === 'SENT' && (
                            <button
                              onClick={() => handlePay(inv.id)}
                              disabled={actionLoading === inv.id}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:bg-white/5 disabled:opacity-50 flex items-center gap-1.5"
                              style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}
                            >
                              {actionLoading === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CreditCard className="h-3 w-3" />
                              )}
                              Segna Pagata
                            </button>
                          )}
                        </div>

                        <ChevronRight
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: colors.textMuted }}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
              <div className="mt-4">
                <Pagination page={page} totalPages={Math.ceil(filteredInvoices.length / PAGE_SIZE)} onPageChange={setPage} />
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
