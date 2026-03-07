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
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

// 🎭 Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] // Apple-style easing
    }
  }
}

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

// 🍎 Apple-style KPI Card (Clickable)
function KpiCard({ title, value, change, trend, icon: Icon, gradient, href }: any) {
  const CardContent = () => (
    <AppleCard className="h-full cursor-pointer group">
      <AppleCardContent className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${gradient} flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-apple-green' : 'text-apple-red'}`}>
              {change}
            </span>
            <ArrowRight className="h-4 w-4 text-apple-gray opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-apple-gray text-sm mb-1 flex items-center gap-2">
            {title}
          </p>
          <p className="text-headline text-apple-dark">{value}</p>
        </div>
      </AppleCardContent>
    </AppleCard>
  )

  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {href ? (
        <Link href={href}>
          <CardContent />
        </Link>
      ) : (
        <CardContent />
      )}
    </motion.div>
  )
}

// 🍎 Apple-style Feature Card
function FeatureCard({ title, subtitle, description, icon: Icon, gradient, href }: any) {
  return (
    <motion.div variants={cardVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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

export default function DashboardPage() {
  const bookings = [
    { id: 'BK-001', customer: 'Mario Rossi', vehicle: 'Fiat Panda AB123CD', service: 'Tagliando', status: 'ready', time: '14:30', color: 'bg-apple-green' },
    { id: 'BK-002', customer: 'Laura Bianchi', vehicle: 'Ford Fiesta CD456EF', service: 'Cambio freni', status: 'pending', time: '15:00', color: 'bg-apple-orange' },
    { id: 'BK-003', customer: 'Giuseppe Verdi', vehicle: 'BMW X3 GH789IJ', service: 'Diagnosi', status: 'warning', time: '16:00', color: 'bg-apple-blue' },
    { id: 'BK-004', customer: 'Anna Neri', vehicle: 'Audi A4 KL012MN', service: 'Olio', status: 'urgent', time: 'In ritardo', color: 'bg-apple-red' },
  ]

  return (
    <div className="min-h-screen">
      {/* 🍎 Apple-style Header */}
      <motion.header 
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark">Dashboard</h1>
            <p className="text-apple-gray text-body mt-1">Officina Rossi • Via Roma 123, Milano</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-apple-gray text-body">
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <Link href="/dashboard/bookings">
              <AppleButton variant="secondary" icon={<Calendar className="h-4 w-4" />}>
                Agenda
              </AppleButton>
            </Link>
          </div>
        </div>
      </motion.header>

      <div className="p-8 space-y-8">
        {/* 🍎 Feature Cards - Bento Grid Style */}
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

        {/* 🍎 KPI Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-bento"
        >
          <KpiCard
            title="Fatturato Oggi"
            value="€2,450"
            change="+12%"
            trend="up"
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-apple-green to-emerald-500"
            href="/dashboard/invoices?period=today"
          />
          <KpiCard
            title="Veicoli in Officina"
            value="18"
            change="+3"
            trend="up"
            icon={Car}
            gradient="bg-gradient-to-br from-apple-blue to-blue-500"
            href="/dashboard/vehicles?status=in_service"
          />
          <KpiCard
            title="ARO Medio"
            value="€186"
            change="-5%"
            trend="down"
            icon={Wrench}
            gradient="bg-gradient-to-br from-apple-orange to-amber-500"
            href="/dashboard/analytics?metric=aro"
          />
          <KpiCard
            title="Clienti Nuovi"
            value="4"
            change="+2"
            trend="up"
            icon={Users}
            gradient="bg-gradient-to-br from-apple-purple to-violet-500"
            href="/dashboard/customers?filter=new&period=this_month"
          />
        </motion.div>

        {/* 🍎 Two Column Layout */}
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
                  <h2 className="text-title-2 font-semibold text-apple-dark">Car Count</h2>
                  <span className="text-hero text-apple-dark font-semibold">18</span>
                </div>
                
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {[
                    { label: 'In Servizio', count: 8, color: 'bg-apple-blue' },
                    { label: 'Attesa Approvazione', count: 3, color: 'bg-apple-orange' },
                    { label: 'Attesa Ricambi', count: 2, color: 'bg-amber-400' },
                    { label: 'Pronti', count: 5, color: 'bg-apple-green' },
                  ].map((item, index) => (
                    <motion.div 
                      key={item.label} 
                      variants={cardVariants}
                      custom={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-body text-apple-dark">{item.label}</span>
                      </div>
                      <span className="text-title-3 font-semibold text-apple-dark">{item.count}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Recent Bookings */}
          <motion.div variants={cardVariants} className="lg:col-span-2">
            <AppleCard className="h-full">
              <AppleCardContent>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-title-2 font-semibold text-apple-dark">Prenotazioni Recenti</h2>
                  <Link href="/dashboard/bookings">
                  <AppleButton variant="ghost" size="sm">Vedi tutte</AppleButton>
                </Link>
                </div>

                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {bookings.map((booking, index) => (
                    <Link href={`/dashboard/bookings/${booking.id.toLowerCase()}`} key={booking.id}>
                      <motion.div 
                        variants={cardVariants}
                        custom={index}
                        whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,1)' }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/50 shadow-sm transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 rounded-full ${booking.color}`} />
                          <div>
                            <p className="text-body font-medium text-apple-dark">{booking.customer}</p>
                            <p className="text-footnote text-apple-gray">{booking.vehicle} • {booking.service}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-callout font-medium text-apple-dark">{booking.time}</p>
                          <p className="text-caption text-apple-gray uppercase">{booking.id}</p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </motion.div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* 🍎 Alerts Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-bento"
        >
          <motion.div variants={cardVariants}>
            <AppleCard className="border-l-4 border-l-apple-orange">
              <AppleCardContent className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-apple-orange/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-apple-orange" />
                </div>
                <div className="flex-1">
                  <h3 className="text-title-3 font-semibold text-apple-dark">Ricambi in esaurimento</h3>
                  <p className="text-body text-apple-gray mt-1">
                    5 prodotti sotto la soglia minima. Ordina ora per evitare ritardi.
                  </p>
                  <Link href="/dashboard/parts">
                    <AppleButton variant="ghost" size="sm" className="mt-3">
                      Vai ai ricambi →
                    </AppleButton>
                  </Link>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div variants={cardVariants}>
            <AppleCard className="border-l-4 border-l-apple-blue">
              <AppleCardContent className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-apple-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="text-title-3 font-semibold text-apple-dark">Appuntamenti domani</h3>
                  <p className="text-body text-apple-gray mt-1">
                    Hai 8 prenotazioni confermate per domani. Prepara i ricambi necessari.
                  </p>
                  <Link href="/dashboard/bookings">
                    <AppleButton variant="ghost" size="sm" className="mt-3">
                      Visualizza agenda →
                    </AppleButton>
                  </Link>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
