'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Send,
  Megaphone,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Phone,
  Car,
  Wrench,
  Euro,
  Calendar,
  ChevronDown,
  RefreshCw,
  X,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';

// =============================================================================
// Animations
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

// =============================================================================
// Types
// =============================================================================
interface DeclinedService {
  id: string;
  customerName: string;
  customerPhone?: string;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  serviceName: string;
  estimatedCost: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  declinedAt: string;
  followUpStatus: 'PENDING' | 'SENT' | 'CONVERTED' | 'EXPIRED';
  followUpSentAt?: string;
  convertedBookingId?: string;
}

interface DeclinedServicesResponse {
  data: DeclinedService[];
  meta?: { total: number };
  stats?: {
    totalDeclined: number;
    pendingFollowUp: number;
    followUpsSent: number;
    conversionRate: number;
  };
}

// =============================================================================
// Severity Config
// =============================================================================
const severityConfig: Record<string, { label: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  CRITICAL: { label: 'Critico', colorClass: 'text-apple-red bg-red-100 dark:bg-red-900/40', icon: AlertCircle },
  WARNING: { label: 'Attenzione', colorClass: 'text-apple-orange bg-orange-100 dark:bg-orange-900/40', icon: AlertTriangle },
  INFO: { label: 'Info', colorClass: 'text-apple-blue bg-blue-100 dark:bg-blue-900/40', icon: Info },
};

const followUpStatusConfig: Record<string, { label: string; colorClass: string }> = {
  PENDING: { label: 'In attesa', colorClass: 'text-apple-orange bg-orange-100 dark:bg-orange-900/40' },
  SENT: { label: 'Inviato', colorClass: 'text-apple-blue bg-blue-100 dark:bg-blue-900/40' },
  CONVERTED: { label: 'Convertito', colorClass: 'text-apple-green bg-green-100 dark:bg-green-900/40' },
  EXPIRED: { label: 'Scaduto', colorClass: 'text-apple-gray bg-apple-light-gray dark:bg-[var(--surface-elevated)]' },
};

// =============================================================================
// Main Page
// =============================================================================
export default function FollowUpsPage(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (severityFilter) queryParams.set('severity', severityFilter);
  if (dateFrom) queryParams.set('dateFrom', dateFrom);
  if (dateTo) queryParams.set('dateTo', dateTo);
  const qs = queryParams.toString();

  const { data, error, isLoading } = useSWR<DeclinedServicesResponse>(
    `/api/declined-services${qs ? `?${qs}` : ''}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const items = data?.data ?? [];
  const stats = data?.stats ?? { totalDeclined: 0, pendingFollowUp: 0, followUpsSent: 0, conversionRate: 0 };

  const handleSendFollowUp = useCallback(async (id: string) => {
    setSendingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/declined-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'send-follow-up', id }),
      });
      if (!res.ok) throw new Error('Errore invio follow-up');
      toast.success('Follow-up inviato con successo');
      await mutate(`/api/declined-services${qs ? `?${qs}` : ''}`);
    } catch {
      toast.error('Errore durante l\'invio del follow-up');
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [qs]);

  const handleBulkCampaign = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('Seleziona almeno un servizio rifiutato');
      return;
    }
    try {
      const res = await fetch('/api/declined-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create-campaign', ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Errore creazione campagna');
      toast.success(`Campagna creata per ${selectedIds.size} servizi rifiutati`);
      setSelectedIds(new Set());
      await mutate(`/api/declined-services${qs ? `?${qs}` : ''}`);
    } catch {
      toast.error('Errore durante la creazione della campagna');
    }
  }, [selectedIds, qs]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  }, [items, selectedIds.size]);

  const inputClassName = 'w-full rounded-xl border border-apple-border/20 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] px-3 py-2.5 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue min-h-[44px]';

  const statCards = [
    { label: 'Servizi rifiutati', value: stats.totalDeclined, icon: Wrench, color: 'bg-apple-red' },
    { label: 'In attesa follow-up', value: stats.pendingFollowUp, icon: Clock, color: 'bg-apple-orange' },
    { label: 'Follow-up inviati', value: stats.followUpsSent, icon: Send, color: 'bg-apple-blue' },
    { label: 'Tasso conversione', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'bg-apple-green' },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppleButton
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => window.history.back()}
            >
              Marketing
            </AppleButton>
            <div>
              <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Follow-up Servizi Rifiutati</h1>
              <p className="text-body text-apple-gray dark:text-[var(--text-secondary)] mt-1">Gestisci i follow-up per i servizi declinati dai clienti</p>
            </div>
          </div>
          {selectedIds.size > 0 && (
            <AppleButton
              onClick={handleBulkCampaign}
              icon={<Megaphone className="h-4 w-4" />}
            >
              Crea campagna ({selectedIds.size})
            </AppleButton>
          )}
        </div>
      </header>

      <motion.div className="p-8 space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        {/* Stats */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-bento" variants={containerVariants}>
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={itemVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray" />
                  <Input
                    type="text"
                    placeholder="Cerca cliente o veicolo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <AppleButton
                  variant={showFilters ? 'secondary' : 'ghost'}
                  onClick={() => setShowFilters(!showFilters)}
                  icon={<Filter className="h-4 w-4" />}
                >
                  Filtri
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </AppleButton>
              </div>

              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row gap-3 mt-4 p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]"
                >
                  <div className="flex-1">
                    <label className="text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1 block">Severita</label>
                    <select
                      value={severityFilter}
                      onChange={e => setSeverityFilter(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Tutte</option>
                      <option value="CRITICAL">Critico</option>
                      <option value="WARNING">Attenzione</option>
                      <option value="INFO">Info</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1 block">Data da</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClassName} />
                  </div>
                  <div className="flex-1">
                    <label className="text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-1 block">Data a</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClassName} />
                  </div>
                  <div className="flex items-end">
                    <AppleButton
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSeverityFilter(''); setDateFrom(''); setDateTo(''); }}
                      icon={<X className="h-3 w-3" />}
                    >
                      Pulisci
                    </AppleButton>
                  </div>
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
            </div>
          ) : error ? (
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <AlertCircle className="h-12 w-12 text-apple-red/40" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">Errore nel caricamento dei dati</p>
                  <AppleButton
                    variant="ghost"
                    onClick={() => mutate(`/api/declined-services${qs ? `?${qs}` : ''}`)}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    Riprova
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          ) : items.length === 0 ? (
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <CheckCircle2 className="h-12 w-12 text-apple-green/40" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">Nessun servizio rifiutato trovato</p>
                  <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">Tutti i servizi sono stati accettati o gestiti</p>
                </div>
              </AppleCardContent>
            </AppleCard>
          ) : (
            <AppleCard hover={false}>
              <AppleCardContent>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-apple-border/20 dark:border-[var(--border-default)]">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === items.length && items.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Cliente</th>
                        <th className="px-4 py-3 text-left text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Veicolo</th>
                        <th className="px-4 py-3 text-left text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Servizio</th>
                        <th className="px-4 py-3 text-right text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Costo stimato</th>
                        <th className="px-4 py-3 text-center text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Severita</th>
                        <th className="px-4 py-3 text-left text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Data rifiuto</th>
                        <th className="px-4 py-3 text-center text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Stato</th>
                        <th className="px-4 py-3 text-right text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const sev = severityConfig[item.severity] ?? severityConfig.INFO;
                        const SevIcon = sev.icon;
                        const fStatus = followUpStatusConfig[item.followUpStatus] ?? followUpStatusConfig.PENDING;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-apple-border/10 dark:border-[var(--border-default)]/50 last:border-b-0 hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="w-4 h-4 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-apple-gray" />
                                <div>
                                  <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">{item.customerName}</p>
                                  {item.customerPhone && (
                                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{item.customerPhone}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Car className="w-3.5 h-3.5 flex-shrink-0 text-apple-gray" />
                                <div>
                                  <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">{item.vehiclePlate}</p>
                                  {(item.vehicleBrand || item.vehicleModel) && (
                                    <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{[item.vehicleBrand, item.vehicleModel].filter(Boolean).join(' ')}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-body text-apple-dark dark:text-[var(--text-primary)]">{item.serviceName}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">
                                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(item.estimatedCost)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-footnote font-semibold ${sev.colorClass}`}>
                                <SevIcon className="w-3 h-3" />
                                {sev.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                                {new Date(item.declinedAt).toLocaleDateString('it-IT')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.followUpStatus === 'CONVERTED' && item.convertedBookingId ? (
                                <Link
                                  href={`/dashboard/bookings?id=${item.convertedBookingId}`}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-footnote font-semibold ${followUpStatusConfig.CONVERTED.colorClass} hover:opacity-80 transition-opacity`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Convertito
                                </Link>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-footnote font-semibold ${fStatus.colorClass}`}>
                                  {fStatus.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.followUpStatus === 'PENDING' && (
                                <AppleButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSendFollowUp(item.id)}
                                  disabled={sendingIds.has(item.id)}
                                  loading={sendingIds.has(item.id)}
                                  icon={<Send className="h-3 w-3" />}
                                >
                                  Invia follow-up
                                </AppleButton>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {items.map(item => {
                    const sev = severityConfig[item.severity] ?? severityConfig.INFO;
                    const SevIcon = sev.icon;
                    const fStatus = followUpStatusConfig[item.followUpStatus] ?? followUpStatusConfig.PENDING;
                    return (
                      <div key={item.id} className="p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              className="w-4 h-4 rounded mt-0.5"
                            />
                            <div>
                              <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">{item.customerName}</p>
                              <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{item.vehiclePlate} - {item.serviceName}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-footnote font-semibold ${sev.colorClass}`}>
                            <SevIcon className="w-3 h-3" />
                            {sev.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-footnote text-apple-gray dark:text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(item.estimatedCost)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.declinedAt).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.followUpStatus === 'CONVERTED' && item.convertedBookingId ? (
                              <Link
                                href={`/dashboard/bookings?id=${item.convertedBookingId}`}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-footnote font-semibold ${followUpStatusConfig.CONVERTED.colorClass}`}
                              >
                                <CheckCircle2 className="w-3 h-3" /> Convertito
                              </Link>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-footnote font-semibold ${fStatus.colorClass}`}>
                                {fStatus.label}
                              </span>
                            )}
                            {item.followUpStatus === 'PENDING' && (
                              <AppleButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSendFollowUp(item.id)}
                                disabled={sendingIds.has(item.id)}
                                loading={sendingIds.has(item.id)}
                                icon={<Send className="h-4 w-4" />}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AppleCardContent>
            </AppleCard>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
