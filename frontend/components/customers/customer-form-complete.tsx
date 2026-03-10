'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  ChevronLeft,
  Shield,
  FileText,
  Bell,
  MapPin,
  Briefcase,
  Loader2,
  Sparkles,
  AlertCircle,
  Star,
  Award,
  Users,
  LockKeyhole,
  Globe,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldCheck,
  Edit3,
  ArrowRight,
  CreditCard,
  BadgeCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type CustomerType = 'private' | 'business'
type MarketingChannel = 'email' | 'sms' | 'whatsapp'

interface PasswordStrength {
  score: number
  feedback: {
    warning: string
    suggestions: string[]
  }
  crackTimesDisplay: {
    onlineThrottling100PerHour: string
    onlineNoThrottling10PerSecond: string
    offlineSlowHashing1e4PerSecond: string
    offlineFastHashing1e10PerSecond: string
  }
}

// ============================================================================
// CONSTANTS & MOCK DATA
// ============================================================================

const BUSINESS_TYPES = [
  { value: 'ditta_individuale', label: 'Ditta Individuale' },
  { value: 'srl', label: 'S.R.L.' },
  { value: 'srls', label: 'S.R.L.S.' },
  { value: 'spa', label: 'S.P.A.' },
  { value: 'sapa', label: 'S.A.P.A.' },
  { value: 'snc', label: 'S.N.C.' },
  { value: 'sas', label: 'S.A.S.' },
  { value: 'ss', label: 'Società Semplice' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'associazione', label: 'Associazione' },
  { value: 'onlus', label: 'ONLUS' },
  { value: 'altro', label: 'Altro' },
]

const ITALIAN_PROVINCES = [
  'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR', 'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG', 'FC', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS', 'MT', 'VS', 'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OG', 'OT', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU', 'PE', 'PC', 'PI', 'PT', 'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV', 'SI', 'SR', 'SO', 'TA', 'TE', 'TR', 'TO', 'OG', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV', 'VI', 'VT',
]

const COMMON_PASSWORDS = [
  '123456', 'password', 'qwerty', '12345678', '111111', '123123', 
  'admin', 'welcome', 'password123', '123456789', 'abc123', 'letmein',
  'monkey', 'dragon', 'master', 'shadow', 'sunshine', 'princess',
  'football', 'baseball', 'iloveyou', 'trustno1', 'whatever', 'starwars',
]

const COUNTRY_CODES = [
  { code: 'IT', name: 'Italia', dialCode: '+39', flag: '🇮🇹', placeholder: '333 123 4567' },
  { code: 'FR', name: 'Francia', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { code: 'DE', name: 'Germania', dialCode: '+49', flag: '🇩🇪', placeholder: '151 12345678' },
  { code: 'ES', name: 'Spagna', dialCode: '+34', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { code: 'CH', name: 'Svizzera', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', placeholder: '650 1234567' },
  { code: 'GB', name: 'Regno Unito', dialCode: '+44', flag: '🇬🇧', placeholder: '7700 123456' },
  { code: 'US', name: 'Stati Uniti', dialCode: '+1', flag: '🇺🇸', placeholder: '(555) 123-4567' },
  { code: 'NL', name: 'Paesi Bassi', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678' },
  { code: 'BE', name: 'Belgio', dialCode: '+32', flag: '🇧🇪', placeholder: '471 23 45 67' },
]

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const passwordSchema = z.string()
  .min(8, 'La password deve essere di almeno 8 caratteri')
  .regex(/[a-z]/, 'Almeno una lettera minuscola')
  .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')
  .regex(/[^a-zA-Z0-9]/, 'Almeno un carattere speciale')

const emailSchema = z.string()
  .min(1, 'Email richiesta')
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Formato email non valido'
  )

const basePrivateSchema = {
  customerType: z.literal('private'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Conferma la password'),
  phone: z.string().min(8, 'Telefono non valido'),
  firstName: z.string().min(2, 'Nome richiesto (min 2 caratteri)').max(50, 'Massimo 50 caratteri'),
  lastName: z.string().min(2, 'Cognome richiesto (min 2 caratteri)').max(50, 'Massimo 50 caratteri'),
  gdpr: z.boolean().refine(val => val === true, { message: 'Accettazione GDPR richiesta' }),
  privacy: z.boolean().refine(val => val === true, { message: 'Accettazione Privacy Policy richiesta' }),
  newsletter: z.boolean().default(false),
  marketing: z.boolean().default(false),
  marketingChannels: z.array(z.enum(['email', 'sms', 'whatsapp'])).default([]),
}

const baseBusinessSchema = {
  customerType: z.literal('business'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Conferma la password'),
  phone: z.string().min(8, 'Telefono non valido'),
  businessName: z.string().min(3, 'Ragione sociale richiesta (min 3 caratteri)').max(150, 'Massimo 150 caratteri'),
  businessType: z.string().min(1, 'Seleziona il tipo di azienda'),
  vatNumber: z.string().regex(/^IT\d{11}$/, 'Formato P.IVA non valido (IT + 11 cifre)'),
  address: z.string().min(5, 'Indirizzo richiesto').max(150, 'Massimo 150 caratteri'),
  postalCode: z.string().regex(/^\d{5}$/, 'CAP deve essere 5 cifre'),
  city: z.string().min(2, 'Città richiesta').max(50, 'Massimo 50 caratteri'),
  province: z.string().length(2, 'Seleziona la provincia'),
  pecEmail: z.string().email('PEC non valida'),
  sdiCode: z.string().regex(/^\d{7}$/, 'Codice SDI deve essere 7 cifre'),
  gdpr: z.boolean().refine(val => val === true, { message: 'Accettazione GDPR richiesta' }),
  privacy: z.boolean().refine(val => val === true, { message: 'Accettazione Privacy Policy richiesta' }),
  newsletter: z.boolean().default(false),
  marketing: z.boolean().default(false),
  marketingChannels: z.array(z.enum(['email', 'sms', 'whatsapp'])).default([]),
}

const privateSchema = z.object(basePrivateSchema).refine(
  data => data.password === data.confirmPassword,
  { message: 'Le password non coincidono', path: ['confirmPassword'] }
)

const businessSchema = z.object(baseBusinessSchema).refine(
  data => data.password === data.confirmPassword,
  { message: 'Le password non coincidono', path: ['confirmPassword'] }
)

// Schema unico flessibile che supporta sia privato che business
const customerFormSchema = z.object({
  customerType: z.enum(['private', 'business']),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Conferma la password'),
  phone: z.string().min(8, 'Telefono non valido'),
  
  // Private fields (optional based on type)
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  
  // Business fields (optional based on type)
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  pecEmail: z.string().optional(),
  sdiCode: z.string().optional(),
  
  // Privacy
  newsletter: z.boolean().default(false),
  marketing: z.boolean().default(false),
  gdpr: z.boolean().refine(val => val === true, { message: 'Devi accettare il trattamento dati GDPR' }),
  privacy: z.boolean().refine(val => val === true, { message: 'Devi accettare la Privacy Policy' }),
}).refine(
  data => data.password === data.confirmPassword,
  { message: 'Le password non coincidono', path: ['confirmPassword'] }
).refine(
  data => {
    if (data.customerType === 'private') {
      return data.firstName && data.firstName.length >= 2 && data.lastName && data.lastName.length >= 2
    }
    return true
  },
  { message: 'Nome e cognome richiesti per privati', path: ['firstName'] }
).refine(
  data => {
    if (data.customerType === 'business') {
      return data.businessName && data.businessName.length >= 3
    }
    return true
  },
  { message: 'Ragione sociale richiesta per business', path: ['businessName'] }
)

type CustomerFormData = z.infer<typeof customerFormSchema>

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Luhn algorithm for Italian VAT number validation
function luhnCheck(vatNumber: string): boolean {
  const digits = vatNumber.replace(/\D/g, '').split('').map(Number)
  if (digits.length !== 11) return false
  
  let sum = 0
  for (let i = 0; i < 11; i++) {
    let digit = digits[i]
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

// Custom password strength calculation
function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0
  const suggestions: string[] = []
  let warning = ''

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return {
      score: 0,
      feedback: { warning: 'Questa è una password molto comune', suggestions: ['Scegli una password unica'] },
      crackTimesDisplay: {
        onlineThrottling100PerHour: 'istantaneo',
        onlineNoThrottling10PerSecond: 'istantaneo',
        offlineSlowHashing1e4PerSecond: 'istantaneo',
        offlineFastHashing1e10PerSecond: 'istantaneo',
      },
    }
  }

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (varietyCount >= 3) score++
  if (varietyCount === 4) score++

  score = Math.min(4, Math.floor(score / 1.5))

  if (password.length < 8) {
    warning = 'Troppo corta'
    suggestions.push('Aggiungi ' + (8 - password.length) + ' caratteri')
  } else if (varietyCount < 3) {
    warning = 'Aggiungi più varietà di caratteri'
    if (!hasUpper) suggestions.push('Aggiungi maiuscole')
    if (!hasNumber) suggestions.push('Aggiungi numeri')
    if (!hasSpecial) suggestions.push('Aggiungi simboli')
  }

  return {
    score,
    feedback: { warning, suggestions },
    crackTimesDisplay: {
      onlineThrottling100PerHour: score < 2 ? 'pochi secondi' : score < 3 ? 'ore' : 'anni',
      onlineNoThrottling10PerSecond: score < 2 ? 'istantaneo' : score < 3 ? 'minuti' : 'mesi',
      offlineSlowHashing1e4PerSecond: score < 2 ? 'istantaneo' : score < 3 ? 'secondi' : 'giorni',
      offlineFastHashing1e10PerSecond: score < 3 ? 'istantaneo' : 'ore',
    },
  }
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerFormComplete() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [customerNumber, setCustomerNumber] = useState('')
  
  const totalSteps = 5
  
  const {
    control,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerType: 'private',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      firstName: '',
      lastName: '',
      businessName: '',
      businessType: 'srl',
      vatNumber: '',
      address: '',
      postalCode: '',
      city: '',
      province: '',
      pecEmail: '',
      sdiCode: '',
      gdpr: false,
      privacy: false,
      newsletter: false,
      marketing: false,
      marketingChannels: [],
    } as CustomerFormData,
    mode: 'onBlur',
  })
  
  const customerType = watch('customerType')
  const marketing = watch('marketing')
  
  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 0:
        return []
      case 1:
        return customerType === 'private'
          ? ['email', 'password', 'confirmPassword', 'phone', 'firstName', 'lastName']
          : ['email', 'password', 'confirmPassword', 'phone']
      case 2:
        return customerType === 'business'
          ? ['businessName', 'businessType', 'vatNumber', 'address', 'postalCode', 'city', 'province', 'pecEmail', 'sdiCode']
          : []
      case 3:
        return ['gdpr', 'privacy']
      default:
        return []
    }
  }
  
  const nextStep = async () => {
    const fields = getStepFields(currentStep)
    const isValid = await trigger(fields as any)
    
    if (isValid && currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }
  
  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 2500))
    console.log('Customer registered:', data)
    setCustomerNumber(`CLI-${Date.now().toString(36).toUpperCase().slice(-8)}`)
    setIsSubmitting(false)
    setIsSuccess(true)
  }
  
  const handleCreateNew = () => {
    reset()
    setCurrentStep(0)
    setIsSuccess(false)
    setCustomerNumber('')
  }
  
  if (isSuccess) {
    return <SuccessView customerNumber={customerNumber} onClose={handleCreateNew} />
  }
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden">
      <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-purple-100/40 via-blue-100/30 to-green-100/40 blur-3xl" />
          <motion.div 
            className="absolute"
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Users className="w-[45%] h-[45%] text-purple-200/30" strokeWidth={0.5} />
          </motion.div>
        </div>
        
        <motion.div 
          className="relative z-10 w-full h-full bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="px-10 pt-8 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Nuovo Cliente</h1>
                <p className="text-gray-500 mt-1">Registra un nuovo cliente nel sistema</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Step</span>
                <span className="text-2xl font-bold text-purple-600">{currentStep + 1}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-400">{totalSteps}</span>
              </div>
            </div>
            
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-4">
              {['Tipo', 'Credenziali', customerType === 'business' ? 'Azienda' : 'Dati', 'Privacy', 'Riepilogo'].map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => idx < currentStep && goToStep(idx)}
                  className={`flex items-center gap-2 transition-all ${
                    idx <= currentStep ? 'text-purple-600 cursor-pointer hover:text-purple-700' : 'text-gray-400'
                  } ${idx < currentStep ? 'hover:scale-105' : ''}`}
                  disabled={idx > currentStep}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    idx < currentStep ? 'bg-green-500 text-white' : idx === currentStep ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="px-10 pb-24 h-[calc(100%-200px)] overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStep === 0 && <Step0CustomerType key="step0" control={control} watch={watch} setValue={setValue} />}
              {currentStep === 1 && <Step1Credentials key="step1" control={control} errors={errors} watch={watch} trigger={trigger} />}
              {currentStep === 2 && customerType === 'business' && <Step2Business key="step2" control={control} errors={errors} watch={watch} setValue={setValue} trigger={trigger} />}
              {currentStep === 2 && customerType === 'private' && <Step2PrivateExtra key="step2-private" />}
              {currentStep === 3 && <Step3Privacy key="step3" control={control} errors={errors} watch={watch} setValue={setValue} />}
              {currentStep === 4 && <Step4Review key="step4" watch={watch} onEdit={goToStep} />}
            </AnimatePresence>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 backdrop-blur-xl border-t border-gray-200/50">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="rounded-full px-6 h-12 border-gray-300 hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Indietro
              </Button>
              
              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={nextStep}
                  className="rounded-full px-8 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Avanti
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="rounded-full px-8 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creazione in corso...</>
                  ) : (
                    <><Check className="w-5 h-5 mr-2" />Crea Account</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ============================================================================
// STEP 0: CUSTOMER TYPE SELECTOR
// ============================================================================

function Step0CustomerType(props: Record<string, unknown>) {
  const watch = props.watch as (name: string) => string;
  const setValue = props.setValue as (name: string, value: unknown) => void;
  const customerType = watch('customerType')
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tipo di Cliente</h2>
          <p className="text-gray-500 text-sm">Seleziona la tipologia di account da creare</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setValue('customerType', 'private')}
          className={`p-8 rounded-3xl border-2 transition-all text-center ${
            customerType === 'private'
              ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
              : 'border-gray-200 hover:border-gray-300 bg-white/80'
          }`}
        >
          <motion.div 
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              customerType === 'private' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gray-100'
            }`}
            animate={customerType === 'private' ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <User className={`w-10 h-10 ${customerType === 'private' ? 'text-white' : 'text-gray-400'}`} />
          </motion.div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Privato</h3>
          <p className="text-gray-500 text-sm mb-4">Persona fisica</p>
          {customerType === 'private' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 text-purple-600 text-sm font-medium px-4 py-1.5 bg-purple-100 rounded-full"
            >
              <Check className="w-4 h-4" />Selezionato
            </motion.div>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setValue('customerType', 'business')}
          className={`p-8 rounded-3xl border-2 transition-all text-center ${
            customerType === 'business'
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
              : 'border-gray-200 hover:border-gray-300 bg-white/80'
          }`}
        >
          <motion.div 
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              customerType === 'business' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gray-100'
            }`}
            animate={customerType === 'business' ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Building2 className={`w-10 h-10 ${customerType === 'business' ? 'text-white' : 'text-gray-400'}`} />
          </motion.div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Partita IVA</h3>
          <p className="text-gray-500 text-sm mb-4">Azienda o professionista</p>
          {customerType === 'business' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium px-4 py-1.5 bg-blue-100 rounded-full"
            >
              <Check className="w-4 h-4" />Selezionato
            </motion.div>
          )}
        </motion.button>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
        <motion.div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>15,000+ clienti soddisfatti</span>
        </motion.div>
        <motion.div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>4.8/5 stelle (2,340 recensioni)</span>
        </motion.div>
        <motion.div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Award className="w-4 h-4 text-purple-500" />
          <span>Garantito al 100%</span>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 1: CREDENTIALS
// ============================================================================

function Step1Credentials({ control, errors, watch, trigger }: any) {
  const customerType = watch('customerType')
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0])
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  
  useEffect(() => {
    if (password && password.length > 0) {
      setPasswordStrength(calculatePasswordStrength(password))
    } else {
      setPasswordStrength(null)
    }
  }, [password])
  
  const checkEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle')
      return
    }
    setEmailStatus('checking')
    await new Promise(resolve => setTimeout(resolve, 800))
    const takenEmails = ['test@test.com', 'admin@mechmind.it', 'demo@example.com']
    setEmailStatus(takenEmails.includes(email.toLowerCase()) ? 'taken' : 'available')
  }, [])
  
  const debouncedCheckEmail = useCallback(debounce((email: string) => checkEmail(email), 500), [checkEmail])
  
  const handleEmailChange = (email: string, onChange: (value: string) => void) => {
    onChange(email)
    setEmailStatus('idle')
    debouncedCheckEmail(email)
  }
  
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']
  const strengthLabels = ['Molto debole', 'Debole', 'Media', 'Forte', 'Eccellente']
  
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
          <LockKeyhole className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Credenziali di Accesso</h2>
          <p className="text-gray-500 text-sm">Inserisci i dati per l&apos;account</p>
        </div>
      </div>
      
      {/* Email */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Email * <span className="text-gray-400 font-normal">(Ti invieremo link di verifica)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  {...field} 
                  type="email"
                  onChange={(e) => handleEmailChange(e.target.value, field.onChange)}
                  onBlur={() => trigger('email')}
                  className={`pl-12 h-14 rounded-xl transition-all ${
                    emailStatus === 'available' ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' : 
                    emailStatus === 'taken' ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 
                    'border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                  }`}
                  placeholder="nome@example.com"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {emailStatus === 'checking' && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                  {emailStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {emailStatus === 'taken' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </div>
              <AnimatePresence>
                {emailStatus === 'available' && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-green-600 text-sm mt-2 flex items-center gap-1">
                    <Check className="w-4 h-4" />Email disponibile
                  </motion.p>
                )}
                {emailStatus === 'taken' && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Email già registrata. <a href="/auth" className="underline hover:text-red-700">Accedi</a>
                  </motion.p>
                )}
              </AnimatePresence>
              {errors.email && <p className="text-red-500 text-sm mt-2">{errors.email.message as string}</p>}
            </div>
          )}
        />
      </div>
      
      {/* Password */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  {...field} 
                  type={showPassword ? 'text' : 'password'}
                  className="pl-12 pr-12 h-14 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  placeholder="Minimo 8 caratteri"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              <AnimatePresence>
                {passwordStrength && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Sicurezza password:</span>
                        <span className={`text-xs font-medium ${
                          passwordStrength.score <= 1 ? 'text-red-500' : passwordStrength.score === 2 ? 'text-orange-500' : passwordStrength.score === 3 ? 'text-yellow-500' : 'text-green-500'
                        }`}>{strengthLabels[passwordStrength.score]}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className={`h-full transition-all duration-500 ${strengthColors[passwordStrength.score]}`} initial={{ width: 0 }} animate={{ width: `${((passwordStrength.score + 1) / 5) * 100}%` }} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Tempo stimato per crackare: <strong className="text-gray-900">{passwordStrength.crackTimesDisplay.onlineThrottling100PerHour}</strong> (attacco online)
                      </span>
                    </div>
                    
                    {passwordStrength.feedback.warning && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-amber-700">{passwordStrength.feedback.warning}</span>
                      </div>
                    )}
                    
                    {passwordStrength.feedback.suggestions.length > 0 && (
                      <div className="space-y-1">
                        {passwordStrength.feedback.suggestions.map((suggestion: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                            <Sparkles className="w-3 h-3" />{suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <RequirementCheck met={password.length >= 8} label="Minimo 8 caratteri" />
                      <RequirementCheck met={/[a-z]/.test(password)} label="Lettera minuscola" />
                      <RequirementCheck met={/[A-Z]/.test(password)} label="Lettera maiuscola" />
                      <RequirementCheck met={/[0-9]/.test(password)} label="Almeno un numero" />
                      <RequirementCheck met={/[^a-zA-Z0-9]/.test(password)} label="Carattere speciale" className="col-span-2" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {errors.password && <p className="text-red-500 text-sm mt-2">{errors.password.message as string}</p>}
            </div>
          )}
        />
      </div>
      
      {/* Confirm Password */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Conferma Password *</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  {...field} 
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="pl-12 pr-12 h-14 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  placeholder="Ripeti la password"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {confirmPassword && confirmPassword === password && (
                  <CheckCircle2 className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-2">{errors.confirmPassword.message as string}</p>}
            </div>
          )}
        />
      </div>
      
      {/* Phone */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Telefono * <span className="text-gray-400 font-normal">(Per notifiche e 2FA)</span>
              </Label>
              <div className="flex gap-2">
                <Select value={selectedCountry.code} onValueChange={(code) => {
                  const country = COUNTRY_CODES.find(c => c.code === code)
                  if (country) setSelectedCountry(country)
                }}>
                  <SelectTrigger className="w-[100px] h-14 rounded-xl bg-white border-gray-200">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm ml-2">{selectedCountry.dialCode}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{country.flag}</span>
                          <span className="text-sm">{country.name}</span>
                          <span className="text-sm text-gray-400">{country.dialCode}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input {...field} type="tel" className="pl-12 h-14 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20" placeholder={selectedCountry.placeholder} />
                </div>
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-2">{errors.phone.message as string}</p>}
            </div>
          )}
        />
      </div>
      
      {/* Private Customer Fields */}
      {customerType === 'private' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Nome *</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input {...field} className="pl-12 h-14 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20" placeholder="Giovanni" />
                </div>
                {errors.firstName && <p className="text-red-500 text-sm mt-2">{errors.firstName.message as string}</p>}
              </div>
            )}
          />
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Cognome *</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input {...field} className="pl-12 h-14 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20" placeholder="Rossi" />
                </div>
                {errors.lastName && <p className="text-red-500 text-sm mt-2">{errors.lastName.message as string}</p>}
              </div>
            )}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function RequirementCheck({ met, label, className = '' }: { met: boolean; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {met ? <Check className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
      <span className={`text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}

// ============================================================================
// STEP 2: BUSINESS INFORMATION
// ============================================================================

function Step2Business({ control, errors, watch, setValue, trigger }: any) {
  const [isCheckingVat, setIsCheckingVat] = useState(false)
  const [vatVerified, setVatVerified] = useState(false)
  const [vatError, setVatError] = useState<string | null>(null)
  const vatNumber = watch('vatNumber')
  
  const verifyVat = async () => {
    if (!vatNumber || vatNumber.length !== 13) {
      setVatError('Inserisci una P.IVA valida (IT + 11 cifre)')
      return
    }
    
    setIsCheckingVat(true)
    setVatError(null)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Validate Luhn checksum
    const isLuhnValid = luhnCheck(vatNumber)
    
    if (isLuhnValid) {
      setVatVerified(true)
      // Mock auto-populate from API
      setValue('businessName', 'Rossi & C. S.R.L.')
      setValue('address', 'Via Milano 123')
      setValue('postalCode', '20121')
      setValue('city', 'Milano')
      setValue('province', 'MI')
    } else {
      setVatVerified(false)
      setVatError('Codice fiscale/P.IVA non valido (checksum errato)')
    }
    
    setIsCheckingVat(false)
  }
  
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dati Azienda</h2>
          <p className="text-gray-500 text-sm">Inserisci i dati della Partita IVA</p>
        </div>
      </div>
      
      {/* Business Name */}
      <Controller
        name="businessName"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Ragione Sociale *</Label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input {...field} className="pl-12 h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" placeholder="Es. Rossi & C. S.R.L." />
            </div>
            {errors.businessName && <p className="text-red-500 text-sm mt-2">{errors.businessName.message as string}</p>}
          </div>
        )}
      />
      
      {/* Business Type */}
      <Controller
        name="businessType"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipo Azienda *</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="h-14 rounded-xl bg-white border-gray-200">
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessType && <p className="text-red-500 text-sm mt-2">{errors.businessType.message as string}</p>}
          </div>
        )}
      />
      
      {/* VAT Number */}
      <Controller
        name="vatNumber"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Partita IVA * <span className="text-xs text-gray-400">(Formato: IT12345678901)</span>
            </Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="text-lg">🇮🇹</span>
                  <span className="text-gray-400 text-sm font-mono">IT</span>
                </div>
                <Input 
                  {...field} 
                  className="pl-14 h-14 rounded-xl font-mono tracking-wider border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  placeholder="12345678901"
                  maxLength={13}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^0-9]/g, '')
                    if (!value.startsWith('IT')) {
                      value = 'IT' + value
                    }
                    field.onChange(value.slice(0, 13))
                    setVatVerified(false)
                    setVatError(null)
                  }}
                />
              </div>
              <Button type="button" onClick={verifyVat} disabled={isCheckingVat || !field.value || field.value.length < 13} className="h-14 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                {isCheckingVat ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" />Verifica</>}
              </Button>
            </div>
            
            <AnimatePresence>
              {vatVerified && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-green-50 rounded-xl flex items-center gap-2 text-green-700 text-sm border border-green-200">
                  <BadgeCheck className="w-5 h-5" />
                  <span className="font-medium">Verificata con Agenzia delle Entrate</span>
                </motion.div>
              )}
              {vatError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-red-50 rounded-xl flex items-center gap-2 text-red-700 text-sm border border-red-200">
                  <AlertCircle className="w-5 h-5" />
                  <span>{vatError}</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {errors.vatNumber && !vatError && <p className="text-red-500 text-sm mt-2">{errors.vatNumber.message as string}</p>}
          </div>
        )}
      />
      
      {/* Address */}
      <Controller
        name="address"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Indirizzo *</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input {...field} className="pl-12 h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" placeholder="Via Roma 123" />
            </div>
            {errors.address && <p className="text-red-500 text-sm mt-2">{errors.address.message as string}</p>}
          </div>
        )}
      />
      
      {/* CAP & City */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Controller
          name="postalCode"
          control={control}
          render={({ field }) => (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">CAP *</Label>
              <Input {...field} className="h-14 rounded-xl text-center font-mono border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" placeholder="20100" maxLength={5} />
              {errors.postalCode && <p className="text-red-500 text-sm mt-2">{errors.postalCode.message as string}</p>}
            </div>
          )}
        />
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 sm:col-span-2">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Città *</Label>
              <Input {...field} className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" placeholder="Milano" />
              {errors.city && <p className="text-red-500 text-sm mt-2">{errors.city.message as string}</p>}
            </div>
          )}
        />
      </div>
      
      {/* Province */}
      <Controller
        name="province"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Provincia *</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="h-14 rounded-xl bg-white border-gray-200">
                <SelectValue placeholder="Seleziona provincia" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {ITALIAN_PROVINCES.map((prov) => (
                  <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.province && <p className="text-red-500 text-sm mt-2">{errors.province.message as string}</p>}
          </div>
        )}
      />
      
      {/* PEC & SDI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="pecEmail"
          control={control}
          render={({ field }) => (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Email PEC *</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} type="email" className="pl-12 h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" placeholder="azienda@pec.it" />
              </div>
              {errors.pecEmail && <p className="text-red-500 text-sm mt-2">{errors.pecEmail.message as string}</p>}
            </div>
          )}
        />
        <Controller
          name="sdiCode"
          control={control}
          render={({ field }) => (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Codice SDI *</Label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} className="pl-12 h-14 rounded-xl text-center font-mono border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" placeholder="0000000" maxLength={7} />
              </div>
              {errors.sdiCode && <p className="text-red-500 text-sm mt-2">{errors.sdiCode.message as string}</p>}
            </div>
          )}
        />
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 2: PRIVATE EXTRA
// ============================================================================

function Step2PrivateExtra() {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dati Aggiuntivi</h2>
          <p className="text-gray-500 text-sm">Informazioni opzionali per cliente privato</p>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl p-8 border border-green-200 text-center">
        <motion.div 
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Tutti i dati necessari sono stati inseriti!</h3>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Per i clienti privati non sono richiesti ulteriori dati. Procedi al passaggio successivo per completare la registrazione.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge variant="secondary" className="bg-white text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />Email verificata
          </Badge>
          <Badge variant="secondary" className="bg-white text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />Password sicura
          </Badge>
          <Badge variant="secondary" className="bg-white text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />Telefono valido
          </Badge>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 3: PRIVACY & CONSENT
// ============================================================================

function Step3Privacy({ control, errors, watch, setValue }: any) {
  const marketing = watch('marketing')
  const marketingChannels = watch('marketingChannels') || []
  
  const toggleChannel = (channel: MarketingChannel) => {
    const current = marketingChannels || []
    if (current.includes(channel)) {
      setValue('marketingChannels', current.filter((c: MarketingChannel) => c !== channel))
    } else {
      setValue('marketingChannels', [...current, channel])
    }
  }
  
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Privacy e Consensi</h2>
          <p className="text-gray-500 text-sm">Gestisci le tue preferenze privacy</p>
        </div>
      </div>
      
      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm mb-6">
        <motion.div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-gray-200" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <LockKeyhole className="w-4 h-4 text-green-500" />
          <span className="text-gray-700">Crittografia AES-256</span>
        </motion.div>
        <motion.div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-gray-200" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span className="text-gray-700">GDPR Compliant</span>
        </motion.div>
        <motion.div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-gray-200" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Award className="w-4 h-4 text-amber-500" />
          <span className="text-gray-700">SSL/TLS</span>
        </motion.div>
      </div>
      
      {/* GDPR - Mandatory */}
      <Controller
        name="gdpr"
        control={control}
        render={({ field }) => (
          <div className={`rounded-3xl p-6 border-2 transition-all ${field.value ? 'bg-green-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'}`}>
            <div className="flex items-start gap-4">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" />
              <div className="flex-1">
                <Label className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2">
                  Accetto il trattamento dei dati secondo GDPR *
                  {field.value && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Autorizzo il trattamento dei miei dati personali per la gestione del mio account e dei servizi richiesti. 
                  <a href="/gdpr" className="text-blue-600 hover:underline ml-1 font-medium">Leggi l&apos;informativa completa</a>
                </p>
              </div>
            </div>
            {errors.gdpr && <p className="text-red-500 text-sm mt-2 ml-8">{errors.gdpr.message as string}</p>}
          </div>
        )}
      />
      
      {/* Privacy Policy - Mandatory */}
      <Controller
        name="privacy"
        control={control}
        render={({ field }) => (
          <div className={`rounded-3xl p-6 border-2 transition-all ${field.value ? 'bg-green-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'}`}>
            <div className="flex items-start gap-4">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" />
              <div className="flex-1">
                <Label className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2">
                  Accetto Privacy Policy e Termini di Servizio *
                  {field.value && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Ho letto e accetto i 
                  <a href="/termini" className="text-blue-600 hover:underline mx-1 font-medium">Termini di Servizio</a>
                  e la
                  <a href="/privacy" className="text-blue-600 hover:underline ml-1 font-medium">Privacy Policy</a>
                </p>
              </div>
            </div>
            {errors.privacy && <p className="text-red-500 text-sm mt-2 ml-8">{errors.privacy.message as string}</p>}
          </div>
        )}
      />
      
      {/* Newsletter - Optional */}
      <Controller
        name="newsletter"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-purple-200 transition-colors">
            <div className="flex items-start gap-4">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
              <div className="flex-1">
                <Label className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-500" />
                  Iscrivimi alla newsletter
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Ricevi tips, promozioni esclusive, aggiornamenti servizi. 
                  Puoi disiscriverti sempre. <span className="text-green-600 font-medium">10,000+ clienti iscritti</span>
                </p>
              </div>
            </div>
          </div>
        )}
      />
      
      {/* Marketing - Optional */}
      <Controller
        name="marketing"
        control={control}
        render={({ field }) => (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-amber-200 transition-colors">
            <div className="flex items-start gap-4">
              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
              <div className="flex-1">
                <Label className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Voglio offerte speciali e promozioni personalizzate
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Ricevi sconti su manutenzione, prodotti consigliati e offerte personalizzate
                </p>
              </div>
            </div>
            
            {/* Marketing Channels */}
            <AnimatePresence>
              {marketing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 ml-8">
                  <p className="text-sm text-gray-500 mb-3">Su quali canali preferisci ricevere le comunicazioni?</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleChannel('email')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${marketingChannels.includes('email') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
                      <Mail className="w-4 h-4" />Email{marketingChannels.includes('email') && <Check className="w-3 h-3" />}
                    </button>
                    <button type="button" onClick={() => toggleChannel('sms')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${marketingChannels.includes('sms') ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
                      <Smartphone className="w-4 h-4" />SMS{marketingChannels.includes('sms') && <Check className="w-3 h-3" />}
                    </button>
                    <button type="button" onClick={() => toggleChannel('whatsapp')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${marketingChannels.includes('whatsapp') ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
                      <MessageSquare className="w-4 h-4" />WhatsApp{marketingChannels.includes('whatsapp') && <Check className="w-3 h-3" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      />
    </motion.div>
  )
}

// ============================================================================
// STEP 4: REVIEW
// ============================================================================

function Step4Review({ watch, onEdit }: { watch: any; onEdit: (step: number) => void }) {
  const customerType = watch('customerType')
  const email = watch('email')
  const phone = watch('phone')
  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const businessName = watch('businessName')
  const businessType = watch('businessType')
  const vatNumber = watch('vatNumber')
  const address = watch('address')
  const postalCode = watch('postalCode')
  const city = watch('city')
  const province = watch('province')
  const pecEmail = watch('pecEmail')
  const sdiCode = watch('sdiCode')
  const gdpr = watch('gdpr')
  const privacy = watch('privacy')
  const newsletter = watch('newsletter')
  const marketing = watch('marketing')
  const marketingChannels = watch('marketingChannels') || []
  
  const getBusinessTypeLabel = (value: string) => {
    return BUSINESS_TYPES.find(t => t.value === value)?.label || value
  }
  
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Riepilogo</h2>
          <p className="text-gray-500 text-sm">Verifica i dati inseriti prima di creare l&apos;account</p>
        </div>
      </div>
      
      {/* Account Type */}
      <ReviewSection title="Tipo Account" onEdit={() => onEdit(0)}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${customerType === 'private' ? 'bg-purple-100' : 'bg-blue-100'}`}>
            {customerType === 'private' ? <User className="w-5 h-5 text-purple-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
          </div>
          <div>
            <p className="font-medium text-gray-900">{customerType === 'private' ? 'Cliente Privato' : 'Azienda / Partita IVA'}</p>
            <p className="text-sm text-gray-500">{customerType === 'private' ? 'Persona fisica' : 'Professionista o società'}</p>
          </div>
        </div>
      </ReviewSection>
      
      {/* Credentials */}
      <ReviewSection title="Credenziali" onEdit={() => onEdit(1)}>
        <div className="space-y-3">
          <ReviewItem icon={<Mail className="w-4 h-4" />} label="Email" value={email} />
          <ReviewItem icon={<Phone className="w-4 h-4" />} label="Telefono" value={phone} />
          {customerType === 'private' && (
            <>
              <ReviewItem icon={<User className="w-4 h-4" />} label="Nome" value={firstName} />
              <ReviewItem icon={<User className="w-4 h-4" />} label="Cognome" value={lastName} />
            </>
          )}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <LockKeyhole className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Password impostata e verificata</span>
          </div>
        </div>
      </ReviewSection>
      
      {/* Business Details (if applicable) */}
      {customerType === 'business' && (
        <ReviewSection title="Dati Azienda" onEdit={() => onEdit(2)}>
          <div className="space-y-3">
            <ReviewItem icon={<Building2 className="w-4 h-4" />} label="Ragione Sociale" value={businessName} />
            <ReviewItem icon={<Briefcase className="w-4 h-4" />} label="Tipo" value={getBusinessTypeLabel(businessType)} />
            <div className="flex items-center gap-2">
              <span className="text-lg">🇮🇹</span>
              <span className="text-sm text-gray-500">P.IVA:</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                <BadgeCheck className="w-3 h-3 mr-1" />{vatNumber}
              </Badge>
            </div>
            <ReviewItem icon={<MapPin className="w-4 h-4" />} label="Indirizzo" value={`${address}, ${postalCode} ${city} (${province})`} />
            <ReviewItem icon={<Mail className="w-4 h-4" />} label="PEC" value={pecEmail} />
            <ReviewItem icon={<CreditCard className="w-4 h-4" />} label="Codice SDI" value={sdiCode} />
          </div>
        </ReviewSection>
      )}
      
      {/* Privacy & Consent */}
      <ReviewSection title="Privacy e Consensi" onEdit={() => onEdit(3)}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">GDPR accettato</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Privacy Policy accettata</span>
          </div>
          {newsletter && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl">
              <Bell className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700">Iscritto alla newsletter</span>
            </div>
          )}
          {marketing && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
              <Star className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">Marketing abilitato ({marketingChannels.join(', ')})</span>
            </div>
          )}
        </div>
      </ReviewSection>
      
      {/* Final Notice */}
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Clicca &quot;Crea Account&quot; per completare la registrazione</p>
            <p className="text-sm text-blue-700 mt-1">
              Riceverai un&apos;email di conferma all&apos;indirizzo {email} con il link per attivare il tuo account.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ReviewSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onEdit} className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
          <Edit3 className="w-4 h-4" />Modifica
        </button>
      </div>
      {children}
    </div>
  )
}

function ReviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}

// ============================================================================
// SUCCESS VIEW
// ============================================================================

function SuccessView({ customerNumber, onClose }: { customerNumber: string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden z-50">
      <div className="w-[min(900px,95vw)] h-[min(900px,95vh)] bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 flex flex-col items-center justify-center p-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }} className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8 shadow-lg shadow-green-200">
          <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <Check className="w-16 h-16 text-white" strokeWidth={3} />
          </motion.div>
        </motion.div>
        
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-bold text-gray-900 mb-4">
          Account Creato con Successo!
        </motion.h2>
        
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-gray-600 mb-8 max-w-md">
          Il cliente è stato registrato correttamente nel sistema. È stata inviata un&apos;email di verifica all&apos;indirizzo fornito.
        </motion.p>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 rounded-2xl p-8 mb-8 border border-gray-200 w-full max-w-sm">
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider font-medium">Codice Cliente</p>
          <p className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            {customerNumber}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-col sm:flex-row gap-4">
          <Button onClick={onClose} className="rounded-full px-8 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
            <Users className="w-5 h-5 mr-2" />
            Crea Nuovo Cliente
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/customers'} className="rounded-full px-8 h-14 border-gray-300 hover:bg-gray-100">
            <ArrowRight className="w-5 h-5 mr-2" />
            Vai alla lista clienti
          </Button>
        </motion.div>
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 flex items-center gap-2 text-sm text-gray-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Dati protetti con crittografia AES-256</span>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default CustomerFormComplete
