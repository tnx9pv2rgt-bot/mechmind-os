'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { 
  Activity, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Gauge,
  Thermometer,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Bluetooth
} from 'lucide-react'

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
}

const headerVariants = {
  hidden: { 
    opacity: 0, 
    y: -20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20
    }
  }
}

export default function OBDPage() {
  const [connected, setConnected] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
        initial="hidden"
        animate="visible"
        variants={headerVariants}
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark">OBD & Manutenzione ML</h1>
            <p className="text-apple-gray text-body mt-1">Monitoraggio real-time e predizione intelligente</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${connected ? 'bg-apple-green/10 text-apple-green' : 'bg-apple-gray/10 text-apple-gray'}`}>
              {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="text-sm font-medium">{connected ? 'Connesso' : 'Disconnesso'}</span>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div 
        className="p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Connection Card */}
        {!connected && (
          <motion.div variants={cardVariants}>
            <AppleCard featured className="bg-gradient-to-br from-apple-purple to-violet-600 text-white">
              <AppleCardContent className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Bluetooth className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
                      OBD-II
                    </span>
                  </div>
                  <h2 className="text-title-1 font-semibold mb-2">Connetti il tuo dongle OBD</h2>
                  <p className="text-white/80 text-body max-w-2xl">
                    Collega un dispositivo OBD-II Bluetooth per iniziare il monitoraggio real-time 
                    del veicolo e ricevere predizioni ML sui possibili guasti.
                  </p>
                </div>
                <AppleButton 
                  className="bg-white text-apple-purple hover:bg-white/90 shrink-0"
                  onClick={() => setConnected(true)}
                >
                  Connetti OBD <ArrowRight className="h-4 w-4 ml-2" />
                </AppleButton>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Health Score */}
        <motion.div variants={cardVariants}>
          <AppleCard featured>
            <AppleCardContent className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="88" fill="none" stroke="#f0f0f0" strokeWidth="12" />
                  <circle 
                    cx="96" 
                    cy="96" 
                    r="88" 
                    fill="none" 
                    stroke="url(#gradient)" 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    strokeDasharray={`${(78 / 100) * 553} 553`}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0071e3" />
                      <stop offset="100%" stopColor="#af52de" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-apple-dark">78</span>
                  <span className="text-sm text-apple-gray">Health Score</span>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-title-2 font-semibold text-apple-dark mb-2">Stato del Veicolo</h3>
                <p className="text-body text-apple-gray mb-6">
                  Il tuo veicolo è in buone condizioni generali. Ci sono alcuni elementi che richiedono attenzione 
                  nei prossimi 5,000 km.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Motore', score: 85, color: 'bg-apple-green' },
                    { label: 'Trasmissione', score: 72, color: 'bg-apple-blue' },
                    { label: 'Freni', score: 65, color: 'bg-apple-orange' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="w-full h-2 bg-apple-light-gray rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${item.color}`} style={{ width: `${item.score}%` }} />
                      </div>
                      <p className="text-footnote text-apple-gray">{item.label}</p>
                      <p className="text-callout font-semibold text-apple-dark">{item.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Live Data */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-bento"
          variants={containerVariants}
        >
          {[
            { label: 'RPM Motore', value: '850', unit: 'rpm', icon: Gauge, color: 'from-apple-blue to-blue-600' },
            { label: 'Temp. Refrigerante', value: '92', unit: '°C', icon: Thermometer, color: 'from-apple-orange to-amber-600' },
            { label: 'Voltaggio', value: '14.2', unit: 'V', icon: Zap, color: 'from-apple-green to-emerald-600' },
            { label: 'Carico Motore', value: '18', unit: '%', icon: Activity, color: 'from-apple-purple to-violet-600' },
          ].map((item) => (
            <motion.div key={item.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-footnote text-apple-gray">{item.label}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-title-1 font-bold text-apple-dark">{item.value}</p>
                    <span className="text-caption text-apple-gray">{item.unit}</span>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* ML Predictions */}
        <motion.div variants={cardVariants}>
          <AppleCard>
            <AppleCardContent>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-purple to-violet-600 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-title-2 font-semibold text-apple-dark">Predizioni ML</h3>
                  <p className="text-footnote text-apple-gray">Basate sui dati OBD e algoritmi di machine learning</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { 
                    component: 'Batteria', 
                    severity: 'medium',
                    probability: 65,
                    description: 'Voltaggio in calo rilevato nelle partenze a freddo',
                    action: 'Verifica carica alternatore',
                    cost: '€120 - €180'
                  },
                  { 
                    component: 'Pastiglie Freni Posteriori', 
                    severity: 'high',
                    probability: 85,
                    description: 'Spessore pastiglie inferiore al limite di sicurezza',
                    action: 'Sostituzione urgente consigliata',
                    cost: '€180 - €250'
                  },
                ].map((alert, index) => (
                  <div 
                    key={index}
                    className={`p-5 rounded-2xl border-l-4 ${
                      alert.severity === 'high' 
                        ? 'bg-apple-red/5 border-apple-red' 
                        : 'bg-apple-orange/5 border-apple-orange'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-5 w-5 ${alert.severity === 'high' ? 'text-apple-red' : 'text-apple-orange'}`} />
                        <h4 className="text-body font-semibold text-apple-dark">{alert.component}</h4>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        alert.severity === 'high' ? 'bg-apple-red text-white' : 'bg-apple-orange text-white'
                      }`}>
                        {alert.probability}% rischio
                      </span>
                    </div>
                    <p className="text-body text-apple-gray mb-3">{alert.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-footnote">
                        <span className="text-apple-gray">Azione: </span>
                        <span className="text-apple-dark font-medium">{alert.action}</span>
                      </div>
                      <span className="text-callout font-semibold text-apple-dark">{alert.cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Features Info */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-bento"
          variants={containerVariants}
        >
          {[
            { 
              icon: Activity, 
              title: 'Real-time Monitoring', 
              description: '25+ parametri OBD-II con aggiornamento ogni 2 secondi',
              color: 'bg-apple-blue'
            },
            { 
              icon: Brain, 
              title: 'ML Prediction', 
              description: '98.7% accuratezza nel predire guasti fino a 5000km prima',
              color: 'bg-apple-purple'
            },
            { 
              icon: TrendingUp, 
              title: 'Cost Optimization', 
              description: '-50% downtime e -30% costi di manutenzione',
              color: 'bg-apple-green'
            },
          ].map((feature) => (
            <motion.div key={feature.title} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className="text-center">
                  <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-title-3 font-semibold text-apple-dark mb-2">{feature.title}</h3>
                  <p className="text-footnote text-apple-gray">{feature.description}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
