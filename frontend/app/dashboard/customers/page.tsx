'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Users, Search, Plus, Mail, Phone, Car, Star, TrendingUp, Gift } from 'lucide-react'
import Link from 'next/link'

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
      ease: [0.25, 0.1, 0.25, 1]
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

const mockCustomers = [
  { id: '1', name: 'Mario Rossi', email: 'mario@email.it', phone: '+39 333 1234567', vehicles: 2, visits: 12, spent: '€3,450', loyalty: 'Gold', lastVisit: '2 giorni fa' },
  { id: '2', name: 'Laura Bianchi', email: 'laura@email.it', phone: '+39 333 7654321', vehicles: 1, visits: 8, spent: '€1,890', loyalty: 'Silver', lastVisit: '1 settimana fa' },
  { id: '3', name: 'Giuseppe Verdi', email: 'giuseppe@email.it', phone: '+39 333 9876543', vehicles: 3, visits: 25, spent: '€8,230', loyalty: 'Platinum', lastVisit: '3 giorni fa' },
  { id: '4', name: 'Anna Neri', email: 'anna@email.it', phone: '+39 333 4567890', vehicles: 1, visits: 5, spent: '€650', loyalty: 'Bronze', lastVisit: '2 settimane fa' },
  { id: '5', name: 'Roberto Marino', email: 'roberto@email.it', phone: '+39 333 1122334', vehicles: 2, visits: 15, spent: '€4,120', loyalty: 'Gold', lastVisit: '5 giorni fa' },
]

const loyaltyColors: Record<string, string> = {
  'Bronze': 'bg-amber-700',
  'Silver': 'bg-slate-400',
  'Gold': 'bg-amber-400',
  'Platinum': 'bg-gradient-to-r from-slate-300 to-white',
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState(mockCustomers)

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header variants={headerVariants} initial="hidden" animate="visible" className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark">Clienti</h1>
            <p className="text-apple-gray text-body mt-1">Gestisci il tuo database clienti</p>
          </div>
          <Link href="/dashboard/customers/new">
            <AppleButton icon={<Plus className="h-4 w-4" />}>
              Nuovo Cliente
            </AppleButton>
          </Link>
        </div>
      </motion.header>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-4 gap-bento">
          {[
            { label: 'Clienti Totali', value: '1,247', icon: Users, color: 'bg-apple-blue' },
            { label: 'Nuovi questo mese', value: '+48', icon: TrendingUp, color: 'bg-apple-green' },
            { label: 'Clienti VIP', value: '156', icon: Star, color: 'bg-apple-purple' },
            { label: 'Programma Fedeltà', value: '892', icon: Gift, color: 'bg-apple-orange' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-apple-gray text-sm">{stat.label}</p>
                    <p className="text-title-1 font-semibold text-apple-dark">{stat.value}</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <AppleCard>
            <AppleCardContent>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                <Input
                  placeholder="Cerca clienti per nome, email o telefono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-2 border-black bg-white text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Customers Grid */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento">
          {filteredCustomers.map((customer, index) => (
            <motion.div key={customer.id} variants={cardVariants}>
              <AppleCard hover className="animate-fade-in">
                <AppleCardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white font-semibold text-lg">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-body font-semibold text-apple-dark">{customer.name}</h3>
                        <span className={`inline-block w-3 h-3 rounded-full ${loyaltyColors[customer.loyalty]} mt-1`} />
                        <span className="text-footnote text-apple-gray ml-2">{customer.loyalty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-footnote text-apple-gray">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-footnote text-apple-gray">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-apple-border/20">
                    <div className="text-center">
                      <p className="text-title-3 font-semibold text-apple-dark">{customer.vehicles}</p>
                      <p className="text-caption text-apple-gray">Veicoli</p>
                    </div>
                    <div className="text-center">
                      <p className="text-title-3 font-semibold text-apple-dark">{customer.visits}</p>
                      <p className="text-caption text-apple-gray">Visite</p>
                    </div>
                    <div className="text-center">
                      <p className="text-title-3 font-semibold text-apple-dark">{customer.spent}</p>
                      <p className="text-caption text-apple-gray">Totale</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-apple-border/20 flex items-center justify-between">
                    <span className="text-footnote text-apple-gray">Ultima visita: {customer.lastVisit}</span>
                    <AppleButton variant="ghost" size="sm">Dettagli</AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
