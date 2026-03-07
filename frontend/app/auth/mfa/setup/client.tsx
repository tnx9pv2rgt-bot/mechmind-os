'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, Smartphone, Key, Copy, Check, AlertTriangle, Download, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Componente Logo (vuoto)
function Logo({ className }: { className?: string }) {
  return null
}

// Background animato stile Apple
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" />
      <motion.div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-200/40 to-purple-200/40 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-200/30 to-pink-200/30 blur-[90px]"
        animate={{
          x: [0, -30, 0],
          y: [0, -50, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[1px]" />
    </div>
  )
}

// Liquid Glass Card
function LiquidGlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.5,
      }}
      className={cn(
        'relative w-full max-w-md overflow-hidden rounded-3xl',
        'bg-white/70 backdrop-blur-3xl',
        'border border-white/50',
        'shadow-2xl shadow-black/5',
        'ring-1 ring-white/50',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-white/30 pointer-events-none" />
      <div className="relative z-10 p-8 sm:p-10">
        {children}
      </div>
    </motion.div>
  )
}

// IOS-style Input
function IOSInput({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ElementType }) {
  return (
    <div className="relative group">
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <Input
        {...props}
        className={cn(
          'h-14 w-full rounded-2xl border-0 bg-white/60',
          'text-base text-gray-900 placeholder:text-gray-400',
          'focus:bg-white focus:ring-2 focus:ring-blue-500/20',
          'transition-all duration-200',
          'shadow-sm',
          Icon && 'pl-12'
        )}
      />
    </div>
  )
}

export function MFASetupPageClient() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleEnroll = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' })
      const data = await res.json()
      if (data.qrCode) {
        setQrCode(data.qrCode)
        setSecret(data.secret)
        setStep(2)
      }
    } catch (e) {
      setError('Errore durante la configurazione')
    }
    setIsLoading(false)
  }

  const handleVerify = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode })
      })
      const data = await res.json()
      if (data.verified) {
        setBackupCodes(data.backupCodes || [])
        setStep(3)
      } else {
        setError('Codice non valido')
      }
    } catch (e) {
      setError('Errore di verifica')
    }
    setIsLoading(false)
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mechmind-backup-codes.txt'
    a.click()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <AnimatedBackground />
      
      <LiquidGlassCard>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">Configura 2FA</h1>
                <p className="text-gray-500">Aggiungi un livello di sicurezza al tuo account</p>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 border border-white/60">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">App Authenticator</p>
                  <p className="text-sm text-gray-500">Google Authenticator, Authy, o 1Password</p>
                </div>
              </div>

              <Button 
                onClick={handleEnroll} 
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? 'Caricamento...' : 'Inizia Configurazione'}
              </Button>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-gray-900">Scansiona il QR Code</h1>
                <p className="text-gray-500">Usa la tua app authenticator</p>
              </div>

              {qrCode && (
                <div className="flex justify-center">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/60 border border-white/60">
                <Key className="h-4 w-4 text-gray-400" />
                <code className="text-sm flex-1 font-mono text-gray-700">{secret}</code>
                <button 
                  onClick={copySecret}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
              </div>

              <IOSInput
                icon={Shield}
                placeholder="Codice a 6 cifre"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />

              <Button 
                onClick={handleVerify} 
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verifica
              </Button>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">2FA Attivato!</h1>
                <p className="text-gray-500">Il tuo account è ora più sicuro</p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                <div className="flex items-center gap-2 text-amber-800 mb-3">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Codici di backup</span>
                </div>
                <p className="text-sm text-amber-700 mb-4">
                  Salva questi codici in un posto sicuro. Servono se perdi l'accesso all'app.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-xs bg-white/80 p-2 rounded-lg font-mono text-center">{code}</code>
                  ))}
                </div>
                <Button 
                  onClick={downloadBackupCodes} 
                  variant="outline" 
                  className="w-full rounded-xl border-amber-200 hover:bg-amber-100/50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica codici
                </Button>
              </div>

              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Vai alla Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </LiquidGlassCard>
    </div>
  )
}
