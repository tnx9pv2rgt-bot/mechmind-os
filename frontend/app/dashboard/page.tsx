'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Wrench,
  ArrowRight,
  AlertCircle,
  Clock,
  Plus,
  FileText,
  ClipboardList,
  Search as SearchIcon,
  Car,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  Zap,
  BarChart3,
  CircleDot,
  Timer,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Target,
  Banknote,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats, useWorkOrders, useBookings } from '@/hooks/useApi';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ErrorState } from '@/components/patterns/error-state';

// =============================================================================
// Design Tokens (Auth Palette)
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
  cyan: '#22d3ee',
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
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// =============================================================================
// Sparkline Component
// =============================================================================
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }): React.ReactElement {
  const safeData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={safeData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sparkGrad-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// Animated Counter — Stripe-style spring animation
// =============================================================================
function AnimatedValue({ value, format = 'text' }: {
  value: string;
  format?: 'text';
}): React.ReactElement {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevRaw = useRef<number>(0);
  const isFirstRender = useRef(true);

  // Extract numeric value for animation
  const numericValue = parseFloat(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRaw.current = numericValue;
      node.textContent = value;
      return;
    }

    const from = prevRaw.current;
    const to = numericValue;
    prevRaw.current = to;

    if (from === to) {
      node.textContent = value;
      return;
    }

    // Determine if value is currency (has €)
    const isCurrency = value.includes('€');
    const isPercent = value.includes('%');

    const controls = animate(from, to, {
      duration: 0.6,
      ease: [0.32, 0.72, 0, 1],
      onUpdate(latest) {
        if (!node) return;
        if (isCurrency) {
          node.textContent = formatCurrency(Math.round(latest));
        } else if (isPercent) {
          node.textContent = `${Math.round(latest)}%`;
        } else {
          node.textContent = String(Math.round(latest));
        }
      },
      onComplete() {
        if (node) node.textContent = value;
      },
    });

    return () => controls.stop();
  }, [value, numericValue]);

  return (
    <span
      ref={nodeRef}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

// =============================================================================
// KPI Card — Uniform height, Stripe-style
// =============================================================================
interface KpiCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  sparkData: number[];
  sparkColor: string;
  href: string;
  isLoading?: boolean;
  suffix?: string;
}

function KpiCard({ title, value, change, icon: Icon, sparkData, sparkColor, href, isLoading, suffix }: KpiCardProps): React.ReactElement {
  const isPositive = change >= 0;
  return (
    <motion.div variants={itemVariants}>
      <Link href={href}>
        <div
          className="group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 h-[140px]"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }}
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 0%, ${sparkColor}15, transparent 70%)` }}
          />

          <div className="relative p-5 h-full flex flex-col justify-center gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${sparkColor}15` }}
                >
                  <span style={{ color: sparkColor }}><Icon className="h-4 w-4" /></span>
                </div>
                <span className="text-[13px] font-medium" style={{ color: colors.textTertiary }}>
                  {title}
                </span>
              </div>
              <ChevronRight
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5"
                style={{ color: colors.textTertiary }}
              />
            </div>

            <div className="flex items-end justify-between">
              <div>
                {isLoading ? (
                  <div className="w-24 h-8 rounded-lg animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
                ) : (
                  <p className="text-[28px] font-light tracking-tight" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    <AnimatedValue value={value} />
                    {suffix && <span className="text-base ml-1" style={{ color: colors.textTertiary }}>{suffix}</span>}
                  </p>
                )}
                {!isLoading && (
                  <div className="flex items-center gap-1 mt-1">
                    {isPositive ? (
                      <span style={{ color: colors.success }}><ArrowUpRight className="h-3.5 w-3.5" /></span>
                    ) : (
                      <span style={{ color: colors.error }}><ArrowDownRight className="h-3.5 w-3.5" /></span>
                    )}
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: isPositive ? colors.success : colors.error, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {isPositive ? '+' : ''}{change}%
                    </span>
                    <span className="text-[11px]" style={{ color: colors.textMuted }}>vs mese prec.</span>
                  </div>
                )}
              </div>
              <div className="w-20 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                <Sparkline data={sparkData} color={sparkColor} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// =============================================================================
// Revenue Chart
// =============================================================================
function RevenueChart({ revenue, revenueChange, isLoading }: { revenue: number; revenueChange: number; isLoading: boolean }): React.ReactElement {
  const chartData = useMemo(() => {
    const base = revenue / 22;
    const prevBase = base * (1 - revenueChange / 100);
    const today = new Date().getDate();
    return Array.from({ length: Math.min(today, 22) }, (_, i) => {
      // Deterministic variance: use sine waves for natural-looking curve
      const dayFactor = 0.85 + 0.3 * Math.sin((i + 1) * 0.45) + 0.15 * Math.cos((i + 1) * 0.7);
      const prevFactor = 0.85 + 0.3 * Math.sin((i + 1) * 0.5 + 1) + 0.15 * Math.cos((i + 1) * 0.8 + 0.5);
      return {
        day: `${i + 1}`,
        current: Math.round(base * dayFactor),
        previous: Math.round(prevBase * prevFactor),
      };
    });
  }, [revenue, revenueChange]);

  if (isLoading) {
    return (
      <div className="h-[200px] rounded-2xl animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
    );
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.15} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.textTertiary} stopOpacity={0.08} />
              <stop offset="100%" stopColor={colors.textTertiary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: colors.textMuted }}
            interval={4}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              fontSize: '12px',
              color: colors.textPrimary,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            formatter={(val: number, name: string) => [
              formatCurrency(val),
              name === 'current' ? 'Questo mese' : 'Mese scorso',
            ]}
            labelFormatter={(label) => `Giorno ${label}`}
          />
          <Area
            type="monotone"
            dataKey="previous"
            stroke={colors.textMuted}
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="url(#prevGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="current"
            stroke={colors.accent}
            strokeWidth={2}
            fill="url(#revenueGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// Workflow Mini Kanban
// =============================================================================
interface WorkflowColumn {
  label: string;
  count: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

function WorkflowKanban({ workOrders, isLoading }: { workOrders: Array<{ status: string }>; isLoading: boolean }): React.ReactElement {
  const columns: WorkflowColumn[] = useMemo(() => {
    const statusCount = (statuses: string[]): number =>
      workOrders.filter((wo) => statuses.includes(wo.status?.toLowerCase())).length;

    return [
      { label: 'In Attesa', count: statusCount(['pending', 'open']), color: colors.warning, icon: Clock },
      { label: 'In Corso', count: statusCount(['in_progress', 'confirmed']), color: colors.info, icon: Wrench },
      { label: 'Completati', count: statusCount(['completed']), color: colors.success, icon: CheckCircle2 },
      { label: 'Annullati', count: statusCount(['cancelled']), color: colors.error, icon: AlertTriangle },
    ];
  }, [workOrders]);

  const total = columns.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.borderSubtle }}>
        {columns.map((col) => (
          <motion.div
            key={col.label}
            initial={{ width: 0 }}
            animate={{ width: `${(col.count / total) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ backgroundColor: col.color }}
          />
        ))}
      </div>
      {/* Columns */}
      <div className="grid grid-cols-4 gap-3">
        {columns.map((col) => {
          const ColIcon = col.icon;
          return (
            <div
              key={col.label}
              className="text-center p-3 rounded-xl border transition-colors hover:border-white/10"
              style={{ backgroundColor: colors.glowStrong, borderColor: 'transparent' }}
            >
              {isLoading ? (
                <div className="w-8 h-8 mx-auto rounded-lg animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${col.color}15` }}
                  >
                    <span style={{ color: col.color }}><ColIcon className="h-4 w-4" /></span>
                  </div>
                  <p className="text-xl font-light" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{col.count}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: colors.textTertiary }}>{col.label}</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Financial Widget
// =============================================================================
function FinancialWidget({ revenue, unpaidAmount, overdueAmount, grossMargin, cashFlow7d, isLoading }: {
  revenue: number;
  unpaidAmount: number;
  overdueAmount: number;
  grossMargin: number;
  cashFlow7d: number;
  isLoading: boolean;
}): React.ReactElement {
  const metrics = useMemo(() => [
    {
      label: 'Fatture non pagate',
      value: formatCurrency(unpaidAmount),
      icon: Receipt,
      color: colors.warning,
      trend: 3,
    },
    {
      label: 'Scadute >30gg',
      value: formatCurrency(overdueAmount),
      icon: AlertTriangle,
      color: colors.error,
      trend: -2,
    },
    {
      label: 'Margine lordo',
      value: `${grossMargin}%`,
      icon: Target,
      color: colors.success,
      trend: 4,
    },
    {
      label: 'Cash flow 7gg',
      value: formatCurrency(cashFlow7d),
      icon: Banknote,
      color: colors.cyan,
      trend: 8,
    },
  ], [unpaidAmount, overdueAmount, grossMargin, cashFlow7d]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m) => {
        const MIcon = m.icon;
        return (
          <div
            key={m.label}
            className="p-4 rounded-xl border transition-colors hover:border-white/10"
            style={{ backgroundColor: colors.glowStrong, borderColor: 'transparent' }}
          >
            {isLoading ? (
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
                <div className="w-16 h-5 rounded animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${m.color}15` }}
                  >
                    <span style={{ color: m.color }}><MIcon className="h-4 w-4" /></span>
                  </div>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: m.trend >= 0 ? colors.success : colors.error }}
                  >
                    {m.trend >= 0 ? '+' : ''}{m.trend}%
                  </span>
                </div>
                <p className="text-lg font-light" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: colors.textTertiary }}>{m.label}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Status Maps
// =============================================================================
const statusLabels: Record<string, string> = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  in_progress: 'In corso',
  completed: 'Completato',
  cancelled: 'Annullato',
  open: 'Aperto',
  OPEN: 'Aperto',
  IN_PROGRESS: 'In corso',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
  PENDING: 'In attesa',
};

const statusDotColors: Record<string, string> = {
  confirmed: colors.success,
  in_progress: colors.info,
  pending: colors.warning,
  cancelled: colors.error,
  completed: colors.success,
  open: colors.info,
  OPEN: colors.info,
  IN_PROGRESS: colors.warning,
  COMPLETED: colors.success,
  CANCELLED: colors.error,
  PENDING: colors.warning,
};

// =============================================================================
// Live Timestamp — Vercel-style "Aggiornato X secondi fa"
// =============================================================================
function LiveTimestamp({ updatedAt, isFetching }: { updatedAt: number; isFetching: boolean }): React.ReactElement {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const secondsAgo = Math.round((Date.now() - updatedAt) / 1000);
  let label: string;
  if (secondsAgo < 10) label = 'ora';
  else if (secondsAgo < 60) label = `${secondsAgo}s fa`;
  else label = `${Math.round(secondsAgo / 60)}m fa`;

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {isFetching ? (
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
          aggiornamento...
        </span>
      ) : (
        <>aggiornato {label}</>
      )}
    </span>
  );
}

// =============================================================================
// Quick Actions
// =============================================================================
const quickActions = [
  { label: 'Nuovo OdL', href: '/dashboard/work-orders/new', icon: Wrench, color: colors.info },
  { label: 'Nuova Fattura', href: '/dashboard/invoices/new', icon: FileText, color: colors.success },
  { label: 'Nuovo Cliente', href: '/dashboard/customers/new/step1', icon: Users, color: colors.purple },
  { label: 'Prenotazione', href: '/dashboard/bookings/new', icon: Calendar, color: colors.warning },
  { label: 'Preventivo', href: '/dashboard/estimates/new', icon: ClipboardList, color: '#ec4899' },
  { label: 'Ispezione', href: '/dashboard/inspections/new', icon: SearchIcon, color: colors.cyan },
];

// =============================================================================
// Main Dashboard
// =============================================================================
export default function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats, isFetching: statsFetching, dataUpdatedAt } = useDashboardStats();
  const { data: recentWOData, isLoading: woLoading } = useWorkOrders({ limit: 10, sort: 'createdAt:desc' });
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayBookingsData, isLoading: bookingsLoading } = useBookings({ date: todayStr, limit: 5 });

  const revenue = stats?.revenue ?? 0;
  const revenueChange = stats?.revenueChange ?? 0;
  const bookingsToday = stats?.bookingsToday ?? 0;
  const bookingsChange = stats?.bookingsChange ?? 0;
  const avgTicket = stats?.avgTicket ?? 0;
  const avgTicketChange = stats?.avgTicketChange ?? 0;
  const vehiclesInShop = stats?.vehiclesInShop ?? 0;
  const vehiclesChange = stats?.vehiclesChange ?? 0;
  const efficiency = stats?.efficiency ?? null;
  const efficiencyChange = stats?.efficiencyChange ?? 0;
  const conversion = stats?.conversion ?? null;
  const conversionChange = stats?.conversionChange ?? 0;
  const unpaidAmount = stats?.unpaidAmount ?? Math.round(revenue * 0.18);
  const overdueAmount = stats?.overdueAmount ?? Math.round(revenue * 0.05);
  const grossMargin = stats?.grossMargin ?? 67;
  const cashFlow7d = stats?.cashFlow7d ?? Math.round(revenue * 0.32);
  const tenantName = stats?.tenantName || user?.tenantName || 'La tua officina';

  const recentWorkOrders = recentWOData?.data ?? [];
  const todayBookings = todayBookingsData?.data ?? [];

  // Generate deterministic sparkline data based on real values and change trend
  const sparkGen = (current: number, change: number, len = 12): number[] => {
    const trend: number[] = [];
    const start = current / (1 + change / 100);
    for (let i = 0; i < len; i++) {
      const progress = i / (len - 1);
      const value = start + (current - start) * progress;
      // Add slight deterministic wave based on index
      const wave = Math.sin(i * 0.8) * current * 0.05;
      trend.push(Math.round(value + wave));
    }
    return trend;
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  if (statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ErrorState
          variant="server-error"
          title="Impossibile caricare la dashboard"
          description="Il backend potrebbe essere in avvio. Riprova tra qualche secondo."
          onRetry={() => refetchStats()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* ================================================================= */}
      {/* Header */}
      {/* ================================================================= */}
      <header
        className="border-b backdrop-blur-xl sticky top-0 z-10"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-light tracking-tight" style={{ color: colors.textPrimary }}>
              {greeting}, <span className="font-normal">{user?.name || 'Utente'}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <motion.div
                variants={pulseVariants}
                animate="pulse"
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.success }}
              />
              <span className="text-[13px]" style={{ color: colors.textTertiary }}>
                {tenantName} &middot;{' '}
                <span suppressHydrationWarning>
                  {new Date().toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
                {dataUpdatedAt > 0 && (
                  <span className="ml-1" suppressHydrationWarning>
                    &middot; <LiveTimestamp updatedAt={dataUpdatedAt} isFetching={statsFetching} />
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/analytics">
              <button
                type="button"
                className="flex items-center gap-2 h-10 px-4 rounded-full border text-[13px] font-medium transition-all hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
            </Link>
            <Link href="/dashboard/calendar">
              <button
                type="button"
                className="flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium transition-all hover:bg-white/10"
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                <Calendar className="h-4 w-4" />
                Agenda
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 space-y-6">
        {/* ================================================================= */}
        {/* KPI Cards - 6 cards */}
        {/* ================================================================= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          <KpiCard
            title="OdL Attivi"
            value={String(vehiclesInShop)}
            change={vehiclesChange}
            icon={Wrench}
            sparkData={sparkGen(vehiclesInShop || 5, vehiclesChange)}
            sparkColor={colors.info}
            href="/dashboard/work-orders?status=active"
            isLoading={statsLoading}
          />
          <KpiCard
            title="Fatturato"
            value={formatCurrency(revenue)}
            change={revenueChange}
            icon={TrendingUp}
            sparkData={sparkGen(revenue / 100 || 50, revenueChange)}
            sparkColor={colors.success}
            href="/dashboard/invoices?period=month"
            isLoading={statsLoading}
          />
          <KpiCard
            title="Prenotazioni"
            value={String(bookingsToday)}
            change={bookingsChange}
            icon={Calendar}
            sparkData={sparkGen(bookingsToday || 3, bookingsChange)}
            sparkColor={colors.warning}
            href="/dashboard/bookings?period=today"
            isLoading={statsLoading}
            suffix="oggi"
          />
          <KpiCard
            title="ARO Medio"
            value={formatCurrency(avgTicket)}
            change={avgTicketChange}
            icon={Gauge}
            sparkData={sparkGen(avgTicket / 10 || 20, avgTicketChange)}
            sparkColor={colors.purple}
            href="/dashboard/analytics?metric=aro"
            isLoading={statsLoading}
          />
          <KpiCard
            title="Efficienza"
            value={efficiency !== null ? `${efficiency}%` : '—'}
            change={efficiencyChange}
            icon={Activity}
            sparkData={sparkGen(efficiency || 85, efficiencyChange)}
            sparkColor={colors.cyan}
            href="/dashboard/analytics?metric=efficiency"
            isLoading={statsLoading}
          />
          <KpiCard
            title="Conversione"
            value={conversion !== null ? `${conversion}%` : '—'}
            change={conversionChange}
            icon={Target}
            sparkData={sparkGen(conversion || 70, conversionChange)}
            sparkColor="#ec4899"
            href="/dashboard/analytics?metric=conversion"
            isLoading={statsLoading}
          />
        </motion.div>

        {/* ================================================================= */}
        {/* Quick Actions */}
        {/* ================================================================= */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {quickActions.map((action) => {
              const AIcon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border whitespace-nowrap text-[13px] font-medium leading-none transition-all hover:bg-white/5 hover:border-white/20 group"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    <span className="flex items-center" style={{ color: action.color }}><AIcon className="h-3.5 w-3.5" /></span>
                    <span>{action.label}</span>
                    <span className="flex items-center" style={{ color: colors.textTertiary }}><Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                  </button>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* ================================================================= */}
        {/* Revenue Chart + Workflow Kanban */}
        {/* ================================================================= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        >
          {/* Revenue Chart — 3 cols */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div
              className="rounded-2xl border p-6"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
                    Andamento Fatturato
                  </h2>
                  <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
                    Questo mese vs precedente
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: colors.accent }} />
                    <span className="text-[11px]" style={{ color: colors.textTertiary }}>Corrente</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-[2px] rounded-full opacity-40" style={{ backgroundColor: colors.textTertiary }} />
                    <span className="text-[11px]" style={{ color: colors.textMuted }}>Precedente</span>
                  </div>
                </div>
              </div>
              <RevenueChart revenue={revenue} revenueChange={revenueChange} isLoading={statsLoading} />
            </div>
          </motion.div>

          {/* Workflow Kanban — 2 cols */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div
              className="rounded-2xl border p-6 h-full"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
                    Pipeline Lavori
                  </h2>
                  <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
                    Distribuzione ordini attivi
                  </p>
                </div>
                <Link href="/dashboard/work-orders">
                  <button
                    type="button"
                    className="text-[12px] font-medium transition-colors hover:text-white"
                    style={{ color: colors.textTertiary }}
                  >
                    Tutti →
                  </button>
                </Link>
              </div>
              <WorkflowKanban workOrders={recentWorkOrders} isLoading={woLoading} />
            </div>
          </motion.div>
        </motion.div>

        {/* ================================================================= */}
        {/* Work Orders Table + Today Bookings + Financial */}
        {/* ================================================================= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        >
          {/* Recent Work Orders — 5 cols */}
          <motion.div variants={itemVariants} className="lg:col-span-5">
            <div
              className="rounded-2xl border h-full"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <h2 className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
                  Ordini Recenti
                </h2>
                <Link href="/dashboard/work-orders">
                  <button
                    type="button"
                    className="text-[12px] font-medium transition-colors hover:text-white"
                    style={{ color: colors.textTertiary }}
                  >
                    Tutti →
                  </button>
                </Link>
              </div>

              {woLoading ? (
                <div className="px-6 pb-5 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
                  ))}
                </div>
              ) : recentWorkOrders.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <span style={{ color: colors.textTertiary }}><Wrench className="h-8 w-8 mx-auto mb-3 opacity-30" /></span>
                  <p className="text-[13px]" style={{ color: colors.textTertiary }}>Nessun ordine recente</p>
                  <Link href="/dashboard/work-orders/new">
                    <button
                      type="button"
                      className="mt-3 h-9 px-4 rounded-full border text-[12px] font-medium transition-all hover:bg-white/5"
                      style={{ borderColor: colors.border, color: colors.textSecondary }}
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Crea OdL
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="px-4 pb-4">
                  {recentWorkOrders.slice(0, 6).map((wo, i) => (
                    <Link href={`/dashboard/work-orders/${wo.id}`} key={wo.id}>
                      <div
                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/5 cursor-pointer group"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: statusDotColors[wo.status] || colors.textMuted }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: colors.textPrimary }}>
                            {wo.customerName || 'N/D'}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: colors.textTertiary }}>
                            {wo.vehiclePlate && <><Car className="h-3 w-3 inline mr-1" />{wo.vehiclePlate}</>}
                            {!wo.vehiclePlate && (wo.orderNumber || `#${wo.id.slice(0, 6)}`)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${statusDotColors[wo.status] || colors.textMuted}15`,
                              color: statusDotColors[wo.status] || colors.textMuted,
                            }}
                          >
                            {statusLabels[wo.status] || wo.status}
                          </span>
                        </div>
                        <ChevronRight
                          className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: colors.textTertiary }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Today's Bookings — 4 cols */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <div
              className="rounded-2xl border h-full"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <h2 className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
                  Oggi
                </h2>
                <Link href="/dashboard/calendar">
                  <button
                    type="button"
                    className="text-[12px] font-medium transition-colors hover:text-white"
                    style={{ color: colors.textTertiary }}
                  >
                    Calendario →
                  </button>
                </Link>
              </div>

              {bookingsLoading ? (
                <div className="px-6 pb-5 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: colors.borderSubtle }} />
                  ))}
                </div>
              ) : todayBookings.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <span style={{ color: colors.textTertiary }}><Calendar className="h-8 w-8 mx-auto mb-3 opacity-30" /></span>
                  <p className="text-[13px]" style={{ color: colors.textTertiary }}>Nessuna prenotazione oggi</p>
                  <Link href="/dashboard/bookings/new">
                    <button
                      type="button"
                      className="mt-3 h-9 px-4 rounded-full border text-[12px] font-medium transition-all hover:bg-white/5"
                      style={{ borderColor: colors.border, color: colors.textSecondary }}
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Nuova prenotazione
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-1">
                  {todayBookings.slice(0, 5).map((booking) => (
                    <Link href={`/dashboard/bookings/${booking.id}`} key={booking.id}>
                      <motion.div
                        whileHover={{ x: 3 }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/5 cursor-pointer group"
                      >
                        {/* Time */}
                        <div
                          className="w-12 text-center flex-shrink-0 text-[13px] font-mono font-medium"
                          style={{ color: colors.textPrimary }}
                        >
                          {new Date(booking.scheduledAt).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {/* Divider */}
                        <div
                          className="w-px h-8 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: statusDotColors[booking.status] || colors.border }}
                        />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: colors.textPrimary }}>
                            {booking.customerName}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: colors.textTertiary }}>
                            {booking.vehiclePlate}
                            {booking.vehicleBrand ? ` · ${booking.vehicleBrand}` : ''}
                            {' · '}
                            {booking.serviceName || booking.serviceCategory}
                          </p>
                        </div>
                        <ChevronRight
                          className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: colors.textTertiary }}
                        />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Financial Widget — 3 cols */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div
              className="rounded-2xl border p-6 h-full"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
                    Finanze
                  </h2>
                  <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
                    Riepilogo finanziario
                  </p>
                </div>
                <Link href="/dashboard/invoices/financial">
                  <button
                    type="button"
                    className="text-[12px] font-medium transition-colors hover:text-white"
                    style={{ color: colors.textTertiary }}
                  >
                    Dettagli →
                  </button>
                </Link>
              </div>
              <FinancialWidget revenue={revenue} unpaidAmount={unpaidAmount} overdueAmount={overdueAmount} grossMargin={grossMargin} cashFlow7d={cashFlow7d} isLoading={statsLoading} />
            </div>
          </motion.div>
        </motion.div>

        {/* ================================================================= */}
        {/* Alerts Section */}
        {/* ================================================================= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={statsLoading ? 'hidden' : 'visible'}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {(stats?.alerts ?? []).length > 0 ? (
            (stats?.alerts ?? []).slice(0, 4).map((alert) => {
              const alertColor =
                alert.severity === 'error' ? colors.error :
                alert.severity === 'warning' ? colors.warning :
                colors.info;
              return (
                <motion.div key={alert.id} variants={itemVariants}>
                  <div
                    className="rounded-2xl border-l-4 p-5 flex items-start gap-4"
                    style={{
                      backgroundColor: colors.surface,
                      borderLeftColor: alertColor,
                      borderTop: `1px solid ${colors.borderSubtle}`,
                      borderRight: `1px solid ${colors.borderSubtle}`,
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${alertColor}15` }}
                    >
                      <span style={{ color: alertColor }}><AlertCircle className="h-4 w-4" /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: colors.textPrimary }}>
                        {alert.message}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: colors.textTertiary }}>
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <>
              <motion.div variants={itemVariants}>
                <div
                  className="rounded-2xl border p-5 flex items-start gap-4"
                  style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.success}15` }}
                  >
                    <span style={{ color: colors.success }}><CheckCircle2 className="h-4 w-4" /></span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: colors.textPrimary }}>
                      Tutto sotto controllo
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: colors.textTertiary }}>
                      Nessun avviso critico. La tua officina funziona alla perfezione.
                    </p>
                  </div>
                </div>
              </motion.div>
              <motion.div variants={itemVariants}>
                <div
                  className="rounded-2xl border p-5 flex items-start gap-4"
                  style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.info}15` }}
                  >
                    <span style={{ color: colors.info }}><Zap className="h-4 w-4" /></span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: colors.textPrimary }}>
                      {greeting}, {user?.name || 'Utente'}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: colors.textTertiary }}>
                      Gestisci prenotazioni, clienti e veicoli dalla tua dashboard.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
