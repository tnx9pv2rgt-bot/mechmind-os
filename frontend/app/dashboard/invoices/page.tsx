'use client'

import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { FileText, Plus, Euro, Clock, CheckCircle, FileCheck, ArrowRight } from 'lucide-react'

const mockInvoices = [
  { id: 'INV-001', customer: 'Mario Rossi', date: '01/03/2026', amount: '€450', status: 'paid', type: 'invoice' },
  { id: 'QUO-002', customer: 'Laura Bianchi', date: '28/02/2026', amount: '€280', status: 'pending', type: 'quote' },
  { id: 'INV-003', customer: 'Giuseppe Verdi', date: '25/02/2026', amount: '€1,250', status: 'paid', type: 'invoice' },
  { id: 'QUO-004', customer: 'Anna Neri', date: '24/02/2026', amount: '€180', status: 'accepted', type: 'quote' },
]

const statusConfig: Record<string, { color: string; label: string }> = {
  'paid': { color: 'bg-apple-green', label: 'Pagata' },
  'pending': { color: 'bg-apple-orange', label: 'In attesa' },
  'accepted': { color: 'bg-apple-blue', label: 'Accettata' },
  'overdue': { color: 'bg-apple-red', label: 'Scaduta' },
}

// Animation variants
const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
}

const quickActionVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
}

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.4, 
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
}

export default function InvoicesPage() {
  return (
    <div>
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[#ececec]">Fatture</h1>
            <p className="text-apple-gray dark:text-[#636366] text-body mt-1">Gestisci fatture e preventivi</p>
          </div>
          <div className="flex gap-3">
            <AppleButton variant="secondary" icon={<Plus className="h-4 w-4" />}>
              Preventivo
            </AppleButton>
            <AppleButton icon={<Plus className="h-4 w-4" />}>
              Fattura
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div 
        className="p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Stats */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-4 gap-bento"
          variants={containerVariants}
        >
          {[
            { label: 'Fatturato Mese', value: '€12,450', icon: Euro, color: 'bg-apple-green', trend: '+12%' },
            { label: 'In attesa', value: '€3,280', icon: Clock, color: 'bg-apple-orange', trend: '5 fatture' },
            { label: 'Preventivi', value: '8', icon: FileCheck, color: 'bg-apple-blue', trend: '3 accettati' },
            { label: 'Pagato', value: '89%', icon: CheckCircle, color: 'bg-apple-purple', trend: '+5%' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-footnote text-apple-gray dark:text-[#636366]">{stat.trend}</span>
                  </div>
                  <p className="text-title-1 font-bold text-apple-dark dark:text-[#ececec]">{stat.value}</p>
                  <p className="text-footnote text-apple-gray dark:text-[#636366]">{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-bento"
          variants={containerVariants}
        >
          <motion.div variants={quickActionVariants}>
            <AppleCard featured className="bg-gradient-to-br from-apple-green to-emerald-600 text-white">
              <AppleCardContent className="flex items-center justify-between">
                <div>
                  <h3 className="text-title-2 font-semibold mb-2">Crea Fattura</h3>
                  <p className="text-white/80 text-body">Genera una nuova fattura per i tuoi clienti</p>
                </div>
                <AppleButton className="bg-white text-apple-green hover:bg-white/90">
                  Nuova <ArrowRight className="h-4 w-4 ml-2" />
                </AppleButton>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
          
          <motion.div variants={quickActionVariants}>
            <AppleCard featured className="bg-gradient-to-br from-apple-blue to-blue-600 text-white">
              <AppleCardContent className="flex items-center justify-between">
                <div>
                  <h3 className="text-title-2 font-semibold mb-2">Crea Preventivo</h3>
                  <p className="text-white/80 text-body">Invia un preventivo dettagliato al cliente</p>
                </div>
                <AppleButton className="bg-white text-apple-blue hover:bg-white/90">
                  Nuovo <ArrowRight className="h-4 w-4 ml-2" />
                </AppleButton>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* Recent Documents */}
        <motion.div variants={listItemVariants}>
          <AppleCard>
            <AppleCardHeader>
              <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">Documenti Recenti</h2>
            </AppleCardHeader>
            <AppleCardContent>
              <motion.div 
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {mockInvoices.map((doc, index) => {
                  const status = statusConfig[doc.status]
                  return (
                    <motion.div 
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#353535] hover:shadow-apple transition-all duration-300"
                      variants={listItemVariants}
                      custom={index}
                      whileHover={{ scale: 1.01, x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${doc.type === 'invoice' ? 'bg-apple-green/10' : 'bg-apple-blue/10'} flex items-center justify-center`}>
                          <FileText className={`h-6 w-6 ${doc.type === 'invoice' ? 'text-apple-green' : 'text-apple-blue'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-body font-semibold text-apple-dark dark:text-[#ececec]">{doc.id}</p>
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-apple-light-gray dark:bg-[#353535] text-apple-gray dark:text-[#636366]">
                              {doc.type === 'invoice' ? 'Fattura' : 'Preventivo'}
                            </span>
                          </div>
                          <p className="text-footnote text-apple-gray dark:text-[#636366]">{doc.customer} • {doc.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${status.color}`}>
                          {status.label}
                        </span>
                        <p className="text-body font-semibold text-apple-dark dark:text-[#ececec] min-w-[80px] text-right">{doc.amount}</p>
                        <AppleButton variant="ghost" size="sm">Apri</AppleButton>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>

    </div>
  )
}
