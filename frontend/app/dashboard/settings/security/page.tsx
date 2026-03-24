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
} from 'lucide-react';
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
const cardVariants = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

// ─── Section wrapper ───
function SectionCard({
  icon,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  delay?: number;
}): React.ReactElement {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={cardVariants}
      transition={{ delay }}
    >
      <div className="rounded-3xl border border-[#4e4e4e] bg-[#1a1a1a] overflow-hidden">
        <div className="border-b border-[#4e4e4e] px-6 py-5">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <p className="mt-0.5 text-xs text-[#888]">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </motion.div>
  );
}

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
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <header className="border-b border-[#4e4e4e] bg-[#1a1a1a]/80 backdrop-blur-xl">
        <div className="px-4 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#888] transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Torna alle impostazioni"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                Sicurezza
              </h1>
              <p className="mt-0.5 text-sm text-[#888]">
                Gestisci dispositivi, verifica SMS e attività del tuo account
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.div
        className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Section 1: Dispositivi Fidati */}
        <SectionCard
          icon={<Shield className="h-5 w-5 text-green-400" />}
          title="Dispositivi fidati"
          subtitle="I dispositivi fidati saltano la verifica 2FA"
          delay={0}
        >
          <DeviceList
            devices={devicesData || []}
            isLoading={devicesLoading}
            onTrust={handleTrustDevice}
            onUntrust={handleUntrustDevice}
            onUntrustAll={handleUntrustAll}
            onRefresh={() => void mutateDevices()}
          />
        </SectionCard>

        {/* Section 2: Telefono di Recupero */}
        <SectionCard
          icon={<Smartphone className="h-5 w-5 text-blue-400" />}
          title="Telefono di recupero"
          subtitle="Usato come ultimo metodo per recuperare l'accesso al tuo account"
          delay={0.1}
        >
          {phoneLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#888]" />
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
        </SectionCard>

        {/* Section 3: Verifica SMS */}
        <SectionCard
          icon={<MessageSquare className="h-5 w-5 text-yellow-400" />}
          title="Verifica SMS"
          subtitle="Ricevi un codice via SMS quando accedi da un dispositivo non fidato"
          delay={0.2}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p>Meno sicuro dell&apos;app authenticator. Consigliato solo come fallback.</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  {phoneStatus?.smsOtpEnabled ? 'Attiva' : 'Disattiva'}
                </p>
                <p className="mt-0.5 text-xs text-[#888]">
                  {phoneStatus?.isVerified
                    ? 'Telefono di recupero verificato'
                    : 'Richiede un telefono di recupero verificato'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSmsOtpToggle}
                disabled={smsToggleLoading || phoneLoading}
                className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] items-center rounded-full transition-colors focus:outline-none ${
                  phoneStatus?.smsOtpEnabled
                    ? 'bg-green-500'
                    : 'bg-[#4e4e4e]'
                } disabled:opacity-50`}
                role="switch"
                aria-checked={phoneStatus?.smsOtpEnabled || false}
                aria-label="Attiva verifica SMS"
              >
                {smsToggleLoading ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </span>
                ) : (
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow-lg transition-transform ${
                      phoneStatus?.smsOtpEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                )}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Section 4: Attività di Sicurezza */}
        <SectionCard
          icon={<ClipboardList className="h-5 w-5 text-purple-400" />}
          title="Attività di sicurezza"
          subtitle="Cronologia degli accessi e delle modifiche alla sicurezza"
          delay={0.3}
        >
          <div className="space-y-4">
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
        </SectionCard>
      </motion.div>
    </div>
  );
}
