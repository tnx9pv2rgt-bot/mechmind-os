'use client';

/**
 * ESEMPIO DI INTEGRAZIONE - Customer Form con Persistenza
 * 
 * Questo file mostra come integrare il sistema di persistenza
 * nel form customer esistente.
 * 
 * Per l'uso reale, copia le modifiche nel file:
 * /frontend/components/customers/customer-form-complete.tsx
 */

import { useState, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Star,
  Award,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Importa il sistema di persistenza
import { FormPersistenceWrapper } from '@/components/form-persistence';

// ============================================================================
// SCHEMA VALIDATION (copiato dal form originale)
// ============================================================================

const emailSchema = z.string()
  .min(1, 'Email richiesta')
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Formato email non valido'
  );

const passwordSchema = z.string()
  .min(8, 'La password deve essere di almeno 8 caratteri')
  .regex(/[a-z]/, 'Almeno una lettera minuscola')
  .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')
  .regex(/[^a-zA-Z0-9]/, 'Almeno un carattere speciale');

const customerFormSchema = z.object({
  customerType: z.enum(['private', 'business']),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Conferma la password'),
  phone: z.string().min(8, 'Telefono non valido'),
  
  // Private fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  
  // Business fields
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
// COMPONENTE PRINCIPALE CON PERSISTENZA
// ============================================================================

export function CustomerFormWithPersistence() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [customerNumber, setCustomerNumber] = useState('')
  
  const totalSteps = 5
  
  // Inizializza React Hook Form
  const form = useForm<CustomerFormData>({
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
    },
    mode: 'onBlur',
  })
  
  const customerType = form.watch('customerType')
  
  // Gestione submit
  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    
    // Simula API call
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    console.log('Customer registered:', data)
    setCustomerNumber(`CLI-${Date.now().toString(36).toUpperCase().slice(-8)}`)
    setIsSubmitting(false)
    setIsSuccess(true)
  }
  
  // Gestione ripristino
  const handleRestore = useCallback((step: number, data: CustomerFormData) => {
    console.log('Form ripristinato:', { step, data })
    // Il form è già popolato automaticamente da useFormPersistence
    // Qui puoi fare azioni aggiuntive se necessario
  }, [])
  
  // Gestione salvataggio completato
  const handleSaveSuccess = useCallback(() => {
    console.log('Form salvato con successo, dati persistenza cancellati')
  }, [])
  
  // Validazione step
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
    const isValid = await form.trigger(fields as any)
    
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
  
  // View success
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <SuccessView 
          customerNumber={customerNumber}
          onClose={() => {
            form.reset()
            setCurrentStep(0)
            setIsSuccess(false)
            setCustomerNumber('')
          }}
        />
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden">
      {/* WRAPPER PERSISTENZA - Racchiude tutto il form */}
      <FormPersistenceWrapper
        form={form}
        formId="customer-registration-v1"
        totalSteps={totalSteps}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onRestore={handleRestore}
        onSaveSuccess={handleSaveSuccess}
        // Opzioni personalizzate
        persistenceOptions={{
          version: 1,
          expirationDays: 7,
          autoSaveInterval: 30000, // 30 secondi
          saveOnBlur: true,
        }}
        exitIntentOptions={{
          maxTriggers: 1,
          activationDelay: 5000,
          enableOnMobile: true,
        }}
        offlineQueueOptions={{
          maxRetries: 3,
        }}
        sessionOptions={{
          enableCrossTabSync: true,
          enableCrossDeviceSync: false,
        }}
        // Toggle componenti UI
        showResumeBanner={true}
        showExitIntent={true}
        showOfflineIndicator={true}
        showSessionTakeover={true}
        showAutoSaveIndicator={true}
        className="w-full h-full"
      >
        {/* CONTENUTO FORM ORIGINALE */}
        <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)] mx-auto">
          {/* Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-purple-100/40 via-blue-100/30 to-green-100/40 blur-3xl" />
            <motion.div 
              className="absolute"
              animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <User className="w-[45%] h-[45%] text-purple-200/30" strokeWidth={0.5} />
            </motion.div>
          </div>
          
          {/* Card */}
          <motion.div 
            className="relative z-10 w-full h-full bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
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
              
              {/* Progress */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              {/* Step indicators */}
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
            
            {/* Form Content */}
            <div className="px-10 pb-24 h-[calc(100%-200px)] overflow-y-auto">
              {currentStep === 0 && <Step0CustomerType form={form} />}
              {currentStep === 1 && <Step1Credentials form={form} />}
              {currentStep === 2 && customerType === 'business' && <Step2Business form={form} />}
              {currentStep === 2 && customerType === 'private' && <Step2PrivateExtra />}
              {currentStep === 3 && <Step3Privacy form={form} />}
              {currentStep === 4 && <Step4Review form={form} onEdit={goToStep} />}
            </div>
            
            {/* Navigation */}
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
                    onClick={form.handleSubmit(onSubmit)}
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
      </FormPersistenceWrapper>
    </div>
  )
}

// ============================================================================
// STEP COMPONENTS (semplificati per l'esempio)
// ============================================================================

function Step0CustomerType({ form }: { form: UseFormReturn<CustomerFormData> }) {
  const customerType = form.watch('customerType')
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
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
          onClick={() => form.setValue('customerType', 'private')}
          className={`p-8 rounded-3xl border-2 transition-all text-center ${
            customerType === 'private'
              ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
              : 'border-gray-200 hover:border-gray-300 bg-white/80'
          }`}
        >
          <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            customerType === 'private' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gray-100'
          }`}>
            <User className={`w-10 h-10 ${customerType === 'private' ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Privato</h3>
          <p className="text-gray-500 text-sm mb-4">Persona fisica</p>
          {customerType === 'private' && (
            <span className="inline-flex items-center gap-1 text-purple-600 text-sm font-medium px-4 py-1.5 bg-purple-100 rounded-full">
              <Check className="w-4 h-4" />Selezionato
            </span>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => form.setValue('customerType', 'business')}
          className={`p-8 rounded-3xl border-2 transition-all text-center ${
            customerType === 'business'
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
              : 'border-gray-200 hover:border-gray-300 bg-white/80'
          }`}
        >
          <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            customerType === 'business' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gray-100'
          }`}>
            <Building2 className={`w-10 h-10 ${customerType === 'business' ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Partita IVA</h3>
          <p className="text-gray-500 text-sm mb-4">Azienda o professionista</p>
          {customerType === 'business' && (
            <span className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium px-4 py-1.5 bg-blue-100 rounded-full">
              <Check className="w-4 h-4" />Selezionato
            </span>
          )}
        </motion.button>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>15,000+ clienti soddisfatti</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>4.8/5 stelle (2,340 recensioni)</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
          <Award className="w-4 h-4 text-purple-500" />
          <span>Garantito al 100%</span>
        </div>
      </div>
    </motion.div>
  )
}

function Step1Credentials({ form }: { form: UseFormReturn<CustomerFormData> }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Credenziali di Accesso</h2>
          <p className="text-gray-500 text-sm">Inserisci i dati per l&apos;account</p>
        </div>
      </div>
      
      {/* Email */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Email *</Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            {...form.register('email')}
            type="email"
            className="pl-12 h-14 rounded-xl"
            placeholder="nome@example.com"
          />
        </div>
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-2">{form.formState.errors.email.message}</p>
        )}
      </div>
      
      {/* Password */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Password *</Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            {...form.register('password')}
            type="password"
            className="pl-12 h-14 rounded-xl"
            placeholder="Minimo 8 caratteri"
          />
        </div>
        {form.formState.errors.password && (
          <p className="text-red-500 text-sm mt-2">{form.formState.errors.password.message}</p>
        )}
      </div>
      
      {/* Confirm Password */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Conferma Password *</Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            {...form.register('confirmPassword')}
            type="password"
            className="pl-12 h-14 rounded-xl"
            placeholder="Ripeti la password"
          />
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-2">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>
      
      {/* Phone */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Telefono *</Label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            {...form.register('phone')}
            type="tel"
            className="pl-12 h-14 rounded-xl"
            placeholder="+39 333 1234567"
          />
        </div>
        {form.formState.errors.phone && (
          <p className="text-red-500 text-sm mt-2">{form.formState.errors.phone.message}</p>
        )}
      </div>
    </motion.div>
  )
}

// Mail already imported above

function Step2Business({ form }: { form: UseFormReturn<CustomerFormData> }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dati Aziendali</h2>
          <p className="text-gray-500 text-sm">Inserisci le informazioni della tua azienda</p>
        </div>
      </div>
      
      {/* Business Name */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Ragione Sociale *</Label>
        <Input 
          {...form.register('businessName')}
          className="h-14 rounded-xl"
          placeholder="Nome della tua azienda"
        />
        {form.formState.errors.businessName && (
          <p className="text-red-500 text-sm mt-2">{form.formState.errors.businessName.message}</p>
        )}
      </div>
      
      {/* VAT Number */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Partita IVA *</Label>
        <Input 
          {...form.register('vatNumber')}
          className="h-14 rounded-xl"
          placeholder="IT12345678901"
        />
        {form.formState.errors.vatNumber && (
          <p className="text-red-500 text-sm mt-2">{form.formState.errors.vatNumber.message}</p>
        )}
      </div>
    </motion.div>
  )
}

function Step2PrivateExtra() {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
          <Check className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dati Completi</h2>
          <p className="text-gray-500 text-sm">I dati principali sono stati raccolti nello step precedente</p>
        </div>
      </div>
      
      <div className="bg-green-50 rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Ottimo lavoro!</h3>
        <p className="text-green-700">
          Hai inserito tutti i dati necessari per un account privato. 
          Procedi allo step successivo per completare la registrazione.
        </p>
      </div>
    </motion.div>
  )
}

function Step3Privacy({ form }: { form: UseFormReturn<CustomerFormData> }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Privacy e Consensi</h2>
          <p className="text-gray-500 text-sm">Gestisci le tue preferenze privacy</p>
        </div>
      </div>
      
      {/* GDPR */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-4">
          <Checkbox 
            id="gdpr"
            checked={form.watch('gdpr')}
            onCheckedChange={(checked) => form.setValue('gdpr', checked as boolean)}
            className="mt-1"
          />
          <div>
            <Label htmlFor="gdpr" className="font-medium text-gray-900 cursor-pointer">
              Accetto il trattamento dei dati personali (GDPR) *
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Dichiaro di aver letto e accettato l&apos;informativa sulla privacy e il trattamento dei dati personali.
            </p>
          </div>
        </div>
        {form.formState.errors.gdpr && (
          <p className="text-red-500 text-sm mt-3">{form.formState.errors.gdpr.message}</p>
        )}
      </div>
      
      {/* Privacy Policy */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-4">
          <Checkbox 
            id="privacy"
            checked={form.watch('privacy')}
            onCheckedChange={(checked) => form.setValue('privacy', checked as boolean)}
            className="mt-1"
          />
          <div>
            <Label htmlFor="privacy" className="font-medium text-gray-900 cursor-pointer">
              Accetto la Privacy Policy *
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Dichiaro di aver letto e accettato i termini e condizioni del servizio.
            </p>
          </div>
        </div>
        {form.formState.errors.privacy && (
          <p className="text-red-500 text-sm mt-3">{form.formState.errors.privacy.message}</p>
        )}
      </div>
      
      {/* Newsletter */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-4">
          <Checkbox 
            id="newsletter"
            checked={form.watch('newsletter')}
            onCheckedChange={(checked) => form.setValue('newsletter', checked as boolean)}
            className="mt-1"
          />
          <div>
            <Label htmlFor="newsletter" className="font-medium text-gray-900 cursor-pointer">
              Iscrivimi alla newsletter (opzionale)
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Ricevi aggiornamenti, offerte speciali e novità sul nostro servizio.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function Step4Review({ form, onEdit }: { form: UseFormReturn<CustomerFormData>, onEdit: (step: number) => void }) {
  const data = form.getValues()
  
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Check className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Riepilogo</h2>
          <p className="text-gray-500 text-sm">Verifica i dati inseriti prima di confermare</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Tipo cliente */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Tipo Cliente</h3>
            <button onClick={() => onEdit(0)} className="text-sm text-purple-600 hover:underline">Modifica</button>
          </div>
          <p className="text-gray-700">{data.customerType === 'private' ? 'Privato' : 'Azienda'}</p>
        </div>
        
        {/* Email */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Email</h3>
            <button onClick={() => onEdit(1)} className="text-sm text-purple-600 hover:underline">Modifica</button>
          </div>
          <p className="text-gray-700">{data.email}</p>
        </div>
        
        {/* Telefono */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Telefono</h3>
            <button onClick={() => onEdit(1)} className="text-sm text-purple-600 hover:underline">Modifica</button>
          </div>
          <p className="text-gray-700">{data.phone}</p>
        </div>
        
        {/* Dati business se applicabile */}
        {data.customerType === 'business' && data.businessName && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Dati Azienda</h3>
              <button onClick={() => onEdit(2)} className="text-sm text-purple-600 hover:underline">Modifica</button>
            </div>
            <p className="text-gray-700">{data.businessName}</p>
            <p className="text-gray-500 text-sm">P.IVA: {data.vatNumber}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function SuccessView({ customerNumber, onClose }: { customerNumber: string, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[40px] shadow-2xl p-12 text-center max-w-md w-full"
    >
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
        <Check className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Registrazione Completata!</h2>
      <p className="text-gray-500 mb-6">Il tuo account è stato creato con successo.</p>
      
      <div className="bg-gray-50 rounded-2xl p-4 mb-8">
        <p className="text-sm text-gray-500 mb-1">Numero Cliente</p>
        <p className="text-2xl font-mono font-bold text-gray-900">{customerNumber}</p>
      </div>
      
      <Button
        onClick={onClose}
        className="w-full h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
      >
        Crea Nuovo Cliente
      </Button>
    </motion.div>
  )
}

// Export
export default CustomerFormWithPersistence;
