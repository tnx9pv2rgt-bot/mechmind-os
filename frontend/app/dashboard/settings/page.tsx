'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Store, Users, Bell, CreditCard, Shield, Save, CheckCircle, ArrowRight } from 'lucide-react'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
}

const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
}

const staggerItem = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

const cardVariants = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
        initial="initial"
        animate="animate"
        variants={fadeInDown}
      >
        <div className="px-8 py-5">
          <h1 className="text-headline text-apple-dark">Impostazioni</h1>
          <p className="text-apple-gray text-body mt-1">Gestisci le preferenze della tua officina</p>
        </div>
      </motion.header>

      <div className="p-8 max-w-4xl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-white p-1 rounded-2xl border border-apple-border/30">
            <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white">Generali</TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white">Team</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white">Notifiche</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white">Fatturazione</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white">Sicurezza</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <motion.div
              initial="initial"
              animate="animate"
              variants={cardVariants}
            >
              <AppleCard>
                <AppleCardHeader>
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-apple-blue" />
                    <h2 className="text-title-2 font-semibold text-apple-dark">Informazioni Officina</h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <label className="text-footnote text-apple-gray font-medium">Nome Officina</label>
                      <Input defaultValue="Officina Rossi" className="h-12 rounded-xl border-apple-border" />
                    </motion.div>
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                    >
                      <label className="text-footnote text-apple-gray font-medium">Email</label>
                      <Input defaultValue="info@officinarossi.it" type="email" className="h-12 rounded-xl border-apple-border" />
                    </motion.div>
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <label className="text-footnote text-apple-gray font-medium">Telefono</label>
                      <Input defaultValue="+39 02 1234567" className="h-12 rounded-xl border-apple-border" />
                    </motion.div>
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
                    >
                      <label className="text-footnote text-apple-gray font-medium">Partita IVA</label>
                      <Input defaultValue="12345678901" className="h-12 rounded-xl border-apple-border" />
                    </motion.div>
                  </div>
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <label className="text-footnote text-apple-gray font-medium">Indirizzo</label>
                    <Input defaultValue="Via Roma 123, 20100 Milano" className="h-12 rounded-xl border-apple-border" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                  >
                    <AppleButton onClick={handleSave} className="mt-4">
                      {saved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      {saved ? 'Salvato!' : 'Salva Modifiche'}
                    </AppleButton>
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <motion.div
              initial="initial"
              animate="animate"
              variants={cardVariants}
            >
              <AppleCard>
                <AppleCardHeader>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-apple-blue" />
                    <h2 className="text-title-2 font-semibold text-apple-dark">Membri Team</h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div 
                    className="space-y-3"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {[
                      { name: 'Marco Rossi', role: 'Admin', email: 'marco@officina.it', color: 'bg-apple-blue' },
                      { name: 'Luca Bianchi', role: 'Tecnico', email: 'luca@officina.it', color: 'bg-apple-green' },
                      { name: 'Giulia Verdi', role: 'Segreteria', email: 'giulia@officina.it', color: 'bg-apple-purple' },
                    ].map((member, index) => (
                      <motion.div 
                        key={member.name} 
                        className="flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30"
                        variants={staggerItem}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.5)' }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white text-sm font-medium`}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-body font-semibold text-apple-dark">{member.name}</p>
                            <p className="text-footnote text-apple-gray">{member.email}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-white border border-apple-border text-apple-dark">
                          {member.role}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <motion.div
              initial="initial"
              animate="animate"
              variants={cardVariants}
            >
              <AppleCard>
                <AppleCardHeader>
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-apple-blue" />
                    <h2 className="text-title-2 font-semibold text-apple-dark">Notifiche</h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  <motion.div 
                    className="space-y-3"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {[
                      'Nuove prenotazioni',
                      'Promemoria appuntamenti',
                      'Ricambi in esaurimento',
                      'Pagamenti ricevuti',
                      'Review clienti',
                    ].map((item) => (
                      <motion.label 
                        key={item} 
                        className="flex items-center gap-4 p-4 rounded-2xl bg-apple-light-gray/30 cursor-pointer hover:bg-white transition-colors"
                        variants={staggerItem}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg border-apple-border text-apple-blue focus:ring-apple-blue" />
                        <span className="text-body text-apple-dark">{item}</span>
                      </motion.label>
                    ))}
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <BillingSettingsTab />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <motion.div
              initial="initial"
              animate="animate"
              variants={cardVariants}
            >
              <AppleCard>
                <AppleCardHeader>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-apple-blue" />
                    <h2 className="text-title-2 font-semibold text-apple-dark">Sicurezza</h2>
                  </div>
                </AppleCardHeader>
                <AppleCardContent className="space-y-4">
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <label className="text-footnote text-apple-gray font-medium">Password attuale</label>
                    <Input type="password" placeholder="••••••••" className="h-12 rounded-xl border-apple-border" />
                  </motion.div>
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <label className="text-footnote text-apple-gray font-medium">Nuova password</label>
                    <Input type="password" placeholder="••••••••" className="h-12 rounded-xl border-apple-border" />
                  </motion.div>
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <label className="text-footnote text-apple-gray font-medium">Conferma password</label>
                    <Input type="password" placeholder="••••••••" className="h-12 rounded-xl border-apple-border" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <AppleButton>Cambia Password</AppleButton>
                  </motion.div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Billing Settings Tab Component
function BillingSettingsTab() {
  const router = useRouter()
  
  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={cardVariants}
    >
      <AppleCard>
        <AppleCardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-apple-blue" />
            <h2 className="text-title-2 font-semibold text-apple-dark">Piano e Pagamenti</h2>
          </div>
        </AppleCardHeader>
        <AppleCardContent>
          <motion.div 
            className="p-6 rounded-2xl bg-gradient-to-r from-apple-blue to-apple-purple text-white mb-6"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <p className="text-footnote text-white/80 mb-1">Gestione completa</p>
            <h3 className="text-title-1 font-bold mb-2">Fatturazione e Abbonamento</h3>
            <p className="text-body text-white/80">
              Gestisci il tuo piano, metodi di pagamento e visualizza le fatture
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <AppleButton 
              variant="secondary"
              onClick={() => router.push('/dashboard/billing')}
            >
              Gestisci Abbonamento
              <ArrowRight className="w-4 h-4 ml-2" />
            </AppleButton>
          </motion.div>
        </AppleCardContent>
      </AppleCard>
    </motion.div>
  )
}
