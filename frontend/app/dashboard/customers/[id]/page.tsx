'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
  AppleCardFooter,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  User,
  Car,
  FileText,
  Euro,
  Mail,
  Phone,
  MapPin,
  Building2,
  Edit3,
  Trash2,
  Printer,
  Shield,
  Clock,
  MessageSquare,
  Loader2,
  AlertCircle,
  X,
  Plus,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const editCustomerSchema = z.object({
  firstName: z.string().min(1, 'Il nome è obbligatorio'),
  lastName: z.string().min(1, 'Il cognome è obbligatorio'),
  customerType: z.enum(['PERSONA', 'AZIENDA'], { message: 'Tipo cliente non valido' }),
  email: z.string().email('Email non valida').or(z.literal('')).optional(),
  phone: z.string().optional(),
  codiceFiscale: z.string().optional(),
  partitaIva: z.string().optional(),
  sdiCode: z.string().optional(),
  pecEmail: z.string().email('PEC non valida').or(z.literal('')).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  notes: z.string().optional(),
  language: z.string().optional(),
  preferredContactChannel: z.string().optional(),
  acquisitionSource: z.string().optional(),
});

type EditCustomerFormData = z.infer<typeof editCustomerSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  customerType: 'PERSONA' | 'AZIENDA';
  codiceFiscale: string | null;
  partitaIva: string | null;
  sdiCode: string | null;
  pecEmail: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  notes: string | null;
  language: string | null;
  preferredContactChannel: string | null;
  acquisitionSource: string | null;
  loyaltyTier: string | null;
  gdprConsentAt: string | null;
  gdprConsentVersion: string | null;
  marketingConsentAt: string | null;
  vehicles: VehicleSummary[];
  invoices: InvoiceSummary[];
  workOrders: WorkOrderSummary[];
  bookings: BookingSummary[];
  totalSpent: number;
  visitCount: number;
  createdAt: string;
}

interface VehicleSummary {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
}

interface InvoiceSummary {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: string;
}

interface WorkOrderSummary {
  id: string;
  woNumber: string;
  status: string;
  totalCost: number;
  createdAt: string;
}

interface BookingSummary {
  id: string;
  scheduledAt: string;
  status: string;
  serviceName: string;
}

type TabId = 'anagrafica' | 'veicoli' | 'storico' | 'fatture' | 'comunicazioni';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

const statusBadge: Record<string, { label: string; bg: string }> = {
  DRAFT: { label: 'Bozza', bg: 'bg-apple-light-gray text-apple-gray dark:bg-[var(--surface-hover)] dark:text-[var(--text-secondary)]' },
  SENT: {
    label: 'Inviata',
    bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  PAID: {
    label: 'Pagata',
    bg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  OVERDUE: { label: 'Scaduta', bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  OPEN: { label: 'Aperto', bg: 'bg-apple-light-gray text-apple-gray dark:bg-[var(--surface-hover)] dark:text-[var(--text-secondary)]' },
  PENDING: {
    label: 'In Attesa',
    bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  IN_PROGRESS: {
    label: 'In Lavorazione',
    bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  COMPLETED: {
    label: 'Completato',
    bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  INVOICED: {
    label: 'Fatturato',
    bg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
  confirmed: {
    label: 'Confermato',
    bg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  cancelled: {
    label: 'Annullato',
    bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('anagrafica');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) throw new Error('Cliente non trovato');
      const json = await res.json();
      const data = json.data ?? json;
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      toast.success('Cliente eliminato con successo');
      router.push('/dashboard/customers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'eliminazione del cliente');
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'anagrafica', label: 'Dati Anagrafici' },
    { id: 'veicoli', label: 'Veicoli' },
    { id: 'storico', label: 'Storico Interventi' },
    { id: 'fatture', label: 'Fatture' },
    { id: 'comunicazioni', label: 'Comunicazioni' },
  ];

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <AlertCircle className='h-12 w-12 text-apple-gray dark:text-[var(--text-secondary)] mx-auto mb-4' />
          <h2 className='text-title-2 text-apple-dark dark:text-[var(--text-primary)] mb-2'>
            Cliente non trovato
          </h2>
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>{error}</p>
          <Link href='/dashboard/customers'>
            <AppleButton variant='secondary'>Torna ai clienti</AppleButton>
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`;
  const invoicesPaid = (customer.invoices || []).filter(i => i.status === 'PAID');
  const invoicesPending = (customer.invoices || []).filter(
    i => i.status !== 'PAID' && i.status !== 'CANCELLED'
  );
  const totalPaid = invoicesPaid.reduce((s, i) => s + i.total, 0);
  const totalPending = invoicesPending.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Clienti', href: '/dashboard/customers' },
              { label: fullName },
            ]}
          />

          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='w-14 h-14 rounded-2xl bg-apple-blue/10 flex items-center justify-center'>
                <span className='text-title-2 font-bold text-apple-blue'>
                  {customer.firstName?.[0]}
                  {customer.lastName?.[0]}
                </span>
              </div>
              <div>
                <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>{fullName}</h1>
                <span
                  className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                    customer.customerType === 'AZIENDA'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  {customer.customerType === 'AZIENDA' ? 'Azienda' : 'Persona Fisica'}
                </span>
              </div>
            </div>
            <div className='flex gap-2'>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Edit3 className='h-4 w-4' />}
                onClick={() => setShowEditModal(true)}
              >
                Modifica
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Printer className='h-4 w-4' />}
                onClick={() => window.print()}
              >
                Stampa
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Trash2 className='h-4 w-4' />}
                onClick={() => setDeleteConfirm(true)}
                className='text-red-500 hover:text-red-600'
              >
                Elimina
              </AppleButton>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className='border-b border-apple-border/20 dark:border-[var(--border-default)]/50 bg-white/60 dark:bg-[var(--surface-primary)]/60'>
        <div className='px-8 flex gap-1'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-footnote font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-apple-blue text-apple-blue'
                  : 'border-transparent text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className='p-8'>
        <motion.div variants={containerVariants} initial='hidden' animate='visible'>
          {/* Tab: Anagrafica */}
          {activeTab === 'anagrafica' && (
            <motion.div
              variants={containerVariants}
              className='grid grid-cols-1 lg:grid-cols-2 gap-6'
            >
              {/* Personal */}
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                      <User className='h-5 w-5 text-apple-gray' />
                      Dati Personali
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-3'>
                    <InfoRow label='Nome' value={customer.firstName} />
                    <InfoRow label='Cognome' value={customer.lastName} />
                    <InfoRow
                      label='Tipo'
                      value={customer.customerType === 'AZIENDA' ? 'Azienda' : 'Persona Fisica'}
                    />
                    <InfoRow label='Lingua' value={customer.language || 'Italiano'} />
                    <InfoRow
                      label='Fonte acquisizione'
                      value={customer.acquisitionSource || '--'}
                    />
                    {customer.loyaltyTier && (
                      <InfoRow label='Livello fedeltà' value={customer.loyaltyTier} />
                    )}
                  </AppleCardContent>
                </AppleCard>
              </motion.div>

              {/* Fiscal */}
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                      <Building2 className='h-5 w-5 text-apple-gray' />
                      Dati Fiscali
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-3'>
                    <InfoRow label='Codice Fiscale' value={customer.codiceFiscale || '--'} />
                    <InfoRow label='Partita IVA' value={customer.partitaIva || '--'} />
                    <InfoRow label='Codice SDI' value={customer.sdiCode || '--'} />
                    <InfoRow label='PEC' value={customer.pecEmail || '--'} />
                  </AppleCardContent>
                </AppleCard>
              </motion.div>

              {/* Contacts */}
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                      <Phone className='h-5 w-5 text-apple-gray' />
                      Contatti
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-3'>
                    <InfoRow label='Telefono' value={customer.phone || '--'} />
                    <InfoRow label='Email' value={customer.email || '--'} />
                    <InfoRow
                      label='Canale preferito'
                      value={customer.preferredContactChannel || '--'}
                    />
                    <div className='pt-2 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                      <p className='text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                        Indirizzo
                      </p>
                      <p className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                        {customer.address || '--'}
                        {customer.postalCode && `, ${customer.postalCode}`}
                        {customer.city && ` ${customer.city}`}
                        {customer.province && ` (${customer.province})`}
                      </p>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>

              {/* Notes & Consents */}
              <motion.div variants={cardVariants} className='space-y-6'>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      Note
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    <p className='text-body text-apple-dark dark:text-[var(--text-primary)] bg-apple-light-gray/50 dark:bg-[var(--surface-elevated)] p-4 rounded-xl'>
                      {customer.notes || 'Nessuna nota.'}
                    </p>
                  </AppleCardContent>
                </AppleCard>

                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                      <Shield className='h-5 w-5 text-apple-gray' />
                      Consensi
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        Consenso GDPR
                      </span>
                      <span className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        {customer.gdprConsentAt
                          ? `${new Date(customer.gdprConsentAt).toLocaleDateString('it-IT')} (v${customer.gdprConsentVersion || '1'})`
                          : 'Non fornito'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        Consenso Marketing
                      </span>
                      <span className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        {customer.marketingConsentAt
                          ? new Date(customer.marketingConsentAt).toLocaleDateString('it-IT')
                          : 'Non fornito'}
                      </span>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            </motion.div>
          )}

          {/* Tab: Veicoli */}
          {activeTab === 'veicoli' && (
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader className='flex items-center justify-between'>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Car className='h-5 w-5 text-apple-gray' />
                    Veicoli ({(customer.vehicles || []).length})
                  </h2>
                  <Link href='/dashboard/vehicles/new'>
                    <AppleButton variant='ghost' size='sm' icon={<Plus className='h-4 w-4' />}>
                      Aggiungi veicolo
                    </AppleButton>
                  </Link>
                </AppleCardHeader>
                <AppleCardContent>
                  {(customer.vehicles || []).length === 0 ? (
                    <div className='text-center py-12'>
                      <Car className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                        Nessun veicolo associato. Aggiungi il primo veicolo.
                      </p>
                      <Link href='/dashboard/vehicles/new'>
                        <AppleButton variant='ghost' className='mt-4'>
                          Aggiungi veicolo
                        </AppleButton>
                      </Link>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {(customer.vehicles || []).map(v => (
                        <Link
                          key={v.id}
                          href={`/dashboard/vehicles/${v.id}`}
                          className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        >
                          <div className='flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                              <Car className='h-6 w-6 text-apple-blue' />
                            </div>
                            <div>
                              <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                {v.make} {v.model}
                              </p>
                              <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                {v.licensePlate} {v.year ? `• ${v.year}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            {v.mileage != null && (
                              <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                {v.mileage.toLocaleString('it-IT')} km
                              </span>
                            )}
                            <ChevronRight className='h-4 w-4 text-apple-gray' />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Tab: Storico Interventi */}
          {activeTab === 'storico' && (
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-apple-gray' />
                    Storico Interventi
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {(customer.workOrders || []).length === 0 &&
                  (customer.bookings || []).length === 0 ? (
                    <div className='text-center py-12'>
                      <Clock className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                        Nessun intervento registrato.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {/* Work Orders */}
                      {(customer.workOrders || [])
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .map(wo => {
                          const s = statusBadge[wo.status] || statusBadge.OPEN;
                          return (
                            <Link
                              key={wo.id}
                              href={`/dashboard/work-orders/${wo.id}`}
                              className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                            >
                              <div className='flex items-center gap-4'>
                                <div className='w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                                  <FileText className='h-5 w-5 text-apple-blue' />
                                </div>
                                <div>
                                  <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                    Ordine di Lavoro {wo.woNumber}
                                  </p>
                                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                    {new Date(wo.createdAt).toLocaleDateString('it-IT')}
                                  </p>
                                </div>
                              </div>
                              <div className='flex items-center gap-3'>
                                <span
                                  className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${s?.bg}`}
                                >
                                  {s?.label}
                                </span>
                                <span className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                  {formatCurrency(wo.totalCost)}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      {/* Bookings */}
                      {(customer.bookings || [])
                        .sort(
                          (a, b) =>
                            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
                        )
                        .map(bk => {
                          const s = statusBadge[bk.status] || statusBadge.PENDING;
                          return (
                            <Link
                              key={bk.id}
                              href={`/dashboard/bookings/${bk.id}`}
                              className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                            >
                              <div className='flex items-center gap-4'>
                                <div className='w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                                  <Clock className='h-5 w-5 text-apple-green' />
                                </div>
                                <div>
                                  <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                    Prenotazione — {bk.serviceName}
                                  </p>
                                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                    {new Date(bk.scheduledAt).toLocaleDateString('it-IT', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${s?.bg}`}
                              >
                                {s?.label}
                              </span>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Tab: Fatture */}
          {activeTab === 'fatture' && (
            <motion.div variants={cardVariants} className='space-y-6'>
              {/* Stats */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                      Totale Fatturato
                    </p>
                    <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                      {formatCurrency(customer.totalSpent || totalPaid + totalPending)}
                    </p>
                  </AppleCardContent>
                </AppleCard>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Pagato</p>
                    <p className='text-title-1 font-bold text-apple-green'>
                      {formatCurrency(totalPaid)}
                    </p>
                  </AppleCardContent>
                </AppleCard>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>In Sospeso</p>
                    <p className='text-title-1 font-bold text-apple-orange'>
                      {formatCurrency(totalPending)}
                    </p>
                  </AppleCardContent>
                </AppleCard>
              </div>

              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Euro className='h-5 w-5 text-apple-gray' />
                    Fatture ({(customer.invoices || []).length})
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {(customer.invoices || []).length === 0 ? (
                    <div className='text-center py-12'>
                      <Euro className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                        Nessuna fattura.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {(customer.invoices || []).map(inv => {
                        const s = statusBadge[inv.status] || statusBadge.DRAFT;
                        return (
                          <Link
                            key={inv.id}
                            href={`/dashboard/invoices/${inv.id}`}
                            className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                          >
                            <div className='flex items-center gap-4'>
                              <div className='w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                                <FileText className='h-5 w-5 text-apple-green' />
                              </div>
                              <div>
                                <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                  {inv.number}
                                </p>
                                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                  {new Date(inv.createdAt).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center gap-3'>
                              <span
                                className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${s.bg}`}
                              >
                                {s.label}
                              </span>
                              <span className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                {formatCurrency(inv.total)}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}

          {/* Tab: Comunicazioni */}
          {activeTab === 'comunicazioni' && (
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <MessageSquare className='h-5 w-5 text-apple-gray' />
                    Comunicazioni
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className='text-center py-12'>
                    <MessageSquare className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                    <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                      Nessuna comunicazione registrata.
                    </p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchCustomer();
          }}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title='Elimina cliente'
        description={`Sei sicuro di voler eliminare il cliente ${fullName}? Questa azione non può essere annullata.`}
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDelete}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{label}</span>
      <span className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>
        {value || '--'}
      </span>
    </div>
  );
}

function EditCustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
  } = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      customerType: customer.customerType || 'PERSONA',
      codiceFiscale: customer.codiceFiscale || '',
      partitaIva: customer.partitaIva || '',
      sdiCode: customer.sdiCode || '',
      pecEmail: customer.pecEmail || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      postalCode: customer.postalCode || '',
      province: customer.province || '',
      notes: customer.notes || '',
      language: customer.language || '',
      preferredContactChannel: customer.preferredContactChannel || '',
      acquisitionSource: customer.acquisitionSource || '',
    },
  });

  const onSubmit = async (data: EditCustomerFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Cliente aggiornato con successo');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto'>
      <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 max-w-2xl w-full mx-4 my-8 shadow-xl max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
            Modifica Cliente
          </h3>
          <button
            onClick={onClose}
            className='p-2 rounded-lg hover:bg-apple-light-gray dark:hover:bg-[var(--surface-active)] text-apple-dark dark:text-[var(--text-primary)] transition-colors'
            aria-label='Chiudi'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <form onSubmit={rhfHandleSubmit(onSubmit)}>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <FormField label='Nome' error={errors.firstName?.message} registerProps={register('firstName')} />
            <FormField label='Cognome' error={errors.lastName?.message} registerProps={register('lastName')} />
            <div className='sm:col-span-2'>
              <label className='text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1 block'>
                Tipo
              </label>
              <select
                {...register('customerType')}
                className='w-full h-10 px-3 rounded-lg border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] text-body text-apple-dark dark:text-[var(--text-primary)]'
              >
                <option value='PERSONA'>Persona Fisica</option>
                <option value='AZIENDA'>Azienda</option>
              </select>
              {errors.customerType && <p className='text-xs text-red-500 mt-1'>{errors.customerType.message}</p>}
            </div>
            <FormField label='Codice Fiscale' registerProps={register('codiceFiscale')} />
            <FormField label='Partita IVA' registerProps={register('partitaIva')} />
            <FormField label='Codice SDI' registerProps={register('sdiCode')} />
            <FormField label='PEC' error={errors.pecEmail?.message} registerProps={register('pecEmail')} />
            <FormField label='Telefono' registerProps={register('phone')} />
            <FormField label='Email' error={errors.email?.message} registerProps={register('email')} />
            <div className='sm:col-span-2'>
              <FormField label='Indirizzo' registerProps={register('address')} />
            </div>
            <FormField label='Città' registerProps={register('city')} />
            <FormField label='CAP' registerProps={register('postalCode')} />
            <FormField label='Provincia' registerProps={register('province')} />
            <FormField label='Lingua' registerProps={register('language')} />
            <FormField label='Canale preferito' registerProps={register('preferredContactChannel')} />
            <FormField label='Fonte acquisizione' registerProps={register('acquisitionSource')} />
            <div className='sm:col-span-2'>
              <label className='text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1 block'>
                Note
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className='w-full px-3 py-2 rounded-lg border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] text-body text-apple-dark dark:text-[var(--text-primary)] resize-none'
              />
            </div>
          </div>

          <div className='flex gap-3 justify-end mt-6'>
            <AppleButton variant='secondary' type='button' onClick={onClose}>
              Annulla
            </AppleButton>
            <AppleButton type='submit' loading={isSubmitting} disabled={isSubmitting}>
              Salva modifiche
            </AppleButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  error,
  registerProps,
}: {
  label: string;
  error?: string;
  registerProps: ReturnType<ReturnType<typeof useForm>['register']>;
}) {
  return (
    <div>
      <label className='text-sm font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1 block'>
        {label}
      </label>
      <Input
        {...registerProps}
        className='h-10 rounded-lg border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] text-sm'
      />
      {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
    </div>
  );
}
