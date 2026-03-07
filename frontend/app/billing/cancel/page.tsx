'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'

export default function BillingCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-apple-light-gray flex items-center justify-center p-4">
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
              className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4"
            >
              <XCircle className="w-8 h-8 text-orange-600" />
            </motion.div>
            <h1 className="text-title-2 font-semibold text-apple-dark">
              Pagamento Annullato
            </h1>
            <p className="text-body text-apple-gray mt-2">
              Il processo di pagamento è stato annullato. Nessun addebito è stato effettuato.
            </p>
          </AppleCardHeader>

          <AppleCardContent className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-apple-light-gray/50 rounded-xl"
            >
              <h3 className="text-footnote font-semibold text-apple-gray uppercase mb-2">
                Possibili motivi
              </h3>
              <ul className="space-y-2 text-body text-apple-dark">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  Hai annullato il pagamento
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  Il pagamento non è stato completato in tempo
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  Si è verificato un errore tecnico
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-3"
            >
              <AppleButton onClick={() => router.push('/dashboard/billing')}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Riprova
              </AppleButton>
              <AppleButton 
                variant="ghost" 
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Dashboard
              </AppleButton>
            </motion.div>
          </AppleCardContent>
        </AppleCard>
      </motion.div>
    </div>
  )
}
