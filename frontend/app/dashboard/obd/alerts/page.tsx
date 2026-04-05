'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Bell,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Save,
  Gauge,
  Thermometer,
  Zap,
  Activity,
} from 'lucide-react';

interface AlertRule {
  id: string;
  metric: string;
  operator: string;
  threshold: number;
  notificationChannels: string[];
  enabled: boolean;
  createdAt: string;
}

const alertSchema = z.object({
  metric: z.string().min(1, 'Seleziona una metrica'),
  operator: z.string().min(1, 'Seleziona un operatore'),
  threshold: z.coerce.number().min(0, 'Il valore deve essere positivo'),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
});

type AlertForm = z.infer<typeof alertSchema>;

const METRIC_OPTIONS = [
  { value: 'rpm', label: 'RPM Motore', icon: Gauge },
  { value: 'coolantTemp', label: 'Temperatura Motore', icon: Thermometer },
  { value: 'batteryVoltage', label: 'Tensione Batteria', icon: Zap },
  { value: 'engineLoad', label: 'Carico Motore', icon: Activity },
  { value: 'speed', label: 'Velocità', icon: Gauge },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: 'Maggiore di (>)' },
  { value: 'lt', label: 'Minore di (<)' },
  { value: 'gte', label: 'Maggiore o uguale (>=)' },
  { value: 'lte', label: 'Minore o uguale (<=)' },
  { value: 'eq', label: 'Uguale a (=)' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function OBDAlertsPage() {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: alertsData, error, isLoading, mutate } = useSWR<{ data?: AlertRule[] } | AlertRule[]>(
    '/api/dashboard/obd/alerts',
    fetcher
  );

  const alerts: AlertRule[] = (() => {
    if (!alertsData) return [];
    const list = (alertsData as { data?: AlertRule[] }).data || alertsData;
    return Array.isArray(list) ? list : [];
  })();

  const { register, handleSubmit, reset, formState: { errors: formErrors } } = useForm<AlertForm>({
    resolver: zodResolver(alertSchema),
    defaultValues: { metric: 'coolantTemp', operator: 'gt', notifyEmail: true },
  });

  const onSubmit = async (data: AlertForm) => {
    setSaving(true);
    const channels: string[] = [];
    if (data.notifyEmail) channels.push('email');
    if (data.notifySms) channels.push('sms');
    if (data.notifyPush) channels.push('push');

    try {
      const res = await fetch('/api/dashboard/obd/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: data.metric,
          operator: data.operator,
          threshold: data.threshold,
          notificationChannels: channels,
        }),
      });
      if (!res.ok) throw new Error('Errore nella creazione della regola');
      toast.success('Regola alert creata con successo');
      reset();
      setShowForm(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione');
    } finally {
      setSaving(false);
    }
  };

  const getMetricLabel = (metric: string): string => {
    return METRIC_OPTIONS.find(m => m.value === metric)?.label || metric;
  };

  const getOperatorLabel = (op: string): string => {
    return OPERATOR_OPTIONS.find(o => o.value === op)?.label || op;
  };

  return (
    <div>
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Diagnostica OBD', href: '/dashboard/obd' },
                { label: 'Regole Alert' },
              ]}
            />
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Regole Alert OBD</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Configura notifiche automatiche per valori anomali
            </p>
          </div>
          <AppleButton icon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(!showForm)}>
            Nuova Regola
          </AppleButton>
        </div>
      </header>

      <motion.div className='p-8 space-y-6 max-w-4xl mx-auto' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Create Form */}
        {showForm && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center justify-between'>
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Nuova Regola</h2>
                  <AppleButton variant='ghost' size='sm' onClick={() => setShowForm(false)} aria-label='Chiudi'>
                    <X className='h-5 w-5 text-apple-gray' />
                  </AppleButton>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                      <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'>Metrica</label>
                      <select
                        {...register('metric')}
                        className='w-full text-body px-3 py-2 rounded-xl border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        {METRIC_OPTIONS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'>Operatore</label>
                      <select
                        {...register('operator')}
                        className='w-full text-body px-3 py-2 rounded-xl border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        {OPERATOR_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'>Soglia</label>
                      <Input type='number' step='0.1' {...register('threshold')} placeholder='Es: 100' />
                      {formErrors.threshold && <p className='text-footnote text-apple-red mt-1'>{formErrors.threshold.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-3 block'>Canali di notifica</label>
                    <div className='flex gap-4'>
                      {[
                        { key: 'notifyEmail' as const, label: 'Email' },
                        { key: 'notifySms' as const, label: 'SMS' },
                        { key: 'notifyPush' as const, label: 'Push' },
                      ].map(ch => (
                        <label key={ch.key} className='flex items-center gap-2 cursor-pointer'>
                          <input
                            type='checkbox'
                            {...register(ch.key)}
                            className='w-4 h-4 rounded border-apple-border text-apple-blue focus:ring-apple-blue'
                          />
                          <span className='text-body text-apple-dark dark:text-[var(--text-primary)]'>{ch.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <AppleButton type='submit' icon={<Save className='h-4 w-4' />} loading={saving}>
                      Crea Regola
                    </AppleButton>
                  </div>
                </form>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Alerts List */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-2'>
                <Bell className='h-5 w-5 text-apple-orange' />
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Regole Configurate</h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>Impossibile caricare le regole</p>
                  <AppleButton variant='ghost' className='mt-4' onClick={() => mutate()}>Riprova</AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : alerts.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <div className='w-16 h-16 rounded-2xl bg-apple-orange/10 flex items-center justify-center mb-4'>
                    <Bell className='h-8 w-8 text-apple-orange/60' />
                  </div>
                  <p className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-1'>Nessuna regola alert</p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] max-w-sm mb-6'>
                    Crea regole per ricevere notifiche quando i valori OBD superano le soglie configurate.
                  </p>
                  <AppleButton icon={<Plus className='h-4 w-4' />} onClick={() => setShowForm(true)}>
                    Crea Regola
                  </AppleButton>
                </div>
              ) : (
                <div className='space-y-3'>
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] ${!alert.enabled ? 'opacity-50' : ''}`}
                    >
                      <div className='flex items-center gap-4'>
                        <div className='w-10 h-10 rounded-xl bg-apple-orange/10 flex items-center justify-center'>
                          <Bell className='h-5 w-5 text-apple-orange' />
                        </div>
                        <div>
                          <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                            {getMetricLabel(alert.metric)} {getOperatorLabel(alert.operator).split('(')[1]?.replace(')', '') || alert.operator} {alert.threshold}
                          </p>
                          <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                            Notifica via: {alert.notificationChannels.join(', ')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${
                        alert.enabled
                          ? 'bg-green-100 dark:bg-green-900/40 text-apple-green dark:text-green-300'
                          : 'bg-apple-light-gray dark:bg-[var(--surface-elevated)] text-apple-gray dark:text-[var(--text-secondary)]'
                      }`}>
                        {alert.enabled ? 'Attiva' : 'Disattivata'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
