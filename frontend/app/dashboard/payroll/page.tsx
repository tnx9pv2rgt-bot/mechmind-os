'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Loader2,
  Euro,
  Clock,
  Award,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  Filter,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';

// =============================================================================
// Animations
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
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

// =============================================================================
// Types
// =============================================================================
interface PayrollEntry {
  id: string;
  technicianId: string;
  technicianName: string;
  payType: 'HOURLY' | 'SALARY' | 'COMMISSION';
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  bonus: number;
  totalPay: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
}

interface PayrollSummary {
  totalGross: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalBonus: number;
}

interface PayrollResponse {
  data: PayrollEntry[];
  summary?: PayrollSummary;
  meta?: { total: number };
}

// =============================================================================
// Status Config
// =============================================================================
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: {
    label: 'Bozza',
    color: 'text-apple-dark dark:text-[var(--text-primary)]',
    bg: 'bg-apple-light-gray dark:bg-[var(--surface-active)]',
  },
  APPROVED: {
    label: 'Approvato',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  PAID: {
    label: 'Pagato',
    color: 'text-apple-green dark:text-apple-green',
    bg: 'bg-green-100 dark:bg-green-900/40',
  },
};

const payTypeConfig: Record<string, string> = {
  HOURLY: 'Orario',
  SALARY: 'Stipendio',
  COMMISSION: 'Commissione',
};

// =============================================================================
// Months
// =============================================================================
const months = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

// =============================================================================
// Main Page
// =============================================================================
export default function PayrollPage(): React.ReactElement {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [calculatingAll, setCalculatingAll] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const { data, error, isLoading } = useSWR<PayrollResponse>(
    `/api/payroll?month=${selectedMonth + 1}&year=${selectedYear}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const entries = data?.data ?? [];
  const summary = data?.summary ?? { totalGross: 0, totalRegularHours: 0, totalOvertimeHours: 0, totalBonus: 0 };

  const handleCalculateAll = useCallback(async () => {
    setCalculatingAll(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'calculate-all', month: selectedMonth + 1, year: selectedYear }),
      });
      if (!res.ok) throw new Error('Errore calcolo');
      toast.success('Calcolo buste paga completato');
      await mutate(`/api/payroll?month=${selectedMonth + 1}&year=${selectedYear}`);
    } catch {
      toast.error('Errore durante il calcolo delle buste paga');
    } finally {
      setCalculatingAll(false);
    }
  }, [selectedMonth, selectedYear]);

  const handleApprove = useCallback(async (id: string) => {
    setApprovingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve', id }),
      });
      if (!res.ok) throw new Error('Errore approvazione');
      toast.success('Busta paga approvata');
      await mutate(`/api/payroll?month=${selectedMonth + 1}&year=${selectedYear}`);
    } catch {
      toast.error('Errore durante l\'approvazione');
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [selectedMonth, selectedYear]);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/payroll?month=${selectedMonth + 1}&year=${selectedYear}&format=csv`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Errore export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buste-paga-${months[selectedMonth]}-${selectedYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV completato');
    } catch {
      toast.error('Errore durante l\'export CSV');
    } finally {
      setExporting(false);
    }
  }, [selectedMonth, selectedYear]);

  const statCards = [
    {
      label: 'Totale lordo',
      value: formatCurrency(summary.totalGross),
      icon: Euro,
      color: 'bg-apple-green',
    },
    {
      label: 'Ore regolari',
      value: `${summary.totalRegularHours.toFixed(0)}h`,
      icon: Clock,
      color: 'bg-apple-blue',
    },
    {
      label: 'Ore straordinario',
      value: `${summary.totalOvertimeHours.toFixed(0)}h`,
      icon: Clock,
      color: 'bg-apple-orange',
    },
    {
      label: 'Bonus',
      value: formatCurrency(summary.totalBonus),
      icon: Award,
      color: 'bg-apple-purple',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Buste Paga</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestione retribuzioni del personale
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton
              variant='secondary'
              icon={exporting ? <Loader2 className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
              onClick={handleExportCSV}
              disabled={exporting || entries.length === 0}
            >
              Esporta CSV
            </AppleButton>
            <AppleButton
              icon={calculatingAll ? <Loader2 className='h-4 w-4 animate-spin' /> : <Calculator className='h-4 w-4' />}
              onClick={handleCalculateAll}
              disabled={calculatingAll}
              loading={calculatingAll}
            >
              Calcola tutto
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div
        className='p-4 sm:p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Period Selector */}
        <motion.div variants={statsCardVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1 sm:max-w-xs'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray pointer-events-none' />
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className='w-full h-10 pl-10 pr-4 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className='sm:max-w-[120px]'>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className='w-full h-10 px-4 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Stats */}
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-4 gap-bento'
          variants={containerVariants}
        >
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon className='h-5 w-5 text-white' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Payroll List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Elenco Buste Paga
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Errore nel caricamento dei dati
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => mutate(`/api/payroll?month=${selectedMonth + 1}&year=${selectedYear}`)}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : entries.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Nessuna busta paga per questo periodo
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                    Clicca &quot;Calcola tutto&quot; per generare le buste paga
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={handleCalculateAll}
                    loading={calculatingAll}
                  >
                    Calcola buste paga
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {entries.map((entry, index) => {
                    const st = statusConfig[entry.status] ?? statusConfig.DRAFT;
                    return (
                      <motion.div
                        key={entry.id}
                        className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-apple-purple/10 flex items-center justify-center flex-shrink-0'>
                            <FileText className='h-6 w-6 text-apple-purple' />
                          </div>
                          <div>
                            <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                              {entry.technicianName}
                            </p>
                            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                              {payTypeConfig[entry.payType] ?? entry.payType} &bull; {entry.regularHours}h reg. &bull; {entry.overtimeHours}h str.
                            </p>
                            {entry.bonus > 0 && (
                              <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                Bonus: {formatCurrency(entry.bonus)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <span
                            className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}
                          >
                            {st.label}
                          </span>
                          <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)] min-w-[100px] text-right'>
                            {formatCurrency(entry.totalPay)}
                          </p>
                          <div className='flex items-center gap-2'>
                            {entry.status === 'DRAFT' && (
                              <AppleButton
                                variant='secondary'
                                size='sm'
                                icon={approvingIds.has(entry.id) ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <CheckCircle2 className='h-3.5 w-3.5' />}
                                loading={approvingIds.has(entry.id)}
                                onClick={() => handleApprove(entry.id)}
                              >
                                Approva
                              </AppleButton>
                            )}
                            {entry.status === 'APPROVED' && (
                              <span className='text-footnote text-apple-green flex items-center gap-1'>
                                <CheckCircle2 className='h-3.5 w-3.5' />
                                Pronto
                              </span>
                            )}
                            {entry.status === 'PAID' && (
                              <span className='text-footnote text-apple-green flex items-center gap-1'>
                                <CheckCircle2 className='h-3.5 w-3.5' />
                                Pagato
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
