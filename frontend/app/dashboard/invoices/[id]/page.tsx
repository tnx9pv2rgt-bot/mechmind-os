'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
  AppleCardFooter,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  ArrowLeft,
  FileText,
  Send,
  CreditCard,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Smartphone,
  Link,
  SplitSquareHorizontal,
  Printer,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  ReceiptText,
  History,
  Building2,
  Mail,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
}

interface SdiEvent {
  id: string;
  status: string;
  date: string;
  detail?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  date: string;
  userId?: string;
  userName?: string;
  detail?: string;
}

interface InvoiceDetail {
  id: string;
  number: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  createdAt: string;
  dueDate: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerVat?: string;
  customerFiscalCode?: string;
  customerSdi?: string;
  customerPec?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  bolloAmount?: number;
  total: number;
  notes?: string;
  paymentMethod?: string;
  iban?: string;
  payments?: Payment[];
  sdiEvents?: SdiEvent[];
  auditLog?: AuditEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: typeof CheckCircle }> = {
  DRAFT: {
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-700',
    label: 'Bozza',
    icon: FileText,
  },
  SENT: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Inviata',
    icon: Send,
  },
  PAID: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
    label: 'Pagata',
    icon: CheckCircle,
  },
  OVERDUE: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Scaduta',
    icon: Clock,
  },
  CANCELLED: {
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Annullata',
    icon: XCircle,
  },
};

const sdiStatusMap: Record<string, { color: string; label: string }> = {
  INVIATA: { color: 'text-blue-600 dark:text-blue-400', label: 'Inviata' },
  CONSEGNATA: { color: 'text-green-600 dark:text-green-400', label: 'Consegnata' },
  ACCETTATA: { color: 'text-emerald-600 dark:text-emerald-400', label: 'Accettata' },
  RIFIUTATA: { color: 'text-red-600 dark:text-red-400', label: 'Rifiutata' },
  SCARTATA: { color: 'text-orange-600 dark:text-orange-400', label: 'Scartata' },
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Contanti',
  BANK_TRANSFER: 'Bonifico',
  CARD: 'Carta',
  CHECK: 'Assegno',
  RIBA: 'RiBa',
  SCALAPAY: 'Scalapay',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

type TabId = 'details' | 'payments' | 'sdi' | 'history';

/* ------------------------------------------------------------------ */
/*  Mark Paid Dialog                                                   */
/* ------------------------------------------------------------------ */

function MarkPaidDialog({
  open,
  onClose,
  onConfirm,
  loading,
  total,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { amount: number; date: string; method: string }) => void;
  loading: boolean;
  total: number;
}) {
  const [amount, setAmount] = useState(total);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('CASH');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#2f2f2f] rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-[#ececec] mb-6">
          Registra Pagamento
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Importo
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full h-12 rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] px-4 text-sm text-gray-900 dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Data Pagamento
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] px-4 text-sm text-gray-900 dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Metodo
            </label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 dark:border-[#424242] bg-white dark:bg-[#353535] px-4 text-sm text-gray-900 dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              <option value="CASH">Contanti</option>
              <option value="BANK_TRANSFER">Bonifico</option>
              <option value="CARD">Carta</option>
              <option value="CHECK">Assegno</option>
              <option value="RIBA">RiBa</option>
              <option value="SCALAPAY">Scalapay</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <AppleButton variant="secondary" onClick={onClose} className="flex-1">
            Annulla
          </AppleButton>
          <AppleButton
            onClick={() => onConfirm({ amount, date, method })}
            loading={loading}
            className="flex-1"
          >
            Conferma Pagamento
          </AppleButton>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: rawData, error, isLoading, mutate } = useSWR<{ data?: InvoiceDetail } | InvoiceDetail>(
    id ? `/api/invoices/${id}` : null,
    fetcher,
  );

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);

  const invoice: InvoiceDetail | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: InvoiceDetail }).data || (rawData as InvoiceDetail);
  })();

  const doAction = useCallback(
    async (url: string, method: string, body?: Record<string, unknown>, successMsg?: string) => {
      setActionLoading(true);
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error?.message || 'Errore operazione');
        }
        toast.success(successMsg || 'Operazione completata');
        mutate();
        return res;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore operazione');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [mutate],
  );

  const handleSend = () => doAction(`/api/invoices/${id}/send`, 'POST', undefined, 'Fattura inviata con successo');
  const handleSendSdi = () => doAction(`/api/invoices/${id}/send`, 'POST', { sdi: true }, 'Fattura inviata a SDI');
  const handleSendReminder = () =>
    doAction(`/api/invoices/${id}/send-reminder`, 'POST', undefined, 'Sollecito inviato');
  const handleMarkPaid = (data: { amount: number; date: string; method: string }) => {
    doAction(`/api/invoices/${id}/mark-paid`, 'POST', data, 'Pagamento registrato');
    setMarkPaidOpen(false);
  };
  const handlePaymentLink = async () => {
    const res = await doAction(`/api/invoices/${id}/checkout`, 'POST', undefined, 'Link di pagamento creato');
    if (res) {
      const data = await res.json().catch(() => ({}));
      const url = data.url || data.data?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiato negli appunti');
      }
    }
  };
  const handleBnpl = async () => {
    const res = await doAction(`/api/invoices/${id}/bnpl`, 'POST', undefined, 'Ordine BNPL creato');
    if (res) {
      const data = await res.json().catch(() => ({}));
      const redirectUrl = data.redirectUrl || data.data?.redirectUrl;
      if (redirectUrl) window.open(redirectUrl, '_blank');
    }
  };
  const handleDelete = async () => {
    await doAction(`/api/invoices/${id}`, 'DELETE', undefined, 'Fattura eliminata');
    router.push('/dashboard/invoices');
  };
  const handleDownloadPdf = () => {
    window.open(`/api/invoices/${id}/pdf`, '_blank');
  };

  /* ------------------------------------------------------------------ */
  /*  States: loading / error / empty                                    */
  /* ------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-body text-apple-gray dark:text-[#636366] mb-4">
          Impossibile caricare la fattura
        </p>
        <AppleButton
          variant="secondary"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/dashboard/invoices')}
        >
          Torna alle Fatture
        </AppleButton>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-body text-apple-gray dark:text-[#636366] mb-4">Fattura non trovata</p>
        <AppleButton
          variant="secondary"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/dashboard/invoices')}
        >
          Torna alle Fatture
        </AppleButton>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'details', label: 'Dettagli', icon: FileText },
    { id: 'payments', label: 'Pagamenti', icon: CreditCard },
    { id: 'sdi', label: 'SDI', icon: Building2 },
    { id: 'history', label: 'Storico', icon: History },
  ];

  // Compute IVA breakdown by rate
  const ivaBreakdown: Record<number, { base: number; tax: number }> = {};
  for (const item of invoice.items || []) {
    const rate = item.vatRate ?? invoice.taxRate ?? 22;
    if (!ivaBreakdown[rate]) ivaBreakdown[rate] = { base: 0, tax: 0 };
    const lineTotal = item.quantity * item.unitPrice;
    ivaBreakdown[rate].base += lineTotal;
    ivaBreakdown[rate].tax += lineTotal * (rate / 100);
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="print:bg-white">
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50 print:hidden">
        <div className="px-4 sm:px-8 py-5">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Fatture', href: '/dashboard/invoices' },
              { label: invoice.number || `#${invoice.id.slice(0, 8)}` },
            ]}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-4">
              <AppleButton
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => router.push('/dashboard/invoices')}
              >
                Indietro
              </AppleButton>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-headline text-apple-dark dark:text-[#ececec]">
                    {invoice.number || `Fattura #${invoice.id.slice(0, 8)}`}
                  </h1>
                  <span
                    className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 ${status.bg} ${status.color}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="text-apple-gray dark:text-[#636366] text-body mt-1">
                  {invoice.customerName} &bull; Emessa il {formatDate(invoice.createdAt)}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <AppleButton
                variant="ghost"
                size="sm"
                icon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Stampa
              </AppleButton>
              <AppleButton
                variant="ghost"
                size="sm"
                icon={<Download className="h-4 w-4" />}
                onClick={handleDownloadPdf}
              >
                PDF
              </AppleButton>

              {invoice.status === 'DRAFT' && (
                <>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    icon={<Send className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={handleSend}
                  >
                    Invia
                  </AppleButton>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    icon={<Building2 className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={handleSendSdi}
                  >
                    Invia a SDI
                  </AppleButton>
                  <AppleButton
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Elimina
                  </AppleButton>
                </>
              )}

              {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                <>
                  <AppleButton
                    size="sm"
                    icon={<CreditCard className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={() => setMarkPaidOpen(true)}
                  >
                    Segna Pagata
                  </AppleButton>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    icon={<Bell className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={handleSendReminder}
                  >
                    Sollecito
                  </AppleButton>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    icon={<Link className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={handlePaymentLink}
                  >
                    Link Pagamento
                  </AppleButton>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    icon={<SplitSquareHorizontal className="h-4 w-4" />}
                    loading={actionLoading}
                    onClick={handleBnpl}
                  >
                    Paga a Rate
                  </AppleButton>
                </>
              )}

              {invoice.status === 'PAID' && (
                <AppleButton
                  variant="secondary"
                  size="sm"
                  icon={<ReceiptText className="h-4 w-4" />}
                  onClick={() =>
                    router.push(`/dashboard/invoices/credit-note/new?invoiceId=${id}`)
                  }
                >
                  Nota di Credito
                </AppleButton>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-apple-border/20 dark:border-[#424242]/50 bg-white/60 dark:bg-[#212121]/60 backdrop-blur-sm print:hidden">
        <div className="px-4 sm:px-8 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-apple-blue text-apple-blue'
                    : 'border-transparent text-apple-gray dark:text-[#636366] hover:text-apple-dark dark:hover:text-[#ececec]'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Tab: Details */}
        {activeTab === 'details' && (
          <>
            {/* Customer + Dates */}
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants}>
              <motion.div variants={itemVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-apple-gray" />
                      <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">
                        Cliente
                      </h2>
                    </div>
                  </AppleCardHeader>
                  <AppleCardContent className="space-y-2">
                    <p className="text-body font-semibold text-apple-dark dark:text-[#ececec]">
                      {invoice.customerName}
                    </p>
                    {invoice.customerAddress && (
                      <p className="text-footnote text-apple-gray dark:text-[#636366]">
                        {invoice.customerAddress}
                      </p>
                    )}
                    {invoice.customerVat && (
                      <p className="text-footnote text-apple-gray dark:text-[#636366]">
                        P.IVA: {invoice.customerVat}
                      </p>
                    )}
                    {invoice.customerFiscalCode && (
                      <p className="text-footnote text-apple-gray dark:text-[#636366]">
                        C.F.: {invoice.customerFiscalCode}
                      </p>
                    )}
                    {invoice.customerSdi && (
                      <p className="text-footnote text-apple-gray dark:text-[#636366]">
                        SDI: {invoice.customerSdi}
                      </p>
                    )}
                    {invoice.customerPec && (
                      <p className="text-footnote text-apple-gray dark:text-[#636366]">
                        PEC: {invoice.customerPec}
                      </p>
                    )}
                    {invoice.customerEmail && (
                      <p className="text-footnote text-apple-gray dark:text-[#636366] flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {invoice.customerEmail}
                      </p>
                    )}
                  </AppleCardContent>
                </AppleCard>
              </motion.div>

              <motion.div variants={itemVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-apple-gray" />
                      <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">
                        Date e Stato
                      </h2>
                    </div>
                  </AppleCardHeader>
                  <AppleCardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-apple-gray dark:text-[#636366]">
                        Data Emissione
                      </span>
                      <span className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                        {formatDate(invoice.createdAt)}
                      </span>
                    </div>
                    {invoice.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-apple-gray dark:text-[#636366]">
                          Data Scadenza
                        </span>
                        <span className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    )}
                    {invoice.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-sm text-apple-gray dark:text-[#636366]">
                          Metodo Pagamento
                        </span>
                        <span className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                          {paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-apple-gray dark:text-[#636366]">Stato</span>
                      <span
                        className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            </motion.div>

            {/* Line Items */}
            <motion.div variants={itemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-apple-gray" />
                    <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
                      Dettaglio Voci
                    </h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-12 gap-3 pb-3 border-b border-apple-border/30 dark:border-[#424242] mb-3">
                    <div className="col-span-5">
                      <span className="text-xs font-medium uppercase text-apple-gray dark:text-[#636366]">
                        Descrizione
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-xs font-medium uppercase text-apple-gray dark:text-[#636366]">
                        Qta
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-medium uppercase text-apple-gray dark:text-[#636366]">
                        Prezzo
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-medium uppercase text-apple-gray dark:text-[#636366]">
                        IVA %
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-medium uppercase text-apple-gray dark:text-[#636366]">
                        Totale
                      </span>
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div className="space-y-2">
                    {(invoice.items || []).map(item => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 py-3 rounded-xl px-3 hover:bg-apple-light-gray/30 dark:hover:bg-[#353535] transition-colors"
                      >
                        <div className="sm:col-span-5">
                          <p className="text-sm text-apple-dark dark:text-[#ececec]">
                            {item.description}
                          </p>
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <span className="sm:hidden text-xs text-apple-gray">Qta: </span>
                          <span className="text-sm text-apple-dark dark:text-[#ececec]">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="sm:col-span-2 text-right">
                          <span className="sm:hidden text-xs text-apple-gray">Prezzo: </span>
                          <span className="text-sm text-apple-dark dark:text-[#ececec]">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                        <div className="sm:col-span-2 text-right">
                          <span className="sm:hidden text-xs text-apple-gray">IVA: </span>
                          <span className="text-sm text-apple-dark dark:text-[#ececec]">
                            {item.vatRate ?? invoice.taxRate ?? 22}%
                          </span>
                        </div>
                        <div className="sm:col-span-2 text-right">
                          <span className="sm:hidden text-xs text-apple-gray">Totale: </span>
                          <span className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                            {formatCurrency(item.total || item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </AppleCardContent>

                {/* Totals */}
                <AppleCardFooter>
                  <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-apple-gray dark:text-[#636366]">Subtotale</span>
                        <span className="font-medium text-apple-dark dark:text-[#ececec]">
                          {formatCurrency(invoice.subtotal)}
                        </span>
                      </div>
                      {Object.entries(ivaBreakdown).map(([rate, data]) => (
                        <div key={rate} className="flex justify-between text-sm">
                          <span className="text-apple-gray dark:text-[#636366]">
                            IVA {rate}% (su {formatCurrency(data.base)})
                          </span>
                          <span className="font-medium text-apple-dark dark:text-[#ececec]">
                            {formatCurrency(data.tax)}
                          </span>
                        </div>
                      ))}
                      {invoice.bolloAmount && invoice.bolloAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-apple-gray dark:text-[#636366]">
                            Bollo
                          </span>
                          <span className="font-medium text-apple-dark dark:text-[#ececec]">
                            {formatCurrency(invoice.bolloAmount)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-apple-border/30 dark:border-[#424242] pt-2">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold text-apple-dark dark:text-[#ececec]">
                            Totale
                          </span>
                          <span className="text-base font-bold text-apple-dark dark:text-[#ececec]">
                            {formatCurrency(invoice.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AppleCardFooter>
              </AppleCard>
            </motion.div>

            {/* Notes */}
            {invoice.notes && (
              <motion.div variants={itemVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">
                      Note
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    <p className="text-sm text-apple-gray dark:text-[#636366] whitespace-pre-wrap">
                      {invoice.notes}
                    </p>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </>
        )}

        {/* Tab: Payments */}
        {activeTab === 'payments' && (
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
                  Storico Pagamenti
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {(invoice.payments || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CreditCard className="h-12 w-12 text-apple-gray/40 mb-4" />
                    <p className="text-body text-apple-gray dark:text-[#636366]">
                      Nessun pagamento registrato
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(invoice.payments || []).map(payment => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                              {paymentMethodLabels[payment.method] || payment.method}
                            </p>
                            <p className="text-xs text-apple-gray dark:text-[#636366]">
                              {formatDate(payment.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-apple-dark dark:text-[#ececec]">
                            {formatCurrency(payment.amount)}
                          </p>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                              payment.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                            }`}
                          >
                            {payment.status === 'COMPLETED' ? 'Completato' : 'In attesa'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Tab: SDI */}
        {activeTab === 'sdi' && (
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
                  Fatturazione Elettronica (SDI)
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {(invoice.sdiEvents || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="h-12 w-12 text-apple-gray/40 mb-4" />
                    <p className="text-body text-apple-gray dark:text-[#636366]">
                      Fattura non ancora inviata al Sistema di Interscambio
                    </p>
                    {invoice.status === 'DRAFT' && (
                      <AppleButton
                        variant="ghost"
                        className="mt-4"
                        icon={<Building2 className="h-4 w-4" />}
                        onClick={handleSendSdi}
                        loading={actionLoading}
                      >
                        Invia a SDI
                      </AppleButton>
                    )}
                  </div>
                ) : (
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-apple-border/30 dark:bg-[#424242]" />
                    {(invoice.sdiEvents || []).map((event, i) => {
                      const sdiStatus = sdiStatusMap[event.status] || {
                        color: 'text-gray-600',
                        label: event.status,
                      };
                      return (
                        <div key={event.id || i} className="relative mb-6 last:mb-0">
                          <div className="absolute -left-5 w-4 h-4 rounded-full bg-white dark:bg-[#2f2f2f] border-2 border-apple-blue" />
                          <div className="p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535]">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${sdiStatus.color}`}>
                                {sdiStatus.label}
                              </span>
                              <span className="text-xs text-apple-gray dark:text-[#636366]">
                                {formatDateTime(event.date)}
                              </span>
                            </div>
                            {event.detail && (
                              <p className="text-xs text-apple-gray dark:text-[#636366]">
                                {event.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Tab: History */}
        {activeTab === 'history' && (
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
                  Registro Modifiche
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {(invoice.auditLog || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-12 w-12 text-apple-gray/40 mb-4" />
                    <p className="text-body text-apple-gray dark:text-[#636366]">
                      Nessuna modifica registrata
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(invoice.auditLog || []).map((entry, i) => (
                      <div
                        key={entry.id || i}
                        className="flex items-start gap-4 p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535]"
                      >
                        <div className="w-8 h-8 rounded-full bg-apple-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <History className="h-4 w-4 text-apple-blue" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-apple-dark dark:text-[#ececec]">
                            {entry.action}
                          </p>
                          {entry.detail && (
                            <p className="text-xs text-apple-gray dark:text-[#636366] mt-0.5">
                              {entry.detail}
                            </p>
                          )}
                          <p className="text-xs text-apple-gray dark:text-[#636366] mt-1">
                            {entry.userName && `${entry.userName} — `}
                            {formatDateTime(entry.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Elimina fattura"
        description="Sei sicuro di voler eliminare questa fattura? Questa azione non puo essere annullata."
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      <MarkPaidDialog
        open={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        onConfirm={handleMarkPaid}
        loading={actionLoading}
        total={invoice.total}
      />
    </div>
  );
}
