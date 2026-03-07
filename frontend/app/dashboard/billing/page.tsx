'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle, 
  AlertCircle, 
  Download,
  Loader2,
  Sparkles,
  Building2,
  Receipt,
  Settings,
  ExternalLink,
  RotateCcw,
  XCircle,
  Calendar
} from 'lucide-react'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  PRICING_CONFIG, 
  AI_ADDON_PRICE,
  formatStripeAmount,
  formatDate,
  daysUntil,
  getPlanName,
  getSubscriptionStatusLabel,
  getSubscriptionStatusColor,
  createCheckoutSession,
  createPortalSession,
  toggleAiAddon,
  cancelSubscription,
  resumeSubscription,
  SubscriptionPlan,
  TenantBillingInfo,
} from '@/lib/stripe/client'
import { toast } from 'sonner'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
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

export default function BillingPage() {
  const [billingInfo, setBillingInfo] = useState<TenantBillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('piccole')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  // Fetch billing info on mount
  useEffect(() => {
    fetchBillingInfo()
  }, [])

  async function fetchBillingInfo() {
    try {
      const response = await fetch('/api/stripe/billing-info')
      if (response.ok) {
        const data = await response.json()
        setBillingInfo(data)
        if (data.subscription?.plan) {
          setSelectedPlan(data.subscription.plan as SubscriptionPlan)
        }
      }
    } catch (error) {
      console.error('Failed to fetch billing info:', error)
      toast.error('Errore nel caricamento dei dati di fatturazione')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubscribe(plan: SubscriptionPlan, aiAddon: boolean = false) {
    setIsProcessing(true)
    try {
      const { url } = await createCheckoutSession({
        plan,
        aiAddon,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`,
      })
      window.location.href = url
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la creazione del checkout')
      setIsProcessing(false)
    }
  }

  async function handleManagePayment() {
    setIsProcessing(true)
    try {
      const { url } = await createPortalSession(`${window.location.origin}/dashboard/billing`)
      window.location.href = url
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'apertura del portale')
      setIsProcessing(false)
    }
  }

  async function handleToggleAiAddon(enabled: boolean) {
    setIsProcessing(true)
    try {
      await toggleAiAddon(enabled)
      toast.success(enabled ? 'AI Add-on attivato' : 'AI Add-on disattivato')
      await fetchBillingInfo()
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la modifica dell\'AI Add-on')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleCancelSubscription() {
    setIsProcessing(true)
    try {
      await cancelSubscription()
      toast.success('Abbonamento cancellato. Rimarrà attivo fino alla fine del periodo.')
      setShowConfirmCancel(false)
      await fetchBillingInfo()
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la cancellazione')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleResumeSubscription() {
    setIsProcessing(true)
    try {
      await resumeSubscription()
      toast.success('Abbonamento ripristinato con successo')
      await fetchBillingInfo()
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il ripristino')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-apple-blue" />
      </div>
    )
  }

  const hasSubscription = billingInfo?.subscription !== null
  const isCanceling = billingInfo?.subscription?.cancelAtPeriodEnd

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-apple sticky top-0 z-40 border-b border-apple-border/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline text-apple-dark">Fatturazione</h1>
              <p className="text-apple-gray text-body mt-1">
                Gestisci il tuo abbonamento e le fatture
              </p>
            </div>
            {hasSubscription && (
              <AppleButton
                variant="secondary"
                onClick={handleManagePayment}
                disabled={isProcessing}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gestisci Pagamenti
              </AppleButton>
            )}
          </div>
        </div>
      </motion.header>

      <div className="p-8 max-w-7xl">
        <Tabs defaultValue={hasSubscription ? "overview" : "plans"} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8 bg-white p-1 rounded-2xl border border-apple-border/30">
            <TabsTrigger 
              value="overview" 
              className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white"
            >
              Panoramica
            </TabsTrigger>
            <TabsTrigger 
              value="plans" 
              className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white"
            >
              Piani
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="rounded-xl data-[state=active]:bg-apple-blue data-[state=active]:text-white"
            >
              Fatture
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {!hasSubscription ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AppleCard>
                  <AppleCardContent className="text-center py-12">
                    <div className="w-16 h-16 bg-apple-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-apple-blue" />
                    </div>
                    <h3 className="text-title-2 font-semibold text-apple-dark mb-2">
                      Nessun abbonamento attivo
                    </h3>
                    <p className="text-body text-apple-gray mb-6 max-w-md mx-auto">
                      Scegli un piano per iniziare a utilizzare tutte le funzionalità di MechMind OS
                    </p>
                    <AppleButton onClick={() => (document.querySelector('[value="plans"]') as any)?.click()}>
                      Scegli un Piano
                    </AppleButton>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            ) : (
              <>
                {/* Current Plan Card */}
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={fadeInUp}
                >
                  <AppleCard className={isCanceling ? 'border-orange-200' : ''}>
                    <AppleCardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isCanceling ? 'bg-orange-100' : 'bg-gradient-to-br from-apple-blue to-apple-purple'
                          }`}>
                            <Building2 className={`w-5 h-5 ${isCanceling ? 'text-orange-600' : 'text-white'}`} />
                          </div>
                          <div>
                            <h2 className="text-title-2 font-semibold text-apple-dark">
                              Piano {billingInfo?.subscription?.plan ? getPlanName(billingInfo.subscription.plan) : '-'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getSubscriptionStatusColor(billingInfo?.subscription?.status || 'active')
                              }`}>
                                {getSubscriptionStatusLabel(billingInfo?.subscription?.status || 'active')}
                              </span>
                              {isCanceling && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Si cancella il {formatDate(billingInfo.subscription!.currentPeriodEnd)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-headline font-bold text-apple-dark">
                            {formatStripeAmount(PRICING_CONFIG[billingInfo?.subscription?.plan || 'piccole'].amount)}
                          </p>
                          <p className="text-footnote text-apple-gray">/mese</p>
                        </div>
                      </div>
                    </AppleCardHeader>
                    <AppleCardContent className="space-y-4">
                      {/* Progress bar for billing period */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-apple-gray">Periodo di fatturazione</span>
                          <span className="text-apple-dark">
                            {daysUntil(billingInfo?.subscription?.currentPeriodEnd || new Date().toISOString())} giorni rimanenti
                          </span>
                        </div>
                        <div className="h-2 bg-apple-light-gray rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-apple-blue to-apple-purple rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${calculatePeriodProgress(
                              billingInfo?.subscription?.currentPeriodStart || new Date().toISOString(),
                              billingInfo?.subscription?.currentPeriodEnd || new Date().toISOString()
                            )}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                        <div className="flex justify-between text-footnote text-apple-gray">
                          <span>{formatDate(billingInfo?.subscription?.currentPeriodStart || new Date().toISOString())}</span>
                          <span>{formatDate(billingInfo?.subscription?.currentPeriodEnd || new Date().toISOString())}</span>
                        </div>
                      </div>

                      {/* AI Add-on */}
                      <div className="flex items-center justify-between p-4 bg-apple-light-gray/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-body font-medium text-apple-dark">AI Add-on</p>
                            <p className="text-footnote text-apple-gray">
                              {formatStripeAmount(AI_ADDON_PRICE.amount)}/mese
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={billingInfo?.subscription?.aiAddonActive || false}
                          onCheckedChange={handleToggleAiAddon}
                          disabled={isProcessing}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        {isCanceling ? (
                          <AppleButton
                            variant="secondary"
                            onClick={handleResumeSubscription}
                            disabled={isProcessing}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Ripristina Abbonamento
                          </AppleButton>
                        ) : (
                          <AppleButton
                            variant="ghost"
                            onClick={() => setShowConfirmCancel(true)}
                            disabled={isProcessing}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancella Abbonamento
                          </AppleButton>
                        )}
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>

                {/* Usage Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-title-3 font-semibold text-apple-dark mb-4">Utilizzo</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <UsageCard
                      icon={Building2}
                      label="Ispezioni"
                      value={billingInfo?.usage.inspectionsThisMonth || 0}
                      color="bg-blue-100 text-blue-600"
                    />
                    <UsageCard
                      icon={Sparkles}
                      label="Chiamate AI"
                      value={billingInfo?.usage.aiCallsThisMonth || 0}
                      color="bg-purple-100 text-purple-600"
                    />
                    <UsageCard
                      icon={Receipt}
                      label="Storage"
                      value={formatStorage(billingInfo?.usage.storageUsed || 0)}
                      color="bg-green-100 text-green-600"
                    />
                  </div>
                </motion.div>

                {/* Payment Method */}
                {billingInfo?.paymentMethod && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <AppleCard>
                      <AppleCardHeader>
                        <h3 className="text-title-3 font-semibold text-apple-dark">Metodo di Pagamento</h3>
                      </AppleCardHeader>
                      <AppleCardContent>
                        <div className="flex items-center justify-between p-4 bg-apple-light-gray/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-gradient-to-r from-gray-700 to-gray-900 rounded-md flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-body font-medium text-apple-dark capitalize">
                                {billingInfo.paymentMethod.card?.brand} •••• {billingInfo.paymentMethod.card?.last4}
                              </p>
                              <p className="text-footnote text-apple-gray">
                                Scade {billingInfo.paymentMethod.card?.expMonth}/{billingInfo.paymentMethod.card?.expYear}
                              </p>
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      </AppleCardContent>
                    </AppleCard>
                  </motion.div>
                )}
              </>
            )}
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="mt-0">
            <motion.div 
              className="grid grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {(Object.keys(PRICING_CONFIG) as SubscriptionPlan[]).map((plan) => (
                <motion.div key={plan} variants={staggerItem}>
                  <PlanCard
                    plan={plan}
                    pricing={PRICING_CONFIG[plan]}
                    isCurrentPlan={billingInfo?.subscription?.plan === plan}
                    isPopular={PRICING_CONFIG[plan].popular}
                    onSelect={() => {
                      if (!hasSubscription || billingInfo?.subscription?.plan !== plan) {
                        handleSubscribe(plan, billingInfo?.subscription?.aiAddonActive)
                      }
                    }}
                    isProcessing={isProcessing}
                  />
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AppleCard>
                <AppleCardHeader>
                  <h3 className="text-title-3 font-semibold text-apple-dark">Storico Fatture</h3>
                </AppleCardHeader>
                <AppleCardContent>
                  {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
                    <div className="space-y-2">
                      {billingInfo.invoices.map((invoice, index) => (
                        <motion.div
                          key={invoice.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 hover:bg-apple-light-gray/50 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              invoice.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              <Receipt className={`w-5 h-5 ${
                                invoice.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                              }`} />
                            </div>
                            <div>
                              <p className="text-body font-medium text-apple-dark">
                                Fattura #{invoice.number}
                              </p>
                              <p className="text-footnote text-apple-gray">
                                {formatDate(invoice.created)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invoice.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status === 'paid' ? 'Pagata' : 'In attesa'}
                            </span>
                            <span className="text-body font-semibold text-apple-dark">
                              {formatStripeAmount(invoice.amount, invoice.currency)}
                            </span>
                            {invoice.pdfUrl && (
                              <a
                                href={invoice.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-apple-light-gray rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4 text-apple-gray" />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Receipt className="w-12 h-12 text-apple-gray/30 mx-auto mb-4" />
                      <p className="text-body text-apple-gray">Nessuna fattura disponibile</p>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showConfirmCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowConfirmCancel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-title-2 font-semibold text-apple-dark mb-2">
                  Conferma Cancellazione
                </h3>
                <p className="text-body text-apple-gray">
                  Il tuo abbonamento rimarrà attivo fino al{' '}
                  <strong>{formatDate(billingInfo?.subscription?.currentPeriodEnd || '')}</strong>. 
                  Dopo questa data, l'accesso verrà sospeso.
                </p>
              </div>
              <div className="flex gap-3">
                <AppleButton
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowConfirmCancel(false)}
                  disabled={isProcessing}
                >
                  Annulla
                </AppleButton>
                <AppleButton
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Conferma'
                  )}
                </AppleButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper Components

function UsageCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any
  label: string
  value: string | number
  color: string
}) {
  return (
    <AppleCard>
      <AppleCardContent className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-footnote text-apple-gray uppercase tracking-wide">{label}</p>
          <p className="text-title-2 font-bold text-apple-dark">{value}</p>
        </div>
      </AppleCardContent>
    </AppleCard>
  )
}

function PlanCard({ 
  plan, 
  pricing, 
  isCurrentPlan, 
  isPopular,
  onSelect,
  isProcessing
}: { 
  plan: SubscriptionPlan
  pricing: typeof PRICING_CONFIG[SubscriptionPlan]
  isCurrentPlan: boolean
  isPopular?: boolean
  onSelect: () => void
  isProcessing: boolean
}) {
  return (
    <AppleCard className={`h-full flex flex-col ${isPopular ? 'ring-2 ring-apple-blue' : ''} ${isCurrentPlan ? 'bg-apple-light-gray/30' : ''}`}>
      {isPopular && (
        <div className="bg-apple-blue text-white text-xs font-bold uppercase tracking-wider text-center py-2">
          Più Popolare
        </div>
      )}
      {isCurrentPlan && (
        <div className="bg-green-500 text-white text-xs font-bold uppercase tracking-wider text-center py-2">
          Piano Attuale
        </div>
      )}
      <AppleCardHeader className="pb-2">
        <h3 className="text-title-2 font-bold text-apple-dark">{pricing.name}</h3>
        <p className="text-footnote text-apple-gray">{pricing.description}</p>
      </AppleCardHeader>
      <AppleCardContent className="flex-1 flex flex-col">
        <div className="mb-6">
          <span className="text-4xl font-bold text-apple-dark">
            {formatStripeAmount(pricing.amount)}
          </span>
          <span className="text-apple-gray">/mese</span>
        </div>
        <ul className="space-y-3 mb-6 flex-1">
          {pricing.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-body text-apple-dark">{feature}</span>
            </li>
          ))}
        </ul>
        <AppleButton
          variant={isCurrentPlan ? 'secondary' : 'primary'}
          className="w-full"
          onClick={onSelect}
          disabled={isCurrentPlan || isProcessing}
        >
          {isCurrentPlan ? (
            'Attivo'
          ) : isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Scegli Piano'
          )}
        </AppleButton>
      </AppleCardContent>
    </AppleCard>
  )
}

// Utility functions

function calculatePeriodProgress(start: string, end: string): number {
  const startDate = new Date(start).getTime()
  const endDate = new Date(end).getTime()
  const now = Date.now()
  const total = endDate - startDate
  const elapsed = now - startDate
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 MB'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
