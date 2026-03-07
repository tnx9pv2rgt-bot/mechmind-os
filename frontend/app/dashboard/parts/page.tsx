'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Package, Search, ShoppingCart, TrendingDown, Truck, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'

const mockParts = [
  { id: 1, name: 'Kit Pastiglie Freni Brembo', brand: 'Brembo', supplier: 'Autodoc', price: 55.08, stock: 'in-stock', oem: 'BP12345' },
  { id: 2, name: 'Filtro Olio Mann-Filter', brand: 'Mann-Filter', supplier: 'Mister Auto', price: 15.00, stock: 'in-stock', oem: 'HU6007X' },
  { id: 3, name: 'Candele Iridium Bosch', brand: 'Bosch', supplier: 'Bosch Direct', price: 22.68, stock: 'low', oem: 'FR7KI332S' },
  { id: 4, name: 'Ammortizzatore Sachs', brand: 'Sachs', supplier: 'Autodoc', price: 89.90, stock: 'in-stock', oem: 'SAC-5678' },
  { id: 5, name: 'Alternatore Valeo', brand: 'Valeo', supplier: 'Euro Car Parts', price: 245.00, stock: 'out', oem: 'VAL-9012' },
]

const stockConfig: any = {
  'in-stock': { color: 'bg-apple-green', label: 'Disponibile', icon: CheckCircle },
  'low': { color: 'bg-apple-orange', label: 'Pochi rimasti', icon: AlertCircle },
  'out': { color: 'bg-apple-red', label: 'Esaurito', icon: AlertCircle },
}

// Animation variants
const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const staggerItem = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } 
  }
}

const partsListContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
}

const partsListItem = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } 
  }
}

export default function PartsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [cartCount, setCartCount] = useState(0)

  const addToCart = () => {
    setCartCount(c => c + 1)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
        variants={fadeInDown}
        initial="initial"
        animate="animate"
      >
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-headline text-apple-dark">Ricambi</h1>
            <p className="text-apple-gray text-body mt-1">Ricerca multi-fornitore con prezzi real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <AppleButton variant="secondary" icon={<ShoppingCart className="h-4 w-4" />}>
              Carrello
              {cartCount > 0 && (
                <motion.span 
                  className="ml-2 bg-apple-blue text-white text-xs font-bold px-2 py-0.5 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartCount}
                >
                  {cartCount}
                </motion.span>
              )}
            </AppleButton>
          </div>
        </div>
      </motion.header>

      <motion.div 
        className="p-8 space-y-6"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {/* Stats */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-4 gap-bento"
          variants={staggerContainer}
        >
          {[
            { label: 'Ricambi in catalogo', value: '156k+', icon: Package, color: 'bg-apple-blue' },
            { label: 'Fornitori integrati', value: '11', icon: ExternalLink, color: 'bg-apple-green' },
            { label: 'Risparmio medio', value: '-30%', icon: TrendingDown, color: 'bg-apple-purple' },
            { label: 'Consegna express', value: '24h', icon: Truck, color: 'bg-apple-orange' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <AppleCard>
                <AppleCardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-title-1 font-semibold text-apple-dark">{stat.value}</p>
                    <p className="text-apple-gray text-sm">{stat.label}</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Vehicle Context */}
        <motion.div variants={fadeInUp}>
          <AppleCard className="bg-gradient-to-r from-apple-blue/10 to-apple-purple/10 border-apple-blue/20">
            <AppleCardContent className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-apple"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Package className="h-6 w-6 text-apple-blue" />
                </motion.div>
                <div>
                  <p className="text-body font-semibold text-apple-dark">Audi A3 (2018)</p>
                  <p className="text-footnote text-apple-gray">VIN: WAUZZZ8V5JA123456</p>
                </div>
              </div>
              <motion.span 
                className="text-xs font-bold uppercase px-3 py-1.5 rounded-full bg-apple-blue/10 text-apple-blue"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                Ricerca compatibile
              </motion.span>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeInUp}>
          <AppleCard>
            <AppleCardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                  <Input
                    placeholder="Cerca per codice OEM, marca o nome ricambio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-black bg-white text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <AppleButton>Cerca</AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Suppliers */}
        <motion.div 
          className="flex flex-wrap gap-3"
          variants={fadeInUp}
        >
          {['Autodoc', 'Mister Auto', 'Bosch', 'Continental', 'Valeo', 'RockAuto'].map((supplier, index) => (
            <motion.button
              key={supplier}
              className="px-4 py-2 rounded-full bg-white border border-apple-border text-footnote text-apple-dark hover:border-apple-blue hover:text-apple-blue transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {supplier}
            </motion.button>
          ))}
        </motion.div>

        {/* Parts List */}
        <motion.div variants={fadeInUp}>
          <AppleCard>
            <AppleCardHeader>
              <h2 className="text-title-2 font-semibold text-apple-dark">Risultati Ricerca</h2>
            </AppleCardHeader>
            <AppleCardContent>
              <motion.div 
                className="space-y-4"
                variants={partsListContainer}
                initial="initial"
                animate="animate"
              >
                {mockParts.map((part, index) => {
                  const stock = stockConfig[part.stock]
                  const StockIcon = stock.icon
                  
                  return (
                    <motion.div 
                      key={part.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-apple-light-gray/30 hover:bg-white hover:shadow-apple transition-all duration-300"
                      variants={partsListItem}
                      whileHover={{ x: 8, transition: { duration: 0.2 } }}
                    >
                      <div className="flex items-start gap-4">
                        <motion.div 
                          className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-apple"
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Package className="h-8 w-8 text-apple-gray" />
                        </motion.div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-body font-semibold text-apple-dark">{part.name}</h3>
                            <motion.span 
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${stock.color}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.6 + index * 0.1, type: "spring", stiffness: 500, damping: 15 }}
                            >
                              {stock.label}
                            </motion.span>
                          </div>
                          <p className="text-footnote text-apple-gray mb-1">Brand: {part.brand} • Fornitore: {part.supplier}</p>
                          <p className="text-caption text-apple-gray font-mono">OEM: {part.oem}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-title-3 font-bold text-apple-blue">€{part.price.toFixed(2)}</p>
                          <p className="text-caption text-apple-gray">IVA incl.</p>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <AppleButton size="sm" onClick={addToCart}>
                            Aggiungi
                          </AppleButton>
                        </motion.div>
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
