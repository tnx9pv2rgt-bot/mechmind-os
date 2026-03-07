'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Cookie, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface ConsentPreferences {
  necessary: boolean
  registration: boolean
  marketing: boolean
  analytics: boolean
  personalization: boolean
  thirdParty: boolean
}

const defaultPreferences: ConsentPreferences = {
  necessary: true,
  registration: false,
  marketing: false,
  analytics: false,
  personalization: false,
  thirdParty: false,
}

export function CookieBanner() {
  const [show, setShow] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences)

  useEffect(() => {
    const saved = localStorage.getItem('mechmind-consent')
    if (!saved) {
      setShow(true)
    } else {
      setPreferences(JSON.parse(saved))
    }
  }, [])

  const saveConsent = (prefs: ConsentPreferences) => {
    localStorage.setItem('mechmind-consent', JSON.stringify(prefs))
    localStorage.setItem('mechmind-consent-date', new Date().toISOString())
    setShow(false)
  }

  const acceptAll = () => {
    const all = {
      necessary: true,
      registration: true,
      marketing: true,
      analytics: true,
      personalization: true,
      thirdParty: true,
    }
    setPreferences(all)
    saveConsent(all)
  }

  const acceptSelected = () => {
    saveConsent(preferences)
  }

  const rejectNonEssential = () => {
    const essentialOnly = {
      ...defaultPreferences,
      registration: true,
    }
    setPreferences(essentialOnly)
    saveConsent(essentialOnly)
  }

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-6">
          {!showDetails ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">
                  Usiamo cookie per migliorare la tua esperienza, analizzare il traffico 
                  e personalizzare i contenuti. 
                  <a href="#" className="text-blue-600 hover:underline ml-1">
                    Scopri di più
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Gestisci
                </Button>
                <Button variant="outline" size="sm" onClick={rejectNonEssential}>
                  Rifiuta
                </Button>
                <Button size="sm" onClick={acceptAll}>
                  Accetta tutti
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Gestione consensi
                </h3>
                <button onClick={() => setShowDetails(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <ConsentRow
                  title="Necessari"
                  description="Cookie essenziali per il funzionamento del sito."
                  checked={preferences.necessary}
                  disabled
                />
                <ConsentRow
                  title="Registrazione"
                  description="Per creare e gestire il tuo account."
                  checked={preferences.registration}
                  onChange={(v) => setPreferences(p => ({ ...p, registration: v }))}
                />
                <ConsentRow
                  title="Marketing"
                  description="Offerte personalizzate e newsletter."
                  checked={preferences.marketing}
                  onChange={(v) => setPreferences(p => ({ ...p, marketing: v }))}
                />
                <ConsentRow
                  title="Analytics"
                  description="Analisi anonime per migliorare il servizio."
                  checked={preferences.analytics}
                  onChange={(v) => setPreferences(p => ({ ...p, analytics: v }))}
                />
                <ConsentRow
                  title="Personalizzazione"
                  description="Contenuti e raccomandazioni personalizzate."
                  checked={preferences.personalization}
                  onChange={(v) => setPreferences(p => ({ ...p, personalization: v }))}
                />
                <ConsentRow
                  title="Terze parti"
                  description="Condivisione con partner selezionati."
                  checked={preferences.thirdParty}
                  onChange={(v) => setPreferences(p => ({ ...p, thirdParty: v }))}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={rejectNonEssential}>
                  Solo necessari
                </Button>
                <Button variant="outline" onClick={acceptAll}>
                  Accetta tutti
                </Button>
                <Button onClick={acceptSelected}>
                  Salva preferenze
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ConsentRow({ 
  title, 
  description, 
  checked, 
  onChange, 
  disabled 
}: { 
  title: string
  description: string
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg",
      disabled ? "bg-gray-50" : "hover:bg-gray-50"
    )}>
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  )
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null)
  
  useEffect(() => {
    const saved = localStorage.getItem('mechmind-consent')
    if (saved) {
      setConsent(JSON.parse(saved))
    }
  }, [])
  
  const hasConsent = (type: keyof ConsentPreferences) => {
    return consent?.[type] ?? false
  }
  
  return { consent, hasConsent }
}

export default CookieBanner
