'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useForm,
  Controller,
  Control,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
  UseFormTrigger,
  FieldPath,
} from 'react-hook-form';
import { useCreateCustomer } from '@/hooks/useApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type CustomerType = 'private' | 'business';
type MarketingChannel = 'email' | 'sms' | 'whatsapp';

interface PasswordStrength {
  score: number;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimesDisplay: {
    onlineThrottling100PerHour: string;
    onlineNoThrottling10PerSecond: string;
    offlineSlowHashing1e4PerSecond: string;
    offlineFastHashing1e10PerSecond: string;
  };
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
];

const ITALIAN_PROVINCES = [
  'AG',
  'AL',
  'AN',
  'AO',
  'AR',
  'AP',
  'AT',
  'AV',
  'BA',
  'BT',
  'BL',
  'BN',
  'BG',
  'BI',
  'BO',
  'BZ',
  'BS',
  'BR',
  'CA',
  'CL',
  'CB',
  'CI',
  'CE',
  'CT',
  'CZ',
  'CH',
  'CO',
  'CS',
  'CR',
  'KR',
  'CN',
  'EN',
  'FM',
  'FE',
  'FI',
  'FG',
  'FC',
  'FR',
  'GE',
  'GO',
  'GR',
  'IM',
  'IS',
  'SP',
  'AQ',
  'LT',
  'LE',
  'LC',
  'LI',
  'LO',
  'LU',
  'MC',
  'MN',
  'MS',
  'MT',
  'VS',
  'ME',
  'MI',
  'MO',
  'MB',
  'NA',
  'NO',
  'NU',
  'OG',
  'OT',
  'OR',
  'PD',
  'PA',
  'PR',
  'PV',
  'PG',
  'PU',
  'PE',
  'PC',
  'PI',
  'PT',
  'PN',
  'PZ',
  'PO',
  'RG',
  'RA',
  'RC',
  'RE',
  'RI',
  'RN',
  'RM',
  'RO',
  'SA',
  'SS',
  'SV',
  'SI',
  'SR',
  'SO',
  'TA',
  'TE',
  'TR',
  'TO',
  'OG',
  'TP',
  'TN',
  'TV',
  'TS',
  'UD',
  'VA',
  'VE',
  'VB',
  'VC',
  'VR',
  'VV',
  'VI',
  'VT',
];

const COMMON_PASSWORDS = [
  '123456',
  'password',
  'qwerty',
  '12345678',
  '111111',
  '123123',
  'admin',
  'welcome',
  'password123',
  '123456789',
  'abc123',
  'letmein',
  'monkey',
  'dragon',
  'master',
  'shadow',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'iloveyou',
  'trustno1',
  'whatever',
  'starwars',
];

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
];

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const passwordSchema = z
  .string()
  .min(8, 'La password deve essere di almeno 8 caratteri')
  .regex(/[a-z]/, 'Almeno una lettera minuscola')
  .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')
  .regex(/[^a-zA-Z0-9]/, 'Almeno un carattere speciale');

const emailSchema = z
  .string()
  .min(1, 'Email richiesta')
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Formato email non valido'
  );

const basePrivateSchema = {
  customerType: z.literal('private'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Conferma la password'),
  phone: z.string().min(8, 'Telefono non valido'),
  firstName: z.string().min(2, 'Nome richiesto (min 2 caratteri)').max(50, 'Massimo 50 caratteri'),
  lastName: z
    .string()
    .min(2, 'Cognome richiesto (min 2 caratteri)')
    .max(50, 'Massimo 50 caratteri'),
  gdpr: z.boolean().refine(val => val === true, { message: 'Accettazione GDPR richiesta' }),
  privacy: z
    .boolean()
    .refine(val => val === true, { message: 'Accettazione Privacy Policy richiesta' }),
  newsletter: z.boolean().default(false),
  marketing: z.boolean().default(false),
  marketingChannels: z.array(z.enum(['email', 'sms', 'whatsapp'])).default([]),
};

const baseBusinessSchema = {
  customerType: z.literal('business'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Conferma la password'),
  phone: z.string().min(8, 'Telefono non valido'),
  businessName: z
    .string()
    .min(3, 'Ragione sociale richiesta (min 3 caratteri)')
    .max(150, 'Massimo 150 caratteri'),
  businessType: z.string().min(1, 'Seleziona il tipo di azienda'),
  vatNumber: z.string().regex(/^IT\d{11}$/, 'Formato P.IVA non valido (IT + 11 cifre)'),
  address: z.string().min(5, 'Indirizzo richiesto').max(150, 'Massimo 150 caratteri'),
  postalCode: z.string().regex(/^\d{5}$/, 'CAP deve essere 5 cifre'),
  city: z.string().min(2, 'Città richiesta').max(50, 'Massimo 50 caratteri'),
  province: z.string().length(2, 'Seleziona la provincia'),
  pecEmail: z.string().email('PEC non valida'),
  sdiCode: z.string().regex(/^\d{7}$/, 'Codice SDI deve essere 7 cifre'),
  gdpr: z.boolean().refine(val => val === true, { message: 'Accettazione GDPR richiesta' }),
  privacy: z
    .boolean()
    .refine(val => val === true, { message: 'Accettazione Privacy Policy richiesta' }),
  newsletter: z.boolean().default(false),
  marketing: z.boolean().default(false),
  marketingChannels: z.array(z.enum(['email', 'sms', 'whatsapp'])).default([]),
};

const privateSchema = z
  .object(basePrivateSchema)
  .refine(data => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  });

const businessSchema = z
  .object(baseBusinessSchema)
  .refine(data => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  });

// Schema unico flessibile che supporta sia privato che business
const customerFormSchema = z
  .object({
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
    marketingChannels: z.array(z.enum(['email', 'sms', 'whatsapp'])).default([]),
    gdpr: z
      .boolean()
      .refine(val => val === true, { message: 'Devi accettare il trattamento dati GDPR' }),
    privacy: z
      .boolean()
      .refine(val => val === true, { message: 'Devi accettare la Privacy Policy' }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })
  .refine(
    data => {
      if (data.customerType === 'private') {
        return (
          data.firstName && data.firstName.length >= 2 && data.lastName && data.lastName.length >= 2
        );
      }
      return true;
    },
    { message: 'Nome e cognome richiesti per privati', path: ['firstName'] }
  )
  .refine(
    data => {
      if (data.customerType === 'business') {
        return data.businessName && data.businessName.length >= 3;
      }
      return true;
    },
    { message: 'Ragione sociale richiesta per business', path: ['businessName'] }
  );

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerStepBaseProps {
  control: Control<CustomerFormData>;
  errors: FieldErrors<CustomerFormData>;
  watch: UseFormWatch<CustomerFormData>;
  setValue: UseFormSetValue<CustomerFormData>;
  trigger: UseFormTrigger<CustomerFormData>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Luhn algorithm for Italian VAT number validation
function luhnCheck(vatNumber: string): boolean {
  const digits = vatNumber.replace(/\D/g, '').split('').map(Number);
  if (digits.length !== 11) return false;

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Custom password strength calculation
function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];
  let warning = '';

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return {
      score: 0,
      feedback: {
        warning: 'Questa è una password molto comune',
        suggestions: ['Scegli una password unica'],
      },
      crackTimesDisplay: {
        onlineThrottling100PerHour: 'istantaneo',
        onlineNoThrottling10PerSecond: 'istantaneo',
        offlineSlowHashing1e4PerSecond: 'istantaneo',
        offlineFastHashing1e10PerSecond: 'istantaneo',
      },
    };
  }

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (varietyCount >= 3) score++;
  if (varietyCount === 4) score++;

  score = Math.min(4, Math.floor(score / 1.5));

  if (password.length < 8) {
    warning = 'Troppo corta';
    suggestions.push('Aggiungi ' + (8 - password.length) + ' caratteri');
  } else if (varietyCount < 3) {
    warning = 'Aggiungi più varietà di caratteri';
    if (!hasUpper) suggestions.push('Aggiungi maiuscole');
    if (!hasNumber) suggestions.push('Aggiungi numeri');
    if (!hasSpecial) suggestions.push('Aggiungi simboli');
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
  };
}

function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerFormComplete() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customerNumber, setCustomerNumber] = useState('');

  const totalSteps = 5;

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
  });

  const customerType = watch('customerType');
  const marketing = watch('marketing');

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 0:
        return [];
      case 1:
        return customerType === 'private'
          ? ['email', 'password', 'confirmPassword', 'phone', 'firstName', 'lastName']
          : ['email', 'password', 'confirmPassword', 'phone'];
      case 2:
        return customerType === 'business'
          ? [
              'businessName',
              'businessType',
              'vatNumber',
              'address',
              'postalCode',
              'city',
              'province',
              'pecEmail',
              'sdiCode',
            ]
          : [];
      case 3:
        return ['gdpr', 'privacy'];
      default:
        return [];
    }
  };

  const nextStep = async () => {
    const fields = getStepFields(currentStep);
    const isValid = await trigger(fields as FieldPath<CustomerFormData>[]);

    if (isValid && currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  const createCustomerMutation = useCreateCustomer();

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createCustomerMutation.mutateAsync({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        gdprConsent: data.gdpr,
        marketingConsent: data.marketing,
        notes: data.businessName
          ? `Business: ${data.businessName} | P.IVA: ${data.vatNumber || ''}`
          : undefined,
      });
      setCustomerNumber(result?.id || `CLI-${Date.now().toString(36).toUpperCase().slice(-8)}`);
      setIsSuccess(true);
    } catch {
      // Error handled by React Query
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = () => {
    reset();
    setCurrentStep(0);
    setIsSuccess(false);
    setCustomerNumber('');
  };

  if (isSuccess) {
    return <SuccessView customerNumber={customerNumber} onClose={handleCreateNew} />;
  }

  return (
    <div className='fixed inset-0 bg-[var(--surface-tertiary)] flex items-center justify-center p-4 overflow-hidden'>
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='w-[80%] h-[80%] rounded-full bg-gradient-to-br from-[var(--brand)]/10 via-[var(--brand)]/5 to-[var(--brand)]/5 blur-3xl' />
          <motion.div
            className='absolute'
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Users className='w-[45%] h-[45%] text-[var(--brand)]/20' strokeWidth={0.5} />
          </motion.div>
        </div>

        <motion.div
          className='relative z-10 w-full h-full bg-[var(--surface-elevated)] backdrop-blur-2xl rounded-[40px] shadow-2xl border border-[var(--border-strong)] overflow-hidden'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className='px-10 pt-8 pb-4'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-3xl font-semibold text-[var(--text-primary)] tracking-tight'>
                  Nuovo Cliente
                </h1>
                <p className='text-[var(--text-secondary)] mt-1'>Registra un nuovo cliente nel sistema</p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-[var(--text-tertiary)]'>Step</span>
                <span className='text-2xl font-bold text-[var(--brand)]'>{currentStep + 1}</span>
                <span className='text-[var(--text-tertiary)]'>/</span>
                <span className='text-[var(--text-tertiary)]'>{totalSteps}</span>
              </div>
            </div>

            <div className='h-2 bg-[var(--border-strong)] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-[var(--brand)]'
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className='flex items-center justify-between mt-4'>
              {[
                'Tipo',
                'Credenziali',
                customerType === 'business' ? 'Azienda' : 'Dati',
                'Privacy',
                'Riepilogo',
              ].map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => idx < currentStep && goToStep(idx)}
                  className={`flex items-center gap-2 transition-all ${
                    idx <= currentStep
                      ? 'text-[var(--brand)] cursor-pointer hover:opacity-70'
                      : 'text-[var(--text-tertiary)]'
                  } ${idx < currentStep ? 'hover:scale-105' : ''}`}
                  disabled={idx > currentStep}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      idx < currentStep
                        ? 'bg-[var(--status-success)] text-[var(--text-on-brand)]'
                        : idx === currentStep
                          ? 'bg-[var(--brand)] text-[var(--text-on-brand)]'
                          : 'bg-[var(--border-strong)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    {idx < currentStep ? <Check className='w-4 h-4' /> : idx + 1}
                  </div>
                  <span className='hidden sm:inline text-sm font-medium'>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className='px-10 pb-24 h-[calc(100%-200px)] overflow-y-auto'>
            <AnimatePresence mode='wait'>
              {currentStep === 0 && (
                <Step0CustomerType
                  key='step0'
                  control={control}
                  watch={watch}
                  setValue={setValue}
                />
              )}
              {currentStep === 1 && (
                <Step1Credentials
                  key='step1'
                  control={control}
                  errors={errors}
                  watch={watch}
                  trigger={trigger}
                />
              )}
              {currentStep === 2 && customerType === 'business' && (
                <Step2Business
                  key='step2'
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  trigger={trigger}
                />
              )}
              {currentStep === 2 && customerType === 'private' && (
                <Step2PrivateExtra key='step2-private' />
              )}
              {currentStep === 3 && (
                <Step3Privacy
                  key='step3'
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                />
              )}
              {currentStep === 4 && <Step4Review key='step4' watch={watch} onEdit={goToStep} />}
            </AnimatePresence>
          </div>

          <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-[var(--surface-elevated)] backdrop-blur-xl border-t border-[var(--border-strong)]'>
            <div className='flex items-center justify-between'>
              <Button
                variant='outline'
                onClick={prevStep}
                disabled={currentStep === 0}
                className='rounded-full px-6 h-12 border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
              >
                <ChevronLeft className='w-5 h-5 mr-2' />
                Indietro
              </Button>

              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={nextStep}
                  className='rounded-full px-8 h-12 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] shadow-lg hover:shadow-xl transition-all'
                >
                  Avanti
                  <ChevronRight className='w-5 h-5 ml-2' />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className='rounded-full px-8 h-12 bg-[var(--status-success)] hover:opacity-90 text-[var(--text-on-brand)] shadow-lg hover:shadow-xl transition-all'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                      Creazione in corso...
                    </>
                  ) : (
                    <>
                      <Check className='w-5 h-5 mr-2' />
                      Crea Account
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 0: CUSTOMER TYPE SELECTOR
// ============================================================================

function Step0CustomerType(props: Record<string, unknown>) {
  const watch = props.watch as (name: string) => string;
  const setValue = props.setValue as (name: string, value: unknown) => void;
  const customerType = watch('customerType');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 rounded-2xl bg-[var(--brand)] flex items-center justify-center'>
          <Users className='w-6 h-6 text-[var(--text-on-brand)]' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-[var(--text-primary)]'>Tipo di Cliente</h2>
          <p className='text-[var(--text-secondary)] text-sm'>Seleziona la tipologia di account da creare</p>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setValue('customerType', 'private')}
          className={`p-8 rounded-3xl border-2 transition-all text-center ${
            customerType === 'private'
              ? 'border-[var(--brand)] bg-[var(--brand-subtle)] shadow-lg shadow-[var(--brand)]/20'
              : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)]'
          }`}
        >
          <motion.div
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              customerType === 'private'
                ? 'bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)]'
                : 'bg-[var(--surface-secondary)]'
            }`}
            animate={customerType === 'private' ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <User
              className={`w-10 h-10 ${customerType === 'private' ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-tertiary)]'}`}
            />
          </motion.div>
          <h3 className='text-xl font-semibold text-[var(--text-primary)] mb-2'>Privato</h3>
          <p className='text-[var(--text-tertiary)] text-sm mb-4'>Persona fisica</p>
          {customerType === 'private' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className='inline-flex items-center gap-1 text-[var(--brand)] text-sm font-medium px-4 py-1.5 bg-[var(--brand)]/10 rounded-full'
            >
              <Check className='w-4 h-4' />
              Selezionato
            </motion.div>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setValue('customerType', 'business')}
          className={`p-8 rounded-3xl border-2 transition-all text-center ${
            customerType === 'business'
              ? 'border-[var(--status-info)] bg-[var(--status-info-subtle)] shadow-lg shadow-blue-200'
              : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)]'
          }`}
        >
          <motion.div
            className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              customerType === 'business'
                ? 'bg-gradient-to-br from-[var(--status-info)] to-[var(--status-info)]'
                : 'bg-[var(--surface-secondary)]'
            }`}
            animate={customerType === 'business' ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Building2
              className={`w-10 h-10 ${customerType === 'business' ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-tertiary)]'}`}
            />
          </motion.div>
          <h3 className='text-xl font-semibold text-[var(--text-primary)] mb-2'>Partita IVA</h3>
          <p className='text-[var(--text-tertiary)] text-sm mb-4'>Azienda o professionista</p>
          {customerType === 'business' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className='inline-flex items-center gap-1 text-[var(--status-info)] text-sm font-medium px-4 py-1.5 bg-[var(--status-info-subtle)] rounded-full'
            >
              <Check className='w-4 h-4' />
              Selezionato
            </motion.div>
          )}
        </motion.button>
      </div>

      <div className='flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--text-tertiary)]'>
        <motion.div
          className='flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] rounded-full'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ShieldCheck className='w-4 h-4 text-[var(--status-success)]' />
          <span>15,000+ clienti soddisfatti</span>
        </motion.div>
        <motion.div
          className='flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] rounded-full'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Star className='w-4 h-4 text-[var(--status-warning)] fill-amber-500' />
          <span>4.8/5 stelle (2,340 recensioni)</span>
        </motion.div>
        <motion.div
          className='flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] rounded-full'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Award className='w-4 h-4 text-[var(--brand)]' />
          <span>Garantito al 100%</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 1: CREDENTIALS
// ============================================================================

function Step1Credentials({
  control,
  errors,
  watch,
  trigger,
}: Pick<CustomerStepBaseProps, 'control' | 'errors' | 'watch' | 'trigger'>) {
  const customerType = watch('customerType');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>(
    'idle'
  );
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  useEffect(() => {
    if (password && password.length > 0) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const checkEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    await new Promise(resolve => setTimeout(resolve, 800));
    const takenEmails = ['test@test.com', 'admin@mechmind.it', 'demo@example.com'];
    setEmailStatus(takenEmails.includes(email.toLowerCase()) ? 'taken' : 'available');
  }, []);

  const debouncedCheckEmail = useCallback(
    debounce((email: string) => checkEmail(email), 500),
    [checkEmail]
  );

  const handleEmailChange = (email: string, onChange: (value: string) => void) => {
    onChange(email);
    setEmailStatus('idle');
    debouncedCheckEmail(email);
  };

  const strengthColors = [
    'bg-[var(--status-error)]',
    'bg-[var(--status-warning)]',
    'bg-[var(--status-warning)]',
    'bg-[var(--status-success)]',
    'bg-[var(--status-success)]',
  ];
  const strengthLabels = ['Molto debole', 'Debole', 'Media', 'Forte', 'Eccellente'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-6'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)] flex items-center justify-center'>
          <LockKeyhole className='w-6 h-6 text-[var(--text-on-brand)]' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-[var(--text-primary)]'>Credenziali di Accesso</h2>
          <p className='text-[var(--text-tertiary)] text-sm'>Inserisci i dati per l&apos;account</p>
        </div>
      </div>

      {/* Email */}
      <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
        <Controller
          name='email'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>
                Email *{' '}
                <span className='text-[var(--text-tertiary)] font-normal'>(Ti invieremo link di verifica)</span>
              </Label>
              <div className='relative'>
                <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                <Input
                  {...field}
                  type='email'
                  onChange={e => handleEmailChange(e.target.value, field.onChange)}
                  onBlur={() => trigger('email')}
                  className={`pl-12 h-14 rounded-xl transition-all ${
                    emailStatus === 'available'
                      ? 'border-[var(--status-success)] focus:border-[var(--status-success)] focus:ring-[var(--status-success)]/20'
                      : emailStatus === 'taken'
                        ? 'border-[var(--status-error)] focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20'
                        : 'border-[var(--border-default)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                  }`}
                  placeholder='nome@example.com'
                />
                <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                  {emailStatus === 'checking' && (
                    <Loader2 className='w-5 h-5 text-[var(--text-tertiary)] animate-spin' />
                  )}
                  {emailStatus === 'available' && (
                    <CheckCircle2 className='w-5 h-5 text-[var(--status-success)]' />
                  )}
                  {emailStatus === 'taken' && <XCircle className='w-5 h-5 text-[var(--status-error)]' />}
                </div>
              </div>
              <AnimatePresence>
                {emailStatus === 'available' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className='text-[var(--status-success)] text-sm mt-2 flex items-center gap-1'
                  >
                    <Check className='w-4 h-4' />
                    Email disponibile
                  </motion.p>
                )}
                {emailStatus === 'taken' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className='text-[var(--status-error)] text-sm mt-2 flex items-center gap-1'
                  >
                    <AlertCircle className='w-4 h-4' />
                    Email già registrata.{' '}
                    <a href='/auth' className='underline hover:text-[var(--status-error)]'>
                      Accedi
                    </a>
                  </motion.p>
                )}
              </AnimatePresence>
              {errors.email && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.email.message as string}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Password */}
      <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
        <Controller
          name='password'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Password *</Label>
              <div className='relative'>
                <Lock className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                <Input
                  {...field}
                  type={showPassword ? 'text' : 'password'}
                  className='pl-12 pr-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                  placeholder='Minimo 8 caratteri'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors'
                >
                  {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
                </button>
              </div>

              <AnimatePresence>
                {passwordStrength && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className='mt-4 space-y-3'
                  >
                    <div>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs text-[var(--text-tertiary)]'>Sicurezza password:</span>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength.score <= 1
                              ? 'text-[var(--status-error)]'
                              : passwordStrength.score === 2
                                ? 'text-[var(--status-warning)]'
                                : passwordStrength.score === 3
                                  ? 'text-[var(--status-warning)]'
                                  : 'text-[var(--status-success)]'
                          }`}
                        >
                          {strengthLabels[passwordStrength.score]}
                        </span>
                      </div>
                      <div className='h-2 bg-[var(--border-default)] rounded-full overflow-hidden'>
                        <motion.div
                          className={`h-full transition-all duration-500 ${strengthColors[passwordStrength.score]}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${((passwordStrength.score + 1) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className='flex items-center gap-2 p-3 bg-[var(--surface-secondary)] rounded-xl'>
                      <Clock className='w-4 h-4 text-[var(--text-tertiary)]' />
                      <span className='text-sm text-[var(--text-secondary)]'>
                        Tempo stimato per crackare:{' '}
                        <strong className='text-[var(--text-primary)]'>
                          {passwordStrength.crackTimesDisplay.onlineThrottling100PerHour}
                        </strong>{' '}
                        (attacco online)
                      </span>
                    </div>

                    {passwordStrength.feedback.warning && (
                      <div className='flex items-start gap-2 p-3 bg-[var(--status-warning)]/5 rounded-xl'>
                        <AlertCircle className='w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5' />
                        <span className='text-sm text-[var(--status-warning)]'>
                          {passwordStrength.feedback.warning}
                        </span>
                      </div>
                    )}

                    {passwordStrength.feedback.suggestions.length > 0 && (
                      <div className='space-y-1'>
                        {passwordStrength.feedback.suggestions.map(
                          (suggestion: string, idx: number) => (
                            <div
                              key={idx}
                              className='flex items-center gap-2 text-sm text-[var(--text-tertiary)]'
                            >
                              <Sparkles className='w-3 h-3' />
                              {suggestion}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className='grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-default)]'>
                      <RequirementCheck met={password.length >= 8} label='Minimo 8 caratteri' />
                      <RequirementCheck met={/[a-z]/.test(password)} label='Lettera minuscola' />
                      <RequirementCheck met={/[A-Z]/.test(password)} label='Lettera maiuscola' />
                      <RequirementCheck met={/[0-9]/.test(password)} label='Almeno un numero' />
                      <RequirementCheck
                        met={/[^a-zA-Z0-9]/.test(password)}
                        label='Carattere speciale'
                        className='col-span-2'
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {errors.password && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.password.message as string}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Confirm Password */}
      <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
        <Controller
          name='confirmPassword'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>
                Conferma Password *
              </Label>
              <div className='relative'>
                <Lock className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                <Input
                  {...field}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className='pl-12 pr-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                  placeholder='Ripeti la password'
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors'
                >
                  {showConfirmPassword ? (
                    <EyeOff className='w-5 h-5' />
                  ) : (
                    <Eye className='w-5 h-5' />
                  )}
                </button>
                {confirmPassword && confirmPassword === password && (
                  <CheckCircle2 className='absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--status-success)]' />
                )}
              </div>
              {errors.confirmPassword && (
                <p className='text-[var(--status-error)] text-sm mt-2'>
                  {errors.confirmPassword.message as string}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Phone */}
      <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
        <Controller
          name='phone'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>
                Telefono * <span className='text-[var(--text-tertiary)] font-normal'>(Per notifiche e 2FA)</span>
              </Label>
              <div className='flex gap-2'>
                <Select
                  value={selectedCountry.code}
                  onValueChange={code => {
                    const country = COUNTRY_CODES.find(c => c.code === code);
                    if (country) setSelectedCountry(country);
                  }}
                >
                  <SelectTrigger className='w-[100px] h-14 rounded-xl bg-[var(--surface-secondary)] border-[var(--border-default)]'>
                    <span className='text-lg'>{selectedCountry.flag}</span>
                    <span className='text-sm ml-2'>{selectedCountry.dialCode}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className='flex items-center gap-2'>
                          <span className='text-lg'>{country.flag}</span>
                          <span className='text-sm'>{country.name}</span>
                          <span className='text-sm text-[var(--text-tertiary)]'>{country.dialCode}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className='relative flex-1'>
                  <Phone className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                  <Input
                    {...field}
                    type='tel'
                    className='pl-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                    placeholder={selectedCountry.placeholder}
                  />
                </div>
              </div>
              {errors.phone && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.phone.message as string}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Private Customer Fields */}
      {customerType === 'private' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className='grid grid-cols-1 sm:grid-cols-2 gap-4'
        >
          <Controller
            name='firstName'
            control={control}
            render={({ field }) => (
              <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
                <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Nome *</Label>
                <div className='relative'>
                  <User className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                  <Input
                    {...field}
                    className='pl-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                    placeholder='Giovanni'
                  />
                </div>
                {errors.firstName && (
                  <p className='text-[var(--status-error)] text-sm mt-2'>{errors.firstName.message as string}</p>
                )}
              </div>
            )}
          />
          <Controller
            name='lastName'
            control={control}
            render={({ field }) => (
              <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
                <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Cognome *</Label>
                <div className='relative'>
                  <User className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                  <Input
                    {...field}
                    className='pl-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                    placeholder='Rossi'
                  />
                </div>
                {errors.lastName && (
                  <p className='text-[var(--status-error)] text-sm mt-2'>{errors.lastName.message as string}</p>
                )}
              </div>
            )}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

function RequirementCheck({
  met,
  label,
  className = '',
}: {
  met: boolean;
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {met ? (
        <Check className='w-4 h-4 text-[var(--status-success)]' />
      ) : (
        <div className='w-4 h-4 rounded-full border border-[var(--border-default)]' />
      )}
      <span className={`text-xs ${met ? 'text-[var(--status-success)]' : 'text-[var(--text-tertiary)]'}`}>{label}</span>
    </div>
  );
}

// ============================================================================
// STEP 2: BUSINESS INFORMATION
// ============================================================================

function Step2Business({ control, errors, watch, setValue, trigger }: CustomerStepBaseProps) {
  const [isCheckingVat, setIsCheckingVat] = useState(false);
  const [vatVerified, setVatVerified] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);
  const vatNumber = watch('vatNumber');

  const verifyVat = async () => {
    if (!vatNumber || vatNumber.length !== 13) {
      setVatError('Inserisci una P.IVA valida (IT + 11 cifre)');
      return;
    }

    setIsCheckingVat(true);
    setVatError(null);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validate Luhn checksum
    const isLuhnValid = luhnCheck(vatNumber);

    if (isLuhnValid) {
      setVatVerified(true);
      // Mock auto-populate from API
      setValue('businessName', 'Rossi & C. S.R.L.');
      setValue('address', 'Via Milano 123');
      setValue('postalCode', '20121');
      setValue('city', 'Milano');
      setValue('province', 'MI');
    } else {
      setVatVerified(false);
      setVatError('Codice fiscale/P.IVA non valido (checksum errato)');
    }

    setIsCheckingVat(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-6'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--status-info)] to-[var(--status-info)] flex items-center justify-center'>
          <Building2 className='w-6 h-6 text-[var(--text-on-brand)]' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-[var(--text-primary)]'>Dati Azienda</h2>
          <p className='text-[var(--text-tertiary)] text-sm'>Inserisci i dati della Partita IVA</p>
        </div>
      </div>

      {/* Business Name */}
      <Controller
        name='businessName'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
            <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>
              Ragione Sociale *
            </Label>
            <div className='relative'>
              <Building2 className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
              <Input
                {...field}
                className='pl-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                placeholder='Es. Rossi & C. S.R.L.'
              />
            </div>
            {errors.businessName && (
              <p className='text-[var(--status-error)] text-sm mt-2'>{errors.businessName.message as string}</p>
            )}
          </div>
        )}
      />

      {/* Business Type */}
      <Controller
        name='businessType'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
            <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Tipo Azienda *</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className='h-14 rounded-xl bg-[var(--surface-secondary)] border-[var(--border-default)]'>
                <SelectValue placeholder='Seleziona tipo' />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessType && (
              <p className='text-[var(--status-error)] text-sm mt-2'>{errors.businessType.message as string}</p>
            )}
          </div>
        )}
      />

      {/* VAT Number */}
      <Controller
        name='vatNumber'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
            <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>
              Partita IVA * <span className='text-xs text-[var(--text-tertiary)]'>(Formato: IT12345678901)</span>
            </Label>
            <div className='flex gap-3'>
              <div className='relative flex-1'>
                <div className='absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1'>
                  <span className='text-lg'>🇮🇹</span>
                  <span className='text-[var(--text-tertiary)] text-sm font-mono'>IT</span>
                </div>
                <Input
                  {...field}
                  className='pl-14 h-14 rounded-xl font-mono tracking-wider border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                  placeholder='12345678901'
                  maxLength={13}
                  onChange={e => {
                    let value = e.target.value.toUpperCase().replace(/[^0-9]/g, '');
                    if (!value.startsWith('IT')) {
                      value = 'IT' + value;
                    }
                    field.onChange(value.slice(0, 13));
                    setVatVerified(false);
                    setVatError(null);
                  }}
                />
              </div>
              <Button
                type='button'
                onClick={verifyVat}
                disabled={isCheckingVat || !field.value || field.value.length < 13}
                className='h-14 rounded-xl bg-gradient-to-r from-[var(--status-info)] to-[var(--status-info)] hover:from-[var(--status-info)] hover:to-[var(--status-info)] text-[var(--text-on-brand)]'
              >
                {isCheckingVat ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <>
                    <Sparkles className='w-4 h-4 mr-2' />
                    Verifica
                  </>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {vatVerified && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className='mt-3 p-3 bg-[var(--status-success-subtle)] rounded-xl flex items-center gap-2 text-[var(--status-success)] text-sm border border-[var(--status-success)]/30'
                >
                  <BadgeCheck className='w-5 h-5' />
                  <span className='font-medium'>Verificata con Agenzia delle Entrate</span>
                </motion.div>
              )}
              {vatError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className='mt-3 p-3 bg-[var(--status-error-subtle)] rounded-xl flex items-center gap-2 text-[var(--status-error)] text-sm border border-[var(--status-error)]/30'
                >
                  <AlertCircle className='w-5 h-5' />
                  <span>{vatError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {errors.vatNumber && !vatError && (
              <p className='text-[var(--status-error)] text-sm mt-2'>{errors.vatNumber.message as string}</p>
            )}
          </div>
        )}
      />

      {/* Address */}
      <Controller
        name='address'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
            <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Indirizzo *</Label>
            <div className='relative'>
              <MapPin className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
              <Input
                {...field}
                className='pl-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                placeholder='Via Roma 123'
              />
            </div>
            {errors.address && (
              <p className='text-[var(--status-error)] text-sm mt-2'>{errors.address.message as string}</p>
            )}
          </div>
        )}
      />

      {/* CAP & City */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Controller
          name='postalCode'
          control={control}
          render={({ field }) => (
            <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>CAP *</Label>
              <Input
                {...field}
                className='h-14 rounded-xl text-center font-mono border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                placeholder='20100'
                maxLength={5}
              />
              {errors.postalCode && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.postalCode.message as string}</p>
              )}
            </div>
          )}
        />
        <Controller
          name='city'
          control={control}
          render={({ field }) => (
            <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)] sm:col-span-2'>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Città *</Label>
              <Input
                {...field}
                className='h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                placeholder='Milano'
              />
              {errors.city && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.city.message as string}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Province */}
      <Controller
        name='province'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
            <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Provincia *</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className='h-14 rounded-xl bg-[var(--surface-secondary)] border-[var(--border-default)]'>
                <SelectValue placeholder='Seleziona provincia' />
              </SelectTrigger>
              <SelectContent className='max-h-[200px]'>
                {ITALIAN_PROVINCES.map(prov => (
                  <SelectItem key={prov} value={prov}>
                    {prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.province && (
              <p className='text-[var(--status-error)] text-sm mt-2'>{errors.province.message as string}</p>
            )}
          </div>
        )}
      />

      {/* PEC & SDI */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Controller
          name='pecEmail'
          control={control}
          render={({ field }) => (
            <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Email PEC *</Label>
              <div className='relative'>
                <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                <Input
                  {...field}
                  type='email'
                  className='pl-12 h-14 rounded-xl border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                  placeholder='azienda@pec.it'
                />
              </div>
              {errors.pecEmail && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.pecEmail.message as string}</p>
              )}
            </div>
          )}
        />
        <Controller
          name='sdiCode'
          control={control}
          render={({ field }) => (
            <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
              <Label className='text-sm font-medium text-[var(--text-secondary)] mb-2 block'>Codice SDI *</Label>
              <div className='relative'>
                <Briefcase className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
                <Input
                  {...field}
                  className='pl-12 h-14 rounded-xl text-center font-mono border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
                  placeholder='0000000'
                  maxLength={7}
                />
              </div>
              {errors.sdiCode && (
                <p className='text-[var(--status-error)] text-sm mt-2'>{errors.sdiCode.message as string}</p>
              )}
            </div>
          )}
        />
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 2: PRIVATE EXTRA
// ============================================================================

function Step2PrivateExtra() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--status-success)] to-[var(--status-success)] flex items-center justify-center'>
          <User className='w-6 h-6 text-[var(--text-on-brand)]' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-[var(--text-primary)]'>Dati Aggiuntivi</h2>
          <p className='text-[var(--text-tertiary)] text-sm'>Informazioni opzionali per cliente privato</p>
        </div>
      </div>

      <div className='bg-gradient-to-br from-[var(--status-success-subtle)] to-[var(--status-success-subtle)] rounded-3xl p-8 border border-[var(--status-success)]/30 text-center'>
        <motion.div
          className='w-20 h-20 rounded-full bg-[var(--status-success-subtle)] flex items-center justify-center mx-auto mb-6'
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <CheckCircle2 className='w-10 h-10 text-[var(--status-success)]' />
        </motion.div>
        <h3 className='text-xl font-semibold text-[var(--text-primary)] mb-3'>
          Tutti i dati necessari sono stati inseriti!
        </h3>
        <p className='text-[var(--text-secondary)] max-w-md mx-auto mb-6'>
          Per i clienti privati non sono richiesti ulteriori dati. Procedi al passaggio successivo
          per completare la registrazione.
        </p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Badge variant='secondary' className='bg-[var(--surface-secondary)] text-[var(--status-success)] border-[var(--status-success)]/30'>
            <Check className='w-3 h-3 mr-1' />
            Email verificata
          </Badge>
          <Badge variant='secondary' className='bg-[var(--surface-secondary)] text-[var(--status-success)] border-[var(--status-success)]/30'>
            <Check className='w-3 h-3 mr-1' />
            Password sicura
          </Badge>
          <Badge variant='secondary' className='bg-[var(--surface-secondary)] text-[var(--status-success)] border-[var(--status-success)]/30'>
            <Check className='w-3 h-3 mr-1' />
            Telefono valido
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 3: PRIVACY & CONSENT
// ============================================================================

function Step3Privacy({
  control,
  errors,
  watch,
  setValue,
}: Pick<CustomerStepBaseProps, 'control' | 'errors' | 'watch' | 'setValue'>) {
  const marketing = watch('marketing');
  const marketingChannels = watch('marketingChannels') || [];

  const toggleChannel = (channel: MarketingChannel) => {
    const current = marketingChannels || [];
    if (current.includes(channel)) {
      setValue(
        'marketingChannels',
        current.filter((c: MarketingChannel) => c !== channel)
      );
    } else {
      setValue('marketingChannels', [...current, channel]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-6'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--status-warning)] to-[var(--status-warning)] flex items-center justify-center'>
          <Shield className='w-6 h-6 text-[var(--text-on-brand)]' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-[var(--text-primary)]'>Privacy e Consensi</h2>
          <p className='text-[var(--text-tertiary)] text-sm'>Gestisci le tue preferenze privacy</p>
        </div>
      </div>

      {/* Trust Badges */}
      <div className='flex flex-wrap items-center justify-center gap-3 text-sm mb-6'>
        <motion.div
          className='flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] rounded-full border border-[var(--border-default)]'
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <LockKeyhole className='w-4 h-4 text-[var(--status-success)]' />
          <span className='text-[var(--text-primary)]'>Crittografia AES-256</span>
        </motion.div>
        <motion.div
          className='flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] rounded-full border border-[var(--border-default)]'
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <ShieldCheck className='w-4 h-4 text-[var(--status-info)]' />
          <span className='text-[var(--text-primary)]'>GDPR Compliant</span>
        </motion.div>
        <motion.div
          className='flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] rounded-full border border-[var(--border-default)]'
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Award className='w-4 h-4 text-[var(--status-warning)]' />
          <span className='text-[var(--text-primary)]'>SSL/TLS</span>
        </motion.div>
      </div>

      {/* GDPR - Mandatory */}
      <Controller
        name='gdpr'
        control={control}
        render={({ field }) => (
          <div
            className={`rounded-3xl p-6 border-2 transition-all ${field.value ? 'bg-[var(--status-success-subtle)] border-[var(--status-success)]/30' : 'bg-gradient-to-r from-[var(--status-error-subtle)] to-[var(--status-error-subtle)] border-[var(--status-error)]/30'}`}
          >
            <div className='flex items-start gap-4'>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className='mt-1 data-[state=checked]:bg-[var(--status-success)] data-[state=checked]:border-[var(--status-success)]'
              />
              <div className='flex-1'>
                <Label className='font-semibold text-[var(--text-primary)] cursor-pointer flex items-center gap-2'>
                  Accetto il trattamento dei dati secondo GDPR *
                  {field.value && <CheckCircle2 className='w-4 h-4 text-[var(--status-success)]' />}
                </Label>
                <p className='text-sm text-[var(--text-secondary)] mt-1'>
                  Autorizzo il trattamento dei miei dati personali per la gestione del mio account e
                  dei servizi richiesti.
                  <a href='/gdpr' className='text-[var(--status-info)] hover:underline ml-1 font-medium'>
                    Leggi l&apos;informativa completa
                  </a>
                </p>
              </div>
            </div>
            {errors.gdpr && (
              <p className='text-[var(--status-error)] text-sm mt-2 ml-8'>{errors.gdpr.message as string}</p>
            )}
          </div>
        )}
      />

      {/* Privacy Policy - Mandatory */}
      <Controller
        name='privacy'
        control={control}
        render={({ field }) => (
          <div
            className={`rounded-3xl p-6 border-2 transition-all ${field.value ? 'bg-[var(--status-success-subtle)] border-[var(--status-success)]/30' : 'bg-gradient-to-r from-[var(--status-error-subtle)] to-[var(--status-error-subtle)] border-[var(--status-error)]/30'}`}
          >
            <div className='flex items-start gap-4'>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className='mt-1 data-[state=checked]:bg-[var(--status-success)] data-[state=checked]:border-[var(--status-success)]'
              />
              <div className='flex-1'>
                <Label className='font-semibold text-[var(--text-primary)] cursor-pointer flex items-center gap-2'>
                  Accetto Privacy Policy e Termini di Servizio *
                  {field.value && <CheckCircle2 className='w-4 h-4 text-[var(--status-success)]' />}
                </Label>
                <p className='text-sm text-[var(--text-secondary)] mt-1'>
                  Ho letto e accetto i
                  <a href='/termini' className='text-[var(--status-info)] hover:underline mx-1 font-medium'>
                    Termini di Servizio
                  </a>
                  e la
                  <a href='/privacy' className='text-[var(--status-info)] hover:underline ml-1 font-medium'>
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
            {errors.privacy && (
              <p className='text-[var(--status-error)] text-sm mt-2 ml-8'>{errors.privacy.message as string}</p>
            )}
          </div>
        )}
      />

      {/* Newsletter - Optional */}
      <Controller
        name='newsletter'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)] hover:border-[var(--brand)]/20 transition-colors'>
            <div className='flex items-start gap-4'>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className='mt-1 data-[state=checked]:bg-[var(--brand)] data-[state=checked]:border-[var(--brand)]'
              />
              <div className='flex-1'>
                <Label className='font-semibold text-[var(--text-primary)] cursor-pointer flex items-center gap-2'>
                  <Bell className='w-4 h-4 text-[var(--brand)]' />
                  Iscrivimi alla newsletter
                </Label>
                <p className='text-sm text-[var(--text-secondary)] mt-1'>
                  Ricevi tips, promozioni esclusive, aggiornamenti servizi. Puoi disiscriverti
                  sempre.{' '}
                  <span className='text-[var(--status-success)] font-medium'>10,000+ clienti iscritti</span>
                </p>
              </div>
            </div>
          </div>
        )}
      />

      {/* Marketing - Optional */}
      <Controller
        name='marketing'
        control={control}
        render={({ field }) => (
          <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)] hover:border-[var(--status-warning)]/30 transition-colors'>
            <div className='flex items-start gap-4'>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className='mt-1 data-[state=checked]:bg-[var(--status-warning)] data-[state=checked]:border-[var(--status-warning)]'
              />
              <div className='flex-1'>
                <Label className='font-semibold text-[var(--text-primary)] cursor-pointer flex items-center gap-2'>
                  <Star className='w-4 h-4 text-[var(--status-warning)]' />
                  Voglio offerte speciali e promozioni personalizzate
                </Label>
                <p className='text-sm text-[var(--text-secondary)] mt-1'>
                  Ricevi sconti su manutenzione, prodotti consigliati e offerte personalizzate
                </p>
              </div>
            </div>

            {/* Marketing Channels */}
            <AnimatePresence>
              {marketing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='mt-4 ml-8'
                >
                  <p className='text-sm text-[var(--text-tertiary)] mb-3'>
                    Su quali canali preferisci ricevere le comunicazioni?
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={() => toggleChannel('email')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${marketingChannels.includes('email') ? 'bg-[var(--status-info-subtle)] text-[var(--status-info)] border border-[var(--status-info)]/30' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--border-default)]'}`}
                    >
                      <Mail className='w-4 h-4' />
                      Email{marketingChannels.includes('email') && <Check className='w-3 h-3' />}
                    </button>
                    <button
                      type='button'
                      onClick={() => toggleChannel('sms')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${marketingChannels.includes('sms') ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border border-[var(--status-success)]/30' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--border-default)]'}`}
                    >
                      <Smartphone className='w-4 h-4' />
                      SMS{marketingChannels.includes('sms') && <Check className='w-3 h-3' />}
                    </button>
                    <button
                      type='button'
                      onClick={() => toggleChannel('whatsapp')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${marketingChannels.includes('whatsapp') ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border border-[var(--status-success)]/30' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--border-default)]'}`}
                    >
                      <MessageSquare className='w-4 h-4' />
                      WhatsApp
                      {marketingChannels.includes('whatsapp') && <Check className='w-3 h-3' />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      />
    </motion.div>
  );
}

// ============================================================================
// STEP 4: REVIEW
// ============================================================================

function Step4Review({
  watch,
  onEdit,
}: {
  watch: UseFormWatch<CustomerFormData>;
  onEdit: (step: number) => void;
}) {
  const customerType = watch('customerType');
  const email = watch('email');
  const phone = watch('phone');
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const businessName = watch('businessName');
  const businessType = watch('businessType');
  const vatNumber = watch('vatNumber');
  const address = watch('address');
  const postalCode = watch('postalCode');
  const city = watch('city');
  const province = watch('province');
  const pecEmail = watch('pecEmail');
  const sdiCode = watch('sdiCode');
  const gdpr = watch('gdpr');
  const privacy = watch('privacy');
  const newsletter = watch('newsletter');
  const marketing = watch('marketing');
  const marketingChannels = watch('marketingChannels') || [];

  const getBusinessTypeLabel = (value: string) => {
    return BUSINESS_TYPES.find(t => t.value === value)?.label || value;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-6'
    >
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--status-success)] to-[var(--status-success)] flex items-center justify-center'>
          <FileText className='w-6 h-6 text-[var(--text-on-brand)]' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-[var(--text-primary)]'>Riepilogo</h2>
          <p className='text-[var(--text-tertiary)] text-sm'>
            Verifica i dati inseriti prima di creare l&apos;account
          </p>
        </div>
      </div>

      {/* Account Type */}
      <ReviewSection title='Tipo Account' onEdit={() => onEdit(0)}>
        <div className='flex items-center gap-3'>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${customerType === 'private' ? 'bg-[var(--brand-subtle)]' : 'bg-[var(--status-info-subtle)]'}`}
          >
            {customerType === 'private' ? (
              <User className='w-5 h-5 text-[var(--brand)]' />
            ) : (
              <Building2 className='w-5 h-5 text-[var(--status-info)]' />
            )}
          </div>
          <div>
            <p className='font-medium text-[var(--text-primary)]'>
              {customerType === 'private' ? 'Cliente Privato' : 'Azienda / Partita IVA'}
            </p>
            <p className='text-sm text-[var(--text-tertiary)]'>
              {customerType === 'private' ? 'Persona fisica' : 'Professionista o società'}
            </p>
          </div>
        </div>
      </ReviewSection>

      {/* Credentials */}
      <ReviewSection title='Credenziali' onEdit={() => onEdit(1)}>
        <div className='space-y-3'>
          <ReviewItem icon={<Mail className='w-4 h-4' />} label='Email' value={email} />
          <ReviewItem icon={<Phone className='w-4 h-4' />} label='Telefono' value={phone} />
          {customerType === 'private' && (
            <>
              <ReviewItem icon={<User className='w-4 h-4' />} label='Nome' value={firstName} />
              <ReviewItem icon={<User className='w-4 h-4' />} label='Cognome' value={lastName} />
            </>
          )}
          <div className='flex items-center gap-2 p-3 bg-[var(--status-success-subtle)] rounded-xl'>
            <LockKeyhole className='w-4 h-4 text-[var(--status-success)]' />
            <span className='text-sm text-[var(--status-success)]'>Password impostata e verificata</span>
          </div>
        </div>
      </ReviewSection>

      {/* Business Details (if applicable) */}
      {customerType === 'business' && (
        <ReviewSection title='Dati Azienda' onEdit={() => onEdit(2)}>
          <div className='space-y-3'>
            <ReviewItem
              icon={<Building2 className='w-4 h-4' />}
              label='Ragione Sociale'
              value={businessName}
            />
            <ReviewItem
              icon={<Briefcase className='w-4 h-4' />}
              label='Tipo'
              value={businessType ? getBusinessTypeLabel(businessType) : undefined}
            />
            <div className='flex items-center gap-2'>
              <span className='text-lg'>🇮🇹</span>
              <span className='text-sm text-[var(--text-tertiary)]'>P.IVA:</span>
              <Badge variant='secondary' className='bg-[var(--status-success-subtle)] text-[var(--status-success)] border-[var(--status-success)]/30'>
                <BadgeCheck className='w-3 h-3 mr-1' />
                {vatNumber}
              </Badge>
            </div>
            <ReviewItem
              icon={<MapPin className='w-4 h-4' />}
              label='Indirizzo'
              value={`${address ?? ''}, ${postalCode ?? ''} ${city ?? ''} (${province ?? ''})`}
            />
            <ReviewItem icon={<Mail className='w-4 h-4' />} label='PEC' value={pecEmail} />
            <ReviewItem
              icon={<CreditCard className='w-4 h-4' />}
              label='Codice SDI'
              value={sdiCode}
            />
          </div>
        </ReviewSection>
      )}

      {/* Privacy & Consent */}
      <ReviewSection title='Privacy e Consensi' onEdit={() => onEdit(3)}>
        <div className='space-y-2'>
          <div className='flex items-center gap-2 p-3 bg-[var(--status-success-subtle)] rounded-xl'>
            <CheckCircle2 className='w-4 h-4 text-[var(--status-success)]' />
            <span className='text-sm text-[var(--status-success)]'>GDPR accettato</span>
          </div>
          <div className='flex items-center gap-2 p-3 bg-[var(--status-success-subtle)] rounded-xl'>
            <CheckCircle2 className='w-4 h-4 text-[var(--status-success)]' />
            <span className='text-sm text-[var(--status-success)]'>Privacy Policy accettata</span>
          </div>
          {newsletter && (
            <div className='flex items-center gap-2 p-3 bg-[var(--brand)]/5 rounded-xl'>
              <Bell className='w-4 h-4 text-[var(--brand)]' />
              <span className='text-sm text-[var(--brand)]'>Iscritto alla newsletter</span>
            </div>
          )}
          {marketing && (
            <div className='flex items-center gap-2 p-3 bg-[var(--status-warning)]/5 rounded-xl'>
              <Star className='w-4 h-4 text-[var(--status-warning)]' />
              <span className='text-sm text-[var(--status-warning)]'>
                Marketing abilitato ({marketingChannels.join(', ')})
              </span>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Final Notice */}
      <div className='p-4 bg-[var(--status-info-subtle)] rounded-2xl border border-[var(--status-info)]/30'>
        <div className='flex items-start gap-3'>
          <Zap className='w-5 h-5 text-[var(--status-info)] flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm font-medium text-[var(--status-info)]'>
              Clicca &quot;Crea Account&quot; per completare la registrazione
            </p>
            <p className='text-sm text-[var(--status-info)] mt-1'>
              Riceverai un&apos;email di conferma all&apos;indirizzo {email} con il link per
              attivare il tuo account.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewSection({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className='bg-[var(--surface-secondary)] backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-[var(--border-default)]'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='font-semibold text-[var(--text-primary)]'>{title}</h3>
        <button
          onClick={onEdit}
          className='flex items-center gap-1 text-sm text-[var(--brand)] hover:text-[var(--brand)] font-medium transition-colors'
        >
          <Edit3 className='w-4 h-4' />
          Modifica
        </button>
      </div>
      {children}
    </div>
  );
}

function ReviewItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className='flex items-center gap-3'>
      <div className='w-8 h-8 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--text-tertiary)]'>
        {icon}
      </div>
      <div>
        <p className='text-xs text-[var(--text-tertiary)]'>{label}</p>
        <p className='text-sm font-medium text-[var(--text-primary)]'>{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// SUCCESS VIEW
// ============================================================================

function SuccessView({ customerNumber, onClose }: { customerNumber: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='fixed inset-0 bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-tertiary)] flex items-center justify-center p-4 overflow-hidden z-50'
    >
      <div className='w-[min(900px,95vw)] h-[min(900px,95vh)] bg-[var(--surface-secondary)]/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-[var(--border-default)]/50 flex flex-col items-center justify-center p-10 text-center'>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className='w-32 h-32 rounded-full bg-gradient-to-br from-[var(--status-success)] to-[var(--status-success)] flex items-center justify-center mb-8 shadow-lg shadow-[var(--status-success)]/20'
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Check className='w-16 h-16 text-[var(--text-on-brand)]' strokeWidth={3} />
          </motion.div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='text-3xl font-bold text-[var(--text-primary)] mb-4'
        >
          Account Creato con Successo!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='text-[var(--text-secondary)] mb-8 max-w-md'
        >
          Il cliente è stato registrato correttamente nel sistema. È stata inviata un&apos;email di
          verifica all&apos;indirizzo fornito.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className='bg-gradient-to-r from-[var(--brand-subtle)] via-[var(--status-info-subtle)] to-[var(--status-success-subtle)] rounded-2xl p-8 mb-8 border border-[var(--border-default)] w-full max-w-sm'
        >
          <p className='text-sm text-[var(--text-tertiary)] mb-2 uppercase tracking-wider font-medium'>
            Codice Cliente
          </p>
          <p className='text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] to-[var(--status-info)]'>
            {customerNumber}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className='flex flex-col sm:flex-row gap-4'
        >
          <Button
            onClick={onClose}
            className='rounded-full px-8 h-14 bg-gradient-to-r from-[var(--brand)] to-[var(--status-info)] hover:from-[var(--brand)] hover:to-[var(--status-info)] text-[var(--text-on-brand)] shadow-lg hover:shadow-xl transition-all'
          >
            <Users className='w-5 h-5 mr-2' />
            Crea Nuovo Cliente
          </Button>
          <Button
            variant='outline'
            onClick={() => (window.location.href = '/dashboard/customers')}
            className='rounded-full px-8 h-14 border-[var(--border-default)] hover:bg-[var(--surface-secondary)]'
          >
            <ArrowRight className='w-5 h-5 mr-2' />
            Vai alla lista clienti
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className='mt-8 flex items-center gap-2 text-sm text-[var(--text-tertiary)]'
        >
          <ShieldCheck className='w-4 h-4' />
          <span>Dati protetti con crittografia AES-256</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default CustomerFormComplete;
