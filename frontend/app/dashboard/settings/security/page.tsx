'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Shield,
  Smartphone,
  MessageSquare,
  ClipboardList,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { DeviceList } from '@/components/security/device-list';
import { RecoveryPhoneSetup } from '@/components/security/recovery-phone-setup';
import { SecurityActivityTimeline } from '@/components/security/security-activity-timeline';
import { SecuritySummaryCard } from '@/components/security/security-summary-card';

// ─── Types ───
interface Device {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  lastActivity: string;
  isTrusted: boolean;
  trustedUntil: string | null;
  isCurrent: boolean;
}

interface SecurityEvent {
  id: string;
  type: string;
  timestamp: string;
  location: string;
  os: string;
  browser: string;
  isTrustedDevice: boolean;
  details: string | null;
}

interface SecuritySummary {
  totalLogins: number;
  failedAttempts: number;
  activeDevices: number;
  periodDays: number;
}

interface RecoveryPhoneStatus {
  phone: string | null;
  isVerified: boolean;
  smsOtpEnabled: boolean;
}

// ─── Fetcher ───
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { data?: T } & T;
  return data.data ?? data;
}

// ─── Animation variants ───
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

// ─── Main Page ───
export default function SecuritySettingsPage(): React.ReactElement {
  // ─── Devices ───
  const {
    data: devicesData,
    isLoading: devicesLoading,
    mutate: mutateDevices,
  } = useSWR<Device[]>('/api/auth/devices', fetcher, {
    revalidateOnFocus: false,
  });

  // ─── Security Summary ───
  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useSWR<SecuritySummary>('/api/auth/security/summary', fetcher, {
    revalidateOnFocus: false,
  });

  // ─── Activity Log ───
  const [activityPage, setActivityPage] = useState(1);
  const {
    data: activityData,
    isLoading: activityLoading,
  } = useSWR<{ events: SecurityEvent[]; total: number; hasMore: boolean }>(
    `/api/auth/security/activity?page=${activityPage}&limit=10`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const [allEvents, setAllEvents] = useState<SecurityEvent[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Merge events from pages
  React.useEffect(() => {
    if (activityData?.events) {
      if (activityPage === 1) {
        setAllEvents(activityData.events);
      } else {
        setAllEvents((prev) => {
          const ids = new Set(prev.map((e) => e.id));
          const newEvents = activityData.events.filter((e) => !ids.has(e.id));
          return [...prev, ...newEvents];
        });
      }
      setIsLoadingMore(false);
    }
  }, [activityData, activityPage]);

  const handleLoadMore = useCallback((): void => {
    setIsLoadingMore(true);
    setActivityPage((p) => p + 1);
  }, []);

  // ─── Recovery Phone ───
  const {
    data: phoneStatus,
    isLoading: phoneLoading,
    mutate: mutatePhone,
  } = useSWR<RecoveryPhoneStatus>('/api/auth/recovery-phone', fetcher, {
    revalidateOnFocus: false,
  });

  // ─── SMS OTP Toggle ───
  const [smsToggleLoading, setSmsToggleLoading] = useState(false);

  const handleSmsOtpToggle = async (): Promise<void> => {
    if (!phoneStatus?.isVerified) {
      toast.error('Devi prima verificare un telefono di recupero');
      return;
    }
    setSmsToggleLoading(true);
    try {
      const res = await fetch('/api/auth/sms-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle: !phoneStatus.smsOtpEnabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      toast.success(
        phoneStatus.smsOtpEnabled
          ? 'Verifica SMS disattivata'
          : 'Verifica SMS attivata',
      );
      await mutatePhone();
    } catch {
      toast.error('Errore nel cambio impostazione SMS');
    } finally {
      setSmsToggleLoading(false);
    }
  };

  // ─── Device actions ───
  const handleTrustDevice = async (deviceId: string): Promise<void> => {
    const res = await fetch(`/api/auth/devices/${deviceId}/trust`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Trust failed');
  };

  const handleUntrustDevice = async (deviceId: string): Promise<void> => {
    const res = await fetch(`/api/auth/devices/${deviceId}/trust`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Untrust failed');
  };

  const handleUntrustAll = async (): Promise<void> => {
    const res = await fetch('/api/auth/devices/trust-all', {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Untrust all failed');
  };

  // ─── Phone actions ───
  const handleSetPhone = async (phone: string): Promise<void> => {
    const res = await fetch('/api/auth/recovery-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error('Set phone failed');
  };

  const handleVerifyPhone = async (code: string): Promise<void> => {
    const res = await fetch('/api/auth/recovery-phone/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error('Verify failed');
  };

  const handleRemovePhone = async (): Promise<void> => {
    const res = await fetch('/api/auth/recovery-phone', {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Remove phone failed');
  };

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex items-center gap-3'>
            <Link
              href='/dashboard/settings'
              className='inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)]'
              aria-label='Torna alle impostazioni'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Sicurezza
              </h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Gestisci dispositivi, verifica SMS e attivita del tuo account
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.div
        className='p-4 sm:p-8 max-w-3xl mx-auto space-y-6'
        variants={containerVariants}
        initial='hidden'
        animate='visible'
      >
        {/* Section 1: Dispositivi Fidati */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-[var(--status-success)]/10 flex items-center justify-center'>
                  <Shield className='h-5 w-5 text-[var(--status-success)]' />
                </div>
                <div>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Dispositivi fidati
                  </h2>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    I dispositivi fidati saltano la verifica 2FA
                  </p>
                </div>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <DeviceList
                devices={devicesData || []}
                isLoading={devicesLoading}
                onTrust={handleTrustDevice}
                onUntrust={handleUntrustDevice}
                onUntrustAll={handleUntrustAll}
                onRefresh={() => void mutateDevices()}
              />
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Section 2: Telefono di Recupero */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                  <Smartphone className='h-5 w-5 text-[var(--brand)]' />
                </div>
                <div>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Telefono di recupero
                  </h2>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Usato come ultimo metodo per recuperare l&apos;accesso al tuo account
                  </p>
                </div>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {phoneLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin text-[var(--brand)]' />
                </div>
              ) : (
                <RecoveryPhoneSetup
                  currentPhone={phoneStatus?.phone || null}
                  isVerified={phoneStatus?.isVerified || false}
                  onSetPhone={handleSetPhone}
                  onVerifyPhone={handleVerifyPhone}
                  onRemovePhone={handleRemovePhone}
                  onRefresh={() => void mutatePhone()}
                />
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Section 3: Verifica SMS */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-[var(--status-warning)]/10 flex items-center justify-center'>
                  <MessageSquare className='h-5 w-5 text-[var(--status-warning)]' />
                </div>
                <div>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Verifica SMS
                  </h2>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Ricevi un codice via SMS quando accedi da un dispositivo non fidato
                  </p>
                </div>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-4'>
                <div className='flex items-start gap-2 rounded-xl bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/10 px-4 py-3'>
                  <AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]' />
                  <p className='text-footnote text-[var(--status-warning)]'>
                    Meno sicuro dell&apos;app authenticator. Consigliato solo come fallback.
                  </p>
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {phoneStatus?.smsOtpEnabled ? 'Attiva' : 'Disattiva'}
                    </p>
                    <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      {phoneStatus?.isVerified
                        ? 'Telefono di recupero verificato'
                        : 'Richiede un telefono di recupero verificato'}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={handleSmsOtpToggle}
                    disabled={smsToggleLoading || phoneLoading}
                    className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] items-center rounded-full transition-colors focus:outline-none ${
                      phoneStatus?.smsOtpEnabled
                        ? 'bg-[var(--status-success)]'
                        : 'bg-apple-border dark:bg-[var(--border-default)]'
                    } disabled:opacity-50`}
                    role='switch'
                    aria-checked={phoneStatus?.smsOtpEnabled || false}
                    aria-label='Attiva verifica SMS'
                  >
                    {smsToggleLoading ? (
                      <span className='absolute inset-0 flex items-center justify-center'>
                        <Loader2 className='h-4 w-4 animate-spin text-[var(--text-on-brand)]' />
                      </span>
                    ) : (
                      <span
                        className={`inline-block h-6 w-6 rounded-full bg-[var(--surface-secondary)] shadow-lg transition-transform ${
                          phoneStatus?.smsOtpEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Section 4: Attivita di Sicurezza */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                  <ClipboardList className='h-5 w-5 text-[var(--brand)]' />
                </div>
                <div>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Attivita di sicurezza
                  </h2>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Cronologia degli accessi e delle modifiche alla sicurezza
                  </p>
                </div>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-4'>
                <SecuritySummaryCard
                  summary={summaryData || null}
                  isLoading={summaryLoading}
                />
                <SecurityActivityTimeline
                  events={allEvents}
                  isLoading={activityLoading && activityPage === 1}
                  hasMore={activityData?.hasMore || false}
                  onLoadMore={handleLoadMore}
                  isLoadingMore={isLoadingMore}
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
