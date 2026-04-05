'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Users,
  Car,
  HardDrive,
  ArrowRight,
  Crown,
  Building2,
  Zap,
  AlertTriangle,
  Mic,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SubscriptionInfo {
  plan: string;
  status: string;
  billingCycle: string;
  nextRenewal: string;
  price: number;
  usage: {
    users: { current: number; limit: number | null };
    vehicles: { current: number; limit: number | null };
    storage: { current: number; limit: number | null };
  };
  stripe?: {
    customerId?: string;
    subscriptionId?: string;
  };
}

interface ApiResponse {
  data?: SubscriptionInfo;
  plan?: string;
  status?: string;
  billingCycle?: string;
  nextRenewal?: string;
  price?: number;
  usage?: SubscriptionInfo['usage'];
  stripe?: SubscriptionInfo['stripe'];
}

const fetcher = (url: string): Promise<SubscriptionInfo> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore nel caricamento');
    const json: ApiResponse = await res.json();
    return (json.data || json) as SubscriptionInfo;
  });

const TIERS = [
  {
    id: 'SMALL',
    name: 'Starter',
    price: 39,
    cycle: '/mese',
    icon: Building2,
    color: 'from-emerald-500 to-teal-600',
    limits: { users: 5, vehicles: 500 },
    features: [
      'Fino a 5 utenti',
      'Ordini di lavoro illimitati',
      'Fatturazione elettronica',
      'CRM clienti (500)',
      'Prenotazioni online',
      'Gestione ricambi',
      '1 sede',
      'Supporto email',
    ],
    notIncluded: [
      'Multi-sede',
      'Analytics avanzati',
      'API access',
      'Assistente Vocale AI',
    ],
  },
  {
    id: 'MEDIUM',
    name: 'Pro',
    price: 89,
    cycle: '/mese',
    icon: Crown,
    color: 'from-blue-500 to-indigo-600',
    popular: true,
    limits: { users: 15, vehicles: 5000 },
    features: [
      'Tutto di Starter +',
      'Fino a 15 utenti',
      'Ispezioni digitali (DVI)',
      'Preventivi e conversione',
      'Multi-sede (fino a 3)',
      'Analytics avanzati',
      'Integrazioni OBD',
      'Branding personalizzato',
      'Supporto prioritario',
    ],
    notIncluded: [
      'Utenti illimitati',
      'White label',
      'Assistente Vocale AI',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 249,
    cycle: '/mese',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    limits: { users: -1, vehicles: -1 },
    features: [
      'Tutto di Pro +',
      'Utenti illimitati',
      'Veicoli illimitati',
      'Sedi illimitate',
      'API access completo',
      'White label',
      'Account manager dedicato',
      'Integrazioni personalizzate',
      'SLA 99.95% garantito',
    ],
    notIncluded: [],
  },
];

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

export default function SubscriptionPage() {
  const { data: subscription, isLoading, error } = useSWR<SubscriptionInfo>(
    '/api/dashboard/subscription',
    fetcher,
    { onError: () => toast.error('Errore nel caricamento dei dati abbonamento') }
  );
  const [processing, setProcessing] = useState(false);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'ENTERPRISE') {
      window.open('mailto:vendite@mechmind.it?subject=Richiesta Piano Enterprise', '_blank');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/dashboard/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const data: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Errore durante upgrade');
      }
      const data: { url?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.success('Piano aggiornato con successo');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante upgrade');
    } finally {
      setProcessing(false);
    }
  };

  const handleManagePortal = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      if (!res.ok) throw new Error('Errore apertura portale');
      const data: { url?: string } = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore apertura portale Stripe');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Attivo' },
      TRIAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Trial' },
      PAST_DUE: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Scaduto' },
      CANCELLED: { bg: 'bg-apple-light-gray dark:bg-[var(--surface-hover)]', text: 'text-apple-gray dark:text-[var(--text-secondary)]', label: 'Cancellato' },
      UNPAID: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Non pagato' },
    };
    const c = configs[status] || configs.ACTIVE;
    return <Badge className={`${c.bg} ${c.text} border-0`}>{c.label}</Badge>;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const usagePercent = (current: number, limit: number | null): number => {
    if (limit === null || limit <= 0) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
              Impossibile caricare i dati dell&apos;abbonamento. Riprova pi&uacute; tardi.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'FREE';

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Abbonamento</h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
                Gestisci il tuo piano e monitora l&apos;utilizzo
              </p>
            </div>
            <AppleButton
              variant='secondary'
              onClick={handleManagePortal}
              disabled={processing}
              icon={<CreditCard className='w-4 h-4' />}
            >
              Gestisci Abbonamento
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div className='p-4 sm:p-8 max-w-7xl mx-auto space-y-8' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Current Plan Card */}
        {subscription && (
          <motion.div variants={listItemVariants}>
            <AppleCard>
              <AppleCardHeader>
                <div className='flex items-center gap-3'>
                  <CreditCard className='h-5 w-5 text-apple-blue' />
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Piano Attuale
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                  <div className='flex items-center gap-4'>
                    <div className='w-14 h-14 bg-gradient-to-br from-apple-blue to-apple-purple rounded-2xl flex items-center justify-center'>
                      <Crown className='w-7 h-7 text-white' />
                    </div>
                    <div>
                      <div className='flex items-center gap-3'>
                        <h3 className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                          {TIERS.find((t) => t.id === currentPlan)?.name || currentPlan}
                        </h3>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                        {subscription.price != null && subscription.price > 0
                          ? `${subscription.price.toFixed(2).replace('.', ',')} /mese`
                          : 'Gratuito'}
                        {subscription.billingCycle === 'yearly' && ' (fatturazione annuale)'}
                      </p>
                    </div>
                  </div>
                  {subscription.nextRenewal && (
                    <div className='text-right'>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        Prossimo rinnovo
                      </p>
                      <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        {new Date(subscription.nextRenewal).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Usage Meters */}
        {subscription?.usage && (
          <motion.div variants={listItemVariants}>
            <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
              Utilizzo
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center'>
                      <Users className='w-5 h-5 text-blue-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Utenti</p>
                      <p className='text-title-3 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {subscription.usage.users.current} /{' '}
                        {subscription.usage.users.limit === null ? 'Illimitati' : subscription.usage.users.limit}
                      </p>
                    </div>
                  </div>
                  <Progress value={usagePercent(subscription.usage.users.current, subscription.usage.users.limit)} className='h-2' />
                </AppleCardContent>
              </AppleCard>

              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center'>
                      <Car className='w-5 h-5 text-green-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Veicoli</p>
                      <p className='text-title-3 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {subscription.usage.vehicles.current} /{' '}
                        {subscription.usage.vehicles.limit === null ? 'Illimitati' : subscription.usage.vehicles.limit}
                      </p>
                    </div>
                  </div>
                  <Progress value={usagePercent(subscription.usage.vehicles.current, subscription.usage.vehicles.limit)} className='h-2' />
                </AppleCardContent>
              </AppleCard>

              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center'>
                      <HardDrive className='w-5 h-5 text-purple-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Storage</p>
                      <p className='text-title-3 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {formatBytes(subscription.usage.storage.current)} /{' '}
                        {subscription.usage.storage.limit === null ? 'Illimitato' : formatBytes(subscription.usage.storage.limit)}
                      </p>
                    </div>
                  </div>
                  <Progress value={usagePercent(subscription.usage.storage.current, subscription.usage.storage.limit)} className='h-2' />
                </AppleCardContent>
              </AppleCard>
            </div>
          </motion.div>
        )}

        {/* Plan Comparison */}
        <motion.div variants={listItemVariants}>
          <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
            Confronto Piani
          </h3>
          <motion.div
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            variants={containerVariants}
            initial='hidden'
            animate='visible'
          >
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isCurrent = currentPlan === tier.id;
              const isHigher =
                TIERS.findIndex((t) => t.id === tier.id) >
                TIERS.findIndex((t) => t.id === currentPlan);

              return (
                <motion.div key={tier.id} variants={statsCardVariants}>
                  <AppleCard
                    className={`h-full flex flex-col relative ${
                      isCurrent ? 'ring-2 ring-apple-blue' : ''
                    } ${tier.popular ? 'ring-2 ring-apple-blue' : ''}`}
                  >
                    {isCurrent && (
                      <div className='bg-apple-blue text-white text-footnote font-bold text-center py-2 rounded-t-xl'>
                        Piano Attuale
                      </div>
                    )}
                    {tier.popular && !isCurrent && (
                      <div className='bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-footnote font-bold text-center py-2 rounded-t-xl'>
                        Consigliato
                      </div>
                    )}
                    <AppleCardHeader className='pb-2'>
                      <div className='flex items-center gap-3'>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                          <Icon className='w-5 h-5 text-white' />
                        </div>
                        <h4 className='text-title-3 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                          {tier.name}
                        </h4>
                      </div>
                    </AppleCardHeader>
                    <AppleCardContent className='flex-1 flex flex-col'>
                      {/* Price */}
                      <div className='mb-4'>
                        {tier.price === -1 ? (
                          <p className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                            Su misura
                          </p>
                        ) : tier.price === 0 ? (
                          <p className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                            Gratuito
                          </p>
                        ) : (
                          <div>
                            <span className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                              &euro;{tier.price}
                            </span>
                            <span className='text-apple-gray dark:text-[var(--text-secondary)]'>{tier.cycle}</span>
                          </div>
                        )}
                        <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                          {tier.limits.users === -1 ? 'Utenti illimitati' : `${tier.limits.users} utenti`},{' '}
                          {tier.limits.vehicles === -1 ? 'veicoli illimitati' : `${tier.limits.vehicles} veicoli`}
                        </p>
                      </div>

                      {/* Features */}
                      <div className='space-y-2 flex-1 mb-4'>
                        {tier.features.map((f) => (
                          <div key={f} className='flex items-start gap-2'>
                            <CheckCircle2 className='w-4 h-4 text-apple-green flex-shrink-0 mt-0.5' />
                            <span className='text-footnote text-apple-dark dark:text-[var(--text-primary)]'>{f}</span>
                          </div>
                        ))}
                        {tier.notIncluded?.map((f) => (
                          <div key={f} className='flex items-start gap-2'>
                            <XCircle className='w-4 h-4 text-apple-border dark:text-[var(--border-default)] flex-shrink-0 mt-0.5' />
                            <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{f}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <AppleButton
                        variant={isCurrent ? 'secondary' : 'primary'}
                        className='w-full min-h-[44px]'
                        onClick={() => handleUpgrade(tier.id)}
                        disabled={isCurrent || processing || (!isHigher && !isCurrent && tier.id !== 'ENTERPRISE')}
                      >
                        {isCurrent ? (
                          'Attivo'
                        ) : processing ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : tier.price === -1 ? (
                          <>
                            Contatta Vendite
                            <ArrowRight className='w-4 h-4 ml-2' />
                          </>
                        ) : isHigher ? (
                          'Upgrade'
                        ) : (
                          'Seleziona'
                        )}
                      </AppleButton>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
        {/* Voice AI Add-on */}
        <motion.div variants={listItemVariants}>
          <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
            Add-on Disponibili
          </h3>
          <AppleCard className='border border-apple-blue/20 bg-gradient-to-r from-apple-blue/5 to-purple-500/5 dark:from-apple-blue/10 dark:to-purple-500/10'>
            <AppleCardContent>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6'>
                <div className='flex items-start gap-4'>
                  <div className='w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center flex-shrink-0'>
                    <Mic className='w-7 h-7 text-white' />
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <h4 className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        Assistente Vocale AI
                      </h4>
                      <Badge className='bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-0'>
                        ElevenLabs
                      </Badge>
                    </div>
                    <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                      Rispondi alle chiamate con un assistente AI che parla italiano.
                      Prenota appuntamenti, verifica disponibilit&agrave; e invia conferme SMS automaticamente.
                    </p>
                    <div className='flex flex-wrap gap-4 mt-3 text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                      <span className='flex items-center gap-1'>
                        <CheckCircle2 className='w-4 h-4 text-apple-green' />
                        100 min inclusi
                      </span>
                      <span className='flex items-center gap-1'>
                        <CheckCircle2 className='w-4 h-4 text-apple-green' />
                        Voce italiana naturale
                      </span>
                      <span className='flex items-center gap-1'>
                        <CheckCircle2 className='w-4 h-4 text-apple-green' />
                        Prenotazione automatica
                      </span>
                    </div>
                  </div>
                </div>
                <div className='text-center sm:text-right flex-shrink-0'>
                  <div>
                    <span className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                      &euro;49
                    </span>
                    <span className='text-apple-gray dark:text-[var(--text-secondary)]'>/mese</span>
                  </div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                    poi &euro;0,40/min extra
                  </p>
                  <AppleButton
                    variant='primary'
                    className='mt-3 min-h-[44px]'
                    onClick={() => handleUpgrade('VOICE_ADDON')}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Attiva Voice AI'}
                  </AppleButton>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
