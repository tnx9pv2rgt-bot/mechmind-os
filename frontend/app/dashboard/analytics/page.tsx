'use client'

/**
 * MechMind OS - Analytics Dashboard Page
 * 
 * Integrates Metabase BI dashboards for comprehensive business intelligence.
 * Provides multiple dashboard views: bookings, revenue, customers, mechanics, vehicles.
 * 
 * @module AnalyticsPage
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Car, 
  Euro, 
  Calendar,
  Settings,
  Wrench,
  LayoutDashboard,
  PieChart
} from 'lucide-react'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { MetabaseDashboardSelector, DashboardType } from './metabase-client'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

// KPI Card component
interface KPICardProps {
  label: string
  value: string
  change: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
  color: string
}

function KPICard({ label, value, change, changeType = 'positive', icon: Icon, color }: KPICardProps) {
  const changeColor = changeType === 'positive' 
    ? 'text-apple-green' 
    : changeType === 'negative' 
      ? 'text-red-500' 
      : 'text-apple-gray'

  return (
    <AppleCard>
      <AppleCardContent>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <span className={`text-footnote font-medium ${changeColor}`}>{change}</span>
        </div>
        <p className="text-title-1 font-bold text-apple-dark dark:text-[#ececec]">{value}</p>
        <p className="text-footnote text-apple-gray dark:text-[#636366]">{label}</p>
      </AppleCardContent>
    </AppleCard>
  )
}

// Dashboard type info
const DASHBOARD_INFO: Record<DashboardType, {
  title: string
  description: string
  icon: React.ElementType
  features: string[]
}> = {
  overview: {
    title: 'Booking Overview',
    description: 'Metriche complete sulle prenotazioni',
    icon: Calendar,
    features: [
      'Prenotazioni giornaliere/settimanali',
      'Tasso di completamento',
      'Tasso di cancellazione',
      'Distribuzione oraria',
      'Utilizzo slot'
    ]
  },
  revenue: {
    title: 'Revenue Analytics',
    description: 'Analisi fatturato e trend',
    icon: Euro,
    features: [
      'Fatturato mensile/annuale',
      'Trend anno su anno',
      'Metodi di pagamento',
      'Revenue per servizio',
      'Previsioni'
    ]
  },
  customers: {
    title: 'Customer Insights',
    description: 'Analisi clienti e retention',
    icon: Users,
    features: [
      'Nuovi clienti',
      'Retention rate',
      'Customer LTV',
      'Cohort analysis',
      'Segmentazione'
    ]
  },
  mechanics: {
    title: 'Mechanic Performance',
    description: 'Performance team tecnico',
    icon: Wrench,
    features: [
      'Ore lavorate',
      'Efficienza',
      'Servizi completati',
      'Revenue generato',
      'Valutazioni'
    ]
  },
  vehicles: {
    title: 'Vehicle Analytics',
    description: 'Analisi per marca/modello',
    icon: Car,
    features: [
      'Servizi per marca',
      'Distribuzione modelli',
      'Frequenza servizi',
      'Età media veicoli',
      'Trend stagionali'
    ]
  },
  executive: {
    title: 'Executive Summary',
    description: 'KPI strategici riepilogativi',
    icon: PieChart,
    features: [
      'KPI principali',
      'Confronto periodi',
      'Obiettivi vs Risultati',
      'Analisi margini',
      'Trend strategici'
    ]
  }
}

export default function AnalyticsPage() {
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardType>('overview')

  return (
    <div>
      {/* Header */}
      <header
        className="bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50"
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[#ececec]">Analytics BI</h1>
            <p className="text-apple-gray dark:text-[#636366] text-body mt-1">
              Dashboard Metabase - Insight avanzati sulla tua officina
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-apple-light-gray/50 dark:bg-[#353535] border border-apple-border dark:border-[#424242]">
              <LayoutDashboard className="h-4 w-4 text-apple-gray" />
              <span className="text-body text-apple-dark dark:text-[#ececec]">Metabase BI</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* KPI Summary Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-bento"
        >
          <motion.div variants={itemVariants}>
            <KPICard 
              label="Fatturato 30gg" 
              value="€45,230" 
              change="+15%" 
              icon={Euro} 
              color="bg-apple-green" 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard 
              label="Veicoli Serviti" 
              value="156" 
              change="+8%" 
              icon={Car} 
              color="bg-apple-blue" 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard 
              label="Clienti Nuovi" 
              value="24" 
              change="+12%" 
              icon={Users} 
              color="bg-apple-purple" 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard 
              label="Utilizzo Slot" 
              value="78%" 
              change="+5%" 
              icon={TrendingUp} 
              color="bg-apple-orange" 
            />
          </motion.div>
        </motion.div>

        {/* Dashboard Selection */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <AppleCard>
              <AppleCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
                      Dashboard Metabase
                    </h3>
                    <p className="text-footnote text-apple-gray dark:text-[#636366]">
                      Seleziona una dashboard per visualizzare le analisi dettagliate
                    </p>
                  </div>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(Object.keys(DASHBOARD_INFO) as DashboardType[]).map((key) => {
                    const info = DASHBOARD_INFO[key]
                    const isActive = selectedDashboard === key
                    
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDashboard(key)}
                        className={`
                          p-4 rounded-2xl text-left transition-all duration-200 group
                          ${isActive 
                            ? 'bg-apple-blue text-white shadow-lg shadow-apple-blue/25' 
                            : 'bg-apple-light-gray/50 dark:bg-[#353535] hover:bg-apple-light-gray dark:hover:bg-[#424242]'
                          }
                        `}
                      >
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center mb-3
                          ${isActive ? 'bg-white/20' : 'bg-white dark:bg-[#2f2f2f]'}
                        `}>
                          <info.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-apple-blue'}`} />
                        </div>
                        <h4 className={`
                          text-sm font-semibold mb-1
                          ${isActive ? 'text-white' : 'text-apple-dark dark:text-[#ececec]'}
                        `}>
                          {info.title}
                        </h4>
                        <p className={`
                          text-xs
                          ${isActive ? 'text-white/80' : 'text-apple-gray dark:text-[#636366]'}
                        `}>
                          {info.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* Active Dashboard Info */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <AppleCard className="bg-gradient-to-br from-apple-blue/5 to-apple-purple/5 border-apple-blue/20">
              <AppleCardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = DASHBOARD_INFO[selectedDashboard].icon
                      return <Icon className="h-6 w-6 text-white" />
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-1">
                      {DASHBOARD_INFO[selectedDashboard].title}
                    </h3>
                    <p className="text-body text-apple-gray dark:text-[#636366] mb-4">
                      {DASHBOARD_INFO[selectedDashboard].description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DASHBOARD_INFO[selectedDashboard].features.map((feature) => (
                        <span 
                          key={feature}
                          className="px-3 py-1 rounded-full bg-white/80 dark:bg-[#2f2f2f]/80 text-xs text-apple-dark dark:text-[#ececec] border border-apple-border dark:border-[#424242]"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* Embedded Metabase Dashboard */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <MetabaseDashboardSelector defaultDashboard={selectedDashboard} />
          </motion.div>
        </motion.div>

        {/* Setup Instructions (collapsible) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <AppleCard className="bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/30">
              <AppleCardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-amber-600" />
                  <h3 className="text-title-3 font-semibold text-amber-800 dark:text-amber-300">
                    Configurazione Metabase
                  </h3>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <div className="space-y-4 text-sm text-amber-700 dark:text-amber-300">
                  <p>
                    Per abilitare i dashboard Metabase, assicurati che:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Il container Metabase sia avviato: <code className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">docker-compose -f infrastructure/docker-compose.metabase.yml up -d</code></li>
                    <li>Le variabili d&apos;ambiente siano configurate nel backend (.env):</li>
                  </ol>
                  <pre className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg text-xs overflow-x-auto">
{`METABASE_URL=http://localhost:3001
METABASE_SECRET_KEY=your-32-character-secret-key
METABASE_EMBEDDING_ENABLED=true`}
                  </pre>
                  <p>
                    Vedi la <a href="/docs/METABASE_SETUP.md" className="underline">documentazione completa</a> per i dettagli di setup.
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
