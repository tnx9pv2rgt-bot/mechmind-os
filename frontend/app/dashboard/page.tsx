'use client'

import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import {
  Calendar,
  TrendingUp,
  Users,
  Wrench,
  Car,
  ArrowRight,
  Activity,
  Package,
  ClipboardCheck,
  AlertCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useApi'

// CLS-safe variants: opacity-only transitions, no y/scale shift
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0 }
  }
}

const cardVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
  }
}

interface KpiCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  href: string
  isLoading?: boolean
}

function KpiCard({ title, value, change, trend, icon: Icon, gradient, href, isLoading }: KpiCardProps) {
  const CardContent = () => (
    <AppleCard className="h-full cursor-pointer group">
      <AppleCardContent className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${gradient} flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-1">
            {isLoading ? (
              <div className="w-10 h-4 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
            ) : (
              <>
                <span className={`text-sm font-medium ${trend === 'up' ? 'text-apple-green' : 'text-apple-red'}`}>
                  {change}
                </span>
                <ArrowRight className="h-4 w-4 text-apple-gray dark:text-[#636366] opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-apple-gray dark:text-[#636366] text-sm mb-1">{title}</p>
          {isLoading ? (
            <div className="w-20 h-8 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
          ) : (
            <p className="text-headline text-apple-dark dark:text-[#ececec]">{value}</p>
          )}
        </div>
      </AppleCardContent>
    </AppleCard>
  )

  return (
    <motion.div variants={cardVariants}>
      <Link href={href}><CardContent /></Link>
    </motion.div>
  )
}

function FeatureCard({ title, subtitle, description, icon: Icon, gradient, href }: {
  title: string; subtitle: string; description: string;
  icon: React.ComponentType<{ className?: string }>; gradient: string; href: string
}) {
  return (
    <motion.div variants={cardVariants}>
      <Link href={href}>
        <AppleCard featured className="h-full relative overflow-hidden group cursor-pointer">
          <div className={`absolute inset-0 ${gradient} opacity-90`} />
          <AppleCardContent className="relative z-10 h-full flex flex-col text-white p-8">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
                {subtitle}
              </span>
            </div>
            <h3 className="text-title-1 font-semibold mb-2">{title}</h3>
            <p className="text-white/80 text-body flex-1">{description}</p>
            <div className="flex items-center gap-2 mt-4 text-sm font-medium group-hover:gap-3 transition-all">
              Scopri <ArrowRight className="h-4 w-4" />
            </div>
          </AppleCardContent>
        </AppleCard>
      </Link>
    </motion.div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value}%`
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-apple-green',
  in_progress: 'bg-apple-blue',
  pending: 'bg-apple-orange',
  cancelled: 'bg-apple-red',
  completed: 'bg-apple-green',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading, error } = useDashboardStats()

  const revenue = stats?.revenue ?? 0
  const revenueChange = stats?.revenueChange ?? 0
  const bookingsToday = stats?.bookingsToday ?? 0
  const bookingsChange = stats?.bookingsChange ?? 0
  const avgTicket = stats?.avgTicket ?? 0
  const avgTicketChange = stats?.avgTicketChange ?? 0
  const vehiclesInShop = stats?.vehiclesInShop ?? 0
  const vehiclesChange = stats?.vehiclesChange ?? 0
  const recentBookings = stats?.recentBookings ?? []
  const alerts = stats?.alerts ?? []
  const tenantName = stats?.tenantName || user?.tenantName || 'La tua officina'

  return (
    <div>
      <header className="bg-[#f4f4f4]/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[#ececec]">Dashboard</h1>
            <p className="text-apple-gray dark:text-[#636366] text-body mt-1">{tenantName}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-apple-gray dark:text-[#636366] text-body" suppressHydrationWarning>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <Link href="/dashboard/bookings">
              <AppleButton variant="secondary" icon={<Calendar className="h-4 w-4" />}>
                Agenda
              </AppleButton>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* Feature Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-bento"
        >
          <FeatureCard
            title="Ispezioni Digitali"
            subtitle="Novità"
            description="Foto, annotazioni e report multimediali per i tuoi clienti"
            icon={ClipboardCheck}
            gradient="bg-gradient-to-br from-apple-green to-emerald-600"
            href="/dashboard/inspections"
          />
          <FeatureCard
            title="OBD & ML"
            subtitle="AI Powered"
            description="Monitoraggio real-time e predizione intelligente dei guasti"
            icon={Activity}
            gradient="bg-gradient-to-br from-apple-purple to-violet-600"
            href="/dashboard/obd"
          />
          <FeatureCard
            title="Ricambi"
            subtitle="Multi-Fornitore"
            description="Confronta prezzi da 11 fornitori in tempo reale"
            icon={Package}
            gradient="bg-gradient-to-br from-apple-blue to-blue-600"
            href="/dashboard/parts"
          />
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-bento"
        >
          <KpiCard
            title="Fatturato Oggi"
            value={formatCurrency(revenue)}
            change={formatChange(revenueChange)}
            trend={revenueChange >= 0 ? 'up' : 'down'}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-apple-green to-emerald-500"
            href="/dashboard/invoices?period=today"
            isLoading={isLoading}
          />
          <KpiCard
            title="Prenotazioni Oggi"
            value={String(bookingsToday)}
            change={formatChange(bookingsChange)}
            trend={bookingsChange >= 0 ? 'up' : 'down'}
            icon={Calendar}
            gradient="bg-gradient-to-br from-apple-blue to-blue-500"
            href="/dashboard/bookings?period=today"
            isLoading={isLoading}
          />
          <KpiCard
            title="ARO Medio"
            value={formatCurrency(avgTicket)}
            change={formatChange(avgTicketChange)}
            trend={avgTicketChange >= 0 ? 'up' : 'down'}
            icon={Wrench}
            gradient="bg-gradient-to-br from-apple-orange to-amber-500"
            href="/dashboard/analytics?metric=aro"
            isLoading={isLoading}
          />
          <KpiCard
            title="Veicoli in Officina"
            value={String(vehiclesInShop)}
            change={`${vehiclesChange >= 0 ? '+' : ''}${vehiclesChange}`}
            trend={vehiclesChange >= 0 ? 'up' : 'down'}
            icon={Car}
            gradient="bg-gradient-to-br from-apple-purple to-violet-500"
            href="/dashboard/vehicles?status=in_service"
            isLoading={isLoading}
          />
        </motion.div>

        {/* Two Column Layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-bento"
        >
          {/* Car Count */}
          <motion.div variants={cardVariants}>
            <AppleCard className="lg:col-span-1">
              <AppleCardContent>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">Car Count</h2>
                  {isLoading ? (
                    <div className="w-12 h-10 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
                  ) : (
                    <span className="text-hero text-apple-dark dark:text-[#ececec] font-semibold">{vehiclesInShop}</span>
                  )}
                </div>

                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="w-32 h-4 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
                        <div className="w-8 h-6 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
                      </div>
                    ))
                  ) : (
                    [
                      { label: 'In Servizio', count: Math.ceil(vehiclesInShop * 0.45), color: 'bg-apple-blue' },
                      { label: 'Attesa Approvazione', count: Math.ceil(vehiclesInShop * 0.15), color: 'bg-apple-orange' },
                      { label: 'Attesa Ricambi', count: Math.ceil(vehiclesInShop * 0.1), color: 'bg-amber-400' },
                      { label: 'Pronti', count: Math.max(0, vehiclesInShop - Math.ceil(vehiclesInShop * 0.7)), color: 'bg-apple-green' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-body text-apple-dark dark:text-[#ececec]">{item.label}</span>
                        </div>
                        <span className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">{item.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Recent Bookings */}
          <motion.div variants={cardVariants} className="lg:col-span-2">
            <AppleCard className="h-full">
              <AppleCardContent>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">Prenotazioni Recenti</h2>
                  <Link href="/dashboard/bookings">
                    <AppleButton variant="ghost" size="sm">Vedi tutte</AppleButton>
                  </Link>
                </div>

                <div className="space-y-3">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/50 dark:bg-[#353535]">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-12 rounded-full bg-gray-200 dark:bg-[#424242] animate-pulse" />
                          <div>
                            <div className="w-32 h-4 bg-gray-200 dark:bg-[#424242] rounded animate-pulse mb-2" />
                            <div className="w-48 h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
                          </div>
                        </div>
                        <div className="w-16 h-4 bg-gray-200 dark:bg-[#424242] rounded animate-pulse" />
                      </div>
                    ))
                  ) : recentBookings.length === 0 ? (
                    <div className="text-center py-8 text-apple-gray dark:text-[#636366]">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nessuna prenotazione recente</p>
                    </div>
                  ) : (
                    recentBookings.slice(0, 5).map((booking) => (
                      <Link href={`/dashboard/bookings/${booking.id}`} key={booking.id}>
                        <motion.div
                          whileHover={{ x: 4 }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/50 dark:bg-[#353535] shadow-sm transition-all duration-300 cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-12 rounded-full ${statusColors[booking.status] || 'bg-apple-gray'}`} />
                            <div>
                              <p className="text-body font-medium text-apple-dark dark:text-[#ececec]">{booking.customerName}</p>
                              <p className="text-footnote text-apple-gray dark:text-[#636366]">
                                {booking.vehiclePlate} {booking.vehicleBrand ? `• ${booking.vehicleBrand}` : ''} • {booking.serviceName || booking.serviceCategory}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-callout font-medium text-apple-dark dark:text-[#ececec]">
                              {new Date(booking.scheduledAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-caption text-apple-gray dark:text-[#636366] uppercase">{booking.id.slice(0, 8)}</p>
                          </div>
                        </motion.div>
                      </Link>
                    ))
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* Alerts — always rendered to avoid CLS when loading completes */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isLoading ? 'hidden' : 'visible'}
          className="grid grid-cols-1 md:grid-cols-2 gap-bento min-h-[120px]"
        >
            {alerts.length > 0 ? (
              alerts.slice(0, 4).map((alert) => (
                <motion.div key={alert.id} variants={cardVariants}>
                  <AppleCard className={`border-l-4 ${alert.severity === 'error' ? 'border-l-apple-red' : alert.severity === 'warning' ? 'border-l-apple-orange' : 'border-l-apple-blue'}`}>
                    <AppleCardContent className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${alert.severity === 'error' ? 'bg-apple-red/10' : alert.severity === 'warning' ? 'bg-apple-orange/10' : 'bg-apple-blue/10'}`}>
                        <AlertCircle className={`h-6 w-6 ${alert.severity === 'error' ? 'text-apple-red' : alert.severity === 'warning' ? 'text-apple-orange' : 'text-apple-blue'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">{alert.message}</h3>
                        <p className="text-footnote text-apple-gray dark:text-[#636366] mt-1">
                          {new Date(alert.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              ))
            ) : (
              <>
                <motion.div variants={cardVariants}>
                  <AppleCard className="border-l-4 border-l-apple-green">
                    <AppleCardContent className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-apple-green/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-6 w-6 text-apple-green" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">Tutto sotto controllo</h3>
                        <p className="text-body text-apple-gray dark:text-[#636366] mt-1">
                          Nessun avviso critico. La tua officina funziona alla perfezione.
                        </p>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
                <motion.div variants={cardVariants}>
                  <AppleCard className="border-l-4 border-l-apple-blue">
                    <AppleCardContent className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-apple-blue" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-title-3 font-semibold text-apple-dark dark:text-[#ececec]">Benvenuto, {user?.name || 'Utente'}</h3>
                        <p className="text-body text-apple-gray dark:text-[#636366] mt-1">
                          Gestisci prenotazioni, clienti e veicoli dalla tua dashboard.
                        </p>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              </>
            )}
        </motion.div>

        {error != null && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl text-center">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Dati non disponibili al momento. Il backend potrebbe essere in avvio.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
