'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    async function verifySession() {
      if (!sessionId) {
        setError('Session ID mancante')
        setIsLoading(false)
        return
      }

      try {
        // Verify the checkout session
        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Verifica sessione fallita')
        }

        const data = await response.json()
        
        if (data.status === 'complete') {
          setIsLoading(false)
        } else {
          setError('Pagamento in attesa o incompleto')
          setIsLoading(false)
        }
      } catch (err: unknown) {
        console.error('Session verification error:', err)
        // Don't show error - the webhook will handle it
        setIsLoading(false)
      }
    }

    verifySession()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-apple-light-gray dark:bg-[#212121] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AppleCard>
          <AppleCardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4"
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </motion.div>
            <h1 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">
              {isLoading ? 'Verifica in corso...' : 'Abbonamento Attivato!'}
            </h1>
            <p className="text-body text-apple-gray dark:text-[#636366] mt-2">
              {isLoading 
                ? 'Stiamo confermando il tuo pagamento...'
                : 'Grazie per aver scelto MechMind OS. Il tuo abbonamento è ora attivo.'
              }
            </p>
          </AppleCardHeader>

          <AppleCardContent className="space-y-4">
            {!isLoading && !error && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-apple-light-gray/50 dark:bg-[#353535]/50 rounded-xl"
                >
                  <h3 className="text-footnote font-semibold text-apple-gray dark:text-[#636366] uppercase mb-2">
                    Cosa succede ora?
                  </h3>
                  <ul className="space-y-2 text-body text-apple-dark dark:text-[#ececec]">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Riceverai una email di conferma con i dettagli
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Puoi iniziare subito a usare tutte le funzionalità
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Gestisci il tuo abbonamento dalla dashboard
                    </li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col gap-3"
                >
                  <AppleButton onClick={() => router.push('/dashboard')}>
                    Vai alla Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </AppleButton>
                  <AppleButton 
                    variant="ghost" 
                    onClick={() => router.push('/dashboard/billing')}
                  >
                    Gestisci Abbonamento
                  </AppleButton>
                </motion.div>
              </>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl"
              >
                <p className="text-body text-red-700">{error}</p>
                <AppleButton 
                  variant="secondary" 
                  className="mt-4 w-full"
                  onClick={() => router.push('/dashboard/billing')}
                >
                  Torna alla Fatturazione
                </AppleButton>
              </motion.div>
            )}
          </AppleCardContent>
        </AppleCard>
      </motion.div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-apple-light-gray dark:bg-[#212121] flex items-center justify-center p-4">
        <AppleCard>
          <AppleCardHeader className="text-center">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
            <h1 className="text-title-2 font-semibold text-apple-dark dark:text-[#ececec]">Caricamento...</h1>
          </AppleCardHeader>
        </AppleCard>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}
