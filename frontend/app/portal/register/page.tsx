'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Car,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { portalAuth, PortalAuthError } from '@/lib/auth/portal-auth'

export default function PortalRegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gdprConsent: false,
    marketingConsent: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const router = useRouter()

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName) {
      setError('Inserisci nome e cognome')
      return false
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('Inserisci un indirizzo email valido')
      return false
    }
    if (!formData.phone || formData.phone.length < 10) {
      setError('Inserisci un numero di telefono valido')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (formData.password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono')
      return false
    }
    if (!formData.gdprConsent) {
      setError('Devi accettare l\'informativa sulla privacy')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError(null)
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setError(null)
    setStep(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateStep2()) return

    setIsLoading(true)

    try {
      await portalAuth.registerCustomer({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gdprConsent: formData.gdprConsent,
        marketingConsent: formData.marketingConsent,
      })
      router.push('/portal/dashboard')
    } catch (err) {
      if (err instanceof PortalAuthError) {
        setError(err.message)
      } else {
        setError('Errore durante la registrazione. Riprova.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center mx-auto mb-4">
            <Car className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-apple-dark">Crea il tuo account</h1>
          <p className="text-apple-gray mt-1">Inizia a gestire i tuoi veicoli</p>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-apple-blue text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
          </div>
          <div className={`w-12 h-0.5 ${step > 1 ? 'bg-apple-blue' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-apple-blue text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppleCard>
            <AppleCardContent className="p-6 sm:p-8">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-apple-red flex-shrink-0" />
                  <p className="text-sm text-apple-red">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 1 ? (
                  <>
                    {/* Name */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nome</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                          <Input
                            id="firstName"
                            placeholder="Mario"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="pl-12 h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Cognome</Label>
                        <div className="relative">
                          <Input
                            id="lastName"
                            placeholder="Rossi"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="h-12 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="nome@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-12 h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+39 333 1234567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-12 h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    <AppleButton
                      type="button"
                      fullWidth
                      onClick={handleNext}
                      icon={<ArrowRight className="h-4 w-4" />}
                      iconPosition="right"
                      className="h-12"
                    >
                      Continua
                    </AppleButton>
                  </>
                ) : (
                  <>
                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-12 pr-12 h-12 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-gray hover:text-apple-dark"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-apple-gray">Minimo 8 caratteri</p>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Conferma Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pl-12 h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* GDPR Consent */}
                    <div className="flex items-start gap-3 p-4 bg-apple-light-gray/50 rounded-xl">
                      <Shield className="h-5 w-5 text-apple-blue flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="gdpr"
                            checked={formData.gdprConsent}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, gdprConsent: checked as boolean })
                            }
                          />
                          <Label htmlFor="gdpr" className="text-sm text-apple-dark cursor-pointer">
                            Accetto l&apos;{' '}
                            <Link href="/privacy" className="text-apple-blue hover:underline">
                              informativa sulla privacy
                            </Link>
                            {' '}e il trattamento dei dati personali (GDPR)
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Marketing Consent */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="marketing"
                        checked={formData.marketingConsent}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, marketingConsent: checked as boolean })
                        }
                      />
                      <Label htmlFor="marketing" className="text-sm text-apple-gray cursor-pointer">
                        Voglio ricevere offerte e novità (facoltativo)
                      </Label>
                    </div>

                    <div className="flex gap-3">
                      <AppleButton
                        type="button"
                        variant="secondary"
                        onClick={handleBack}
                        className="flex-1 h-12"
                      >
                        Indietro
                      </AppleButton>
                      <AppleButton
                        type="submit"
                        loading={isLoading}
                        className="flex-1 h-12"
                      >
                        Registrati
                      </AppleButton>
                    </div>
                  </>
                )}
              </form>

              {/* Login Link */}
              <div className="mt-6 pt-6 border-t border-apple-border/30 text-center">
                <p className="text-apple-gray text-sm">
                  Hai già un account?{' '}
                  <Link href="/portal/login" className="text-apple-blue font-medium hover:underline">
                    Accedi
                  </Link>
                </p>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-6"
        >
          <Link href="/" className="text-sm text-apple-gray hover:text-apple-dark transition-colors">
            ← Torna al sito principale
          </Link>
        </motion.p>
      </div>
    </div>
  )
}
