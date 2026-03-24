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
    id: 'FREE',
    name: 'Free',
    price: 0,
    cycle: '/mese',
    icon: Zap,
    color: 'from-slate-400 to-slate-500',
    limits: { users: 2, vehicles: 10 },
    features: [
      'Gestione clienti base',
      'Fino a 10 veicoli',
      '2 utenti',
      'Prenotazioni online',
      'Supporto community',
    ],
    notIncluded: [
      'Fatturazione elettronica',
      'Ispezioni digitali',
      'Analisi avanzate',
      'Supporto prioritario',
      'API access',
    ],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    cycle: '/mese',
    icon: Building2,
    color: 'from-emerald-500 to-teal-600',
    limits: { users: 5, vehicles: 50 },
    features: [
      'Tutto del piano Free',
      'Fino a 50 veicoli',
      '5 utenti',
      'Fatturazione elettronica',
      'Ispezioni digitali',
      'Gestione ricambi',
      'Supporto email',
    ],
    notIncluded: [
      'Multi-sede',
      'Analisi avanzate',
      'API access',
      'Supporto prioritario',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 79,
    cycle: '/mese',
    icon: Crown,
    color: 'from-blue-500 to-indigo-600',
    popular: true,
    limits: { users: 20, vehicles: 500 },
    features: [
      'Tutto del piano Starter',
      'Fino a 500 veicoli',
      '20 utenti',
      'Multi-sede (fino a 3)',
      'Analisi avanzate',
      'API access',
      'Branding personalizzato',
      'Supporto prioritario',
      'Integrazioni OBD',
    ],
    notIncluded: ['Utenti illimitati', 'White label', 'Account manager dedicato'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: -1,
    cycle: '',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    limits: { users: -1, vehicles: -1 },
    features: [
      'Tutto del piano Professional',
      'Utenti illimitati',
      'Veicoli illimitati',
      'Sedi illimitate',
      'White label',
      'AI Assistant add-on',
      'Account manager dedicato',
      'Integrazioni personalizzate',
      'SLA garantito',
      'Verifica blockchain',
    ],
    notIncluded: [],
  },
];

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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
      window.open('mailto:vendite@mechmind.io?subject=Richiesta Piano Enterprise', '_blank');
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
      CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', label: 'Cancellato' },
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
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[#636366]'>
              Impossibile caricare i dati dell&apos;abbonamento. Riprova pi&uacute; tardi.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'FREE';

  return (
    <div className='min-h-screen'>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Abbonamento</h1>
              <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
                Gestisci il tuo piano e monitora l&apos;utilizzo
              </p>
            </div>
            <AppleButton
              variant='secondary'
              onClick={handleManagePortal}
              disabled={processing}
            >
              <CreditCard className='w-4 h-4 mr-2' />
              Gestisci Abbonamento
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-7xl mx-auto space-y-8'>
        {/* Current Plan Card */}
        {subscription && (
          <motion.div initial='initial' animate='animate' variants={fadeIn}>
            <AppleCard>
              <AppleCardHeader>
                <div className='flex items-center gap-3'>
                  <CreditCard className='h-5 w-5 text-apple-blue' />
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
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
                        <h3 className='text-title-1 font-bold text-apple-dark dark:text-[#ececec]'>
                          {TIERS.find((t) => t.id === currentPlan)?.name || currentPlan}
                        </h3>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <p className='text-body text-apple-gray dark:text-[#636366] mt-1'>
                        {subscription.price != null && subscription.price > 0
                          ? `${subscription.price.toFixed(2).replace('.', ',')} /mese`
                          : 'Gratuito'}
                        {subscription.billingCycle === 'yearly' && ' (fatturazione annuale)'}
                      </p>
                    </div>
                  </div>
                  {subscription.nextRenewal && (
                    <div className='text-right'>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                        Prossimo rinnovo
                      </p>
                      <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4'>
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
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Utenti</p>
                      <p className='text-title-3 font-bold text-apple-dark dark:text-[#ececec]'>
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
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Veicoli</p>
                      <p className='text-title-3 font-bold text-apple-dark dark:text-[#ececec]'>
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
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Storage</p>
                      <p className='text-title-3 font-bold text-apple-dark dark:text-[#ececec]'>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-4'>
            Confronto Piani
          </h3>
          <motion.div
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
            variants={staggerContainer}
            initial='initial'
            animate='animate'
          >
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isCurrent = currentPlan === tier.id;
              const isHigher =
                TIERS.findIndex((t) => t.id === tier.id) >
                TIERS.findIndex((t) => t.id === currentPlan);

              return (
                <motion.div key={tier.id} variants={staggerItem}>
                  <AppleCard
                    className={`h-full flex flex-col relative ${
                      isCurrent ? 'ring-2 ring-apple-blue' : ''
                    } ${tier.popular ? 'ring-2 ring-apple-blue' : ''}`}
                  >
                    {isCurrent && (
                      <div className='bg-apple-blue text-white text-xs font-bold uppercase tracking-wider text-center py-2 rounded-t-xl'>
                        Piano Attuale
                      </div>
                    )}
                    {tier.popular && !isCurrent && (
                      <div className='bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider text-center py-2 rounded-t-xl'>
                        Consigliato
                      </div>
                    )}
                    <AppleCardHeader className='pb-2'>
                      <div className='flex items-center gap-3'>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                          <Icon className='w-5 h-5 text-white' />
                        </div>
                        <h4 className='text-title-3 font-bold text-apple-dark dark:text-[#ececec]'>
                          {tier.name}
                        </h4>
                      </div>
                    </AppleCardHeader>
                    <AppleCardContent className='flex-1 flex flex-col'>
                      {/* Price */}
                      <div className='mb-4'>
                        {tier.price === -1 ? (
                          <p className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                            Su misura
                          </p>
                        ) : tier.price === 0 ? (
                          <p className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                            Gratuito
                          </p>
                        ) : (
                          <div>
                            <span className='text-3xl font-bold text-apple-dark dark:text-[#ececec]'>
                              &euro;{tier.price}
                            </span>
                            <span className='text-apple-gray dark:text-[#636366]'>{tier.cycle}</span>
                          </div>
                        )}
                        <p className='text-footnote text-apple-gray dark:text-[#636366] mt-1'>
                          {tier.limits.users === -1 ? 'Utenti illimitati' : `${tier.limits.users} utenti`},{' '}
                          {tier.limits.vehicles === -1 ? 'veicoli illimitati' : `${tier.limits.vehicles} veicoli`}
                        </p>
                      </div>

                      {/* Features */}
                      <div className='space-y-2 flex-1 mb-4'>
                        {tier.features.map((f) => (
                          <div key={f} className='flex items-start gap-2'>
                            <CheckCircle2 className='w-4 h-4 text-green-500 flex-shrink-0 mt-0.5' />
                            <span className='text-sm text-apple-dark dark:text-[#ececec]'>{f}</span>
                          </div>
                        ))}
                        {tier.notIncluded?.map((f) => (
                          <div key={f} className='flex items-start gap-2'>
                            <XCircle className='w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5' />
                            <span className='text-sm text-gray-400 dark:text-gray-500'>{f}</span>
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
      </div>
    </div>
  );
}
