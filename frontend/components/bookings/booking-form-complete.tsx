'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Car,
  User,
  Calendar,
  Clock,
  Phone,
  Mail,
  Check,
  ChevronRight,
  ChevronLeft,
  Mic,
  Bell,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Loader2,
  X,
  Plus,
  Wrench,
  MapPin,
  Star,
  Volume2,
  Settings,
  Shield,
  Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useSearchCustomers,
  useAvailableSlots,
  useCreateBooking,
  useTenantSettings,
} from '@/hooks/useApi';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastAppointment?: string;
}

interface VehicleData {
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
}

interface SlotOption {
  id: string;
  start: string;
  end: string;
  technicianId: string;
  technicianName: string;
  liftAvailable: string;
  capacityPercentage: number;
  isOptimal: boolean;
}

interface PreventiveService {
  id: string;
  title: string;
  reason: string;
  estimatedCost: number;
  priority: 'high' | 'medium' | 'low';
  aiConfidence: number;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const bookingFormSchema = z.object({
  // Step 1: Customer & Vehicle
  customerId: z.string().optional(),
  customerName: z.string().min(2, 'Nome richiesto'),
  customerEmail: z.string().email('Email non valida'),
  customerPhone: z.string().min(10, 'Telefono non valido'),

  licensePlate: z.string().min(5, 'Targa richiesta'),
  vehicleMake: z.string().min(2, 'Marca richiesta'),
  vehicleModel: z.string().min(2, 'Modello richiesto'),
  vehicleYear: z.number().min(1900).max(2030),
  vehicleColor: z.string().optional(),
  vehicleVin: z.string().optional(),

  // Step 2: Appointment
  serviceType: z.enum([
    'maintenance',
    'repair',
    'inspection',
    'diagnostic',
    'tires',
    'bodywork',
    'revision',
    'other',
  ]),
  serviceSubtype: z.string().optional(),
  description: z.string().min(10, 'Descrizione minima 10 caratteri').max(500),
  urgency: z.enum(['routine', 'semi-urgent', 'urgent']),
  date: z.string().min(1, 'Data richiesta'),
  time: z.string().min(1, 'Ora richiesta'),
  duration: z.number().min(30).max(480),
  technicianId: z.string().optional(),
  liftPosition: z.string().optional(),

  // Step 3: Notifications
  emailReminder: z.boolean().default(true),
  emailTiming: z.number().default(24),
  smsReminder: z.boolean().default(true),
  smsTiming: z.number().default(24),
  whatsappReminder: z.boolean().default(false),
  whatsappTiming: z.number().default(24),
  requireConfirmation: z.boolean().default(true),
  confirmationChannel: z.enum(['sms', 'email', 'whatsapp']).default('sms'),

  // Step 4: Capacity
  selectedSlotId: z.string().optional(),
  bufferTime: z.number().default(10),
  waitlistOption: z.boolean().default(false),

  // Step 5: AI Features
  voiceNote: z.string().optional(),
  selectedPreventiveServices: z.array(z.string()).default([]),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface ServiceSubtypeOption {
  value: string;
  label: string;
}

interface BookingStepBaseProps {
  control: Control<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  watch: UseFormWatch<BookingFormData>;
  setValue: UseFormSetValue<BookingFormData>;
}

// ============================================================================
// MOCK DATA
// ============================================================================

// MOCK_CUSTOMERS removed — replaced by useSearchCustomers() hook

// MOCK_TECHNICIANS removed — replaced by useTenantSettings().technicians

// MOCK_SLOTS removed — replaced by useAvailableSlots() hook

// PREVENTIVE_SERVICES removed — will come from AI backend in future iteration
// For now, using static suggestions as placeholder until ML endpoint exists
const PREVENTIVE_SERVICES: PreventiveService[] = [];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingFormComplete() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isDecodingPlate, setIsDecodingPlate] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const router = useRouter();

  const totalSteps = 5;

  const {
    control,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
    handleSubmit,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceType: 'maintenance',
      urgency: 'routine',
      duration: 90,
      emailReminder: true,
      emailTiming: 24,
      smsReminder: true,
      smsTiming: 24,
      whatsappReminder: false,
      whatsappTiming: 24,
      requireConfirmation: true,
      confirmationChannel: 'sms',
      bufferTime: 10,
      waitlistOption: false,
      selectedPreventiveServices: [],
    },
  });

  const watchServiceType = watch('serviceType');
  const watchUrgency = watch('urgency');
  const watchDuration = watch('duration');
  const watchLicensePlate = watch('licensePlate');
  const watchDate = watch('date');
  const watchTime = watch('time');
  const watchSelectedServices = watch('selectedPreventiveServices');

  // --- API hooks ---
  const { data: searchResults } = useSearchCustomers(customerSearch);
  const { data: slotsData } = useAvailableSlots(watchDate, watchDuration);
  const createBookingMutation = useCreateBooking();
  const { data: tenantSettings } = useTenantSettings();

  // Map API customers to local Customer shape for dropdown
  const filteredCustomers: Customer[] = (searchResults || []).map(c => ({
    id: c.id,
    name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    email: c.email,
    phone: c.phone,
  }));

  // Decode license plate
  const decodeLicensePlate = useCallback(async () => {
    if (!watchLicensePlate || watchLicensePlate.length < 5) return;

    setIsDecodingPlate(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock decoded data
    setValue('vehicleMake', 'BMW');
    setValue('vehicleModel', 'Serie 3');
    setValue('vehicleYear', 2022);
    setValue('vehicleColor', 'Nero');
    setValue('vehicleVin', 'WBA1234567890XYZ');

    setIsDecodingPlate(false);
  }, [watchLicensePlate, setValue]);

  // Voice recording simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setValue(
        'voiceNote',
        'Freni che cigolano quando freno forte, specialmente al mattino quando è freddo.'
      );
      setRecordingTime(0);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  // Calculate estimated cost
  const baseLaborCost = (watchDuration / 60) * 85; // €85/hour
  const preventiveCost = watchSelectedServices.reduce((sum, serviceId) => {
    const service = PREVENTIVE_SERVICES.find(s => s.id === serviceId);
    return sum + (service?.estimatedCost || 0);
  }, 0);
  const totalEstimatedCost = baseLaborCost + preventiveCost;

  // Handle step navigation with Zod validation per step
  const nextStep = async () => {
    let fieldsToValidate: FieldPath<BookingFormData>[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          'customerName',
          'customerEmail',
          'customerPhone',
          'licensePlate',
          'vehicleMake',
          'vehicleModel',
        ];
        break;
      case 2:
        fieldsToValidate = ['serviceType', 'description', 'date', 'time'];
        break;
      case 3:
        fieldsToValidate = ['confirmationChannel'];
        break;
      case 4:
        // selectedSlotId is optional — no blocking validation
        break;
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep === 1) {
      router.push('/dashboard/bookings');
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      const scheduledDate = `${data.date}T${data.time}:00`;
      await createBookingMutation.mutateAsync({
        customerId: data.customerId || '',
        slotId: data.selectedSlotId || '',
        scheduledDate,
        durationMinutes: data.duration,
        notes: data.description,
        technicianId: data.technicianId,
        liftPosition: data.liftPosition,
        source: 'WEB',
      });
      setIsSuccess(true);
    } catch {
      // Error is handled by React Query — toast can be added here
    } finally {
      setIsSubmitting(false);
    }
  };

  // Service type conditional fields
  const getServiceSubtypeOptions = () => {
    switch (watchServiceType) {
      case 'maintenance':
        return [
          { value: 'oil-change', label: 'Cambio olio' },
          { value: 'filters', label: 'Filtri' },
          { value: 'scheduled', label: 'Tagliando programmato' },
        ];
      case 'repair':
        return [
          { value: 'brakes', label: 'Freni' },
          { value: 'suspension', label: 'Sospensioni' },
          { value: 'electrical', label: 'Elettrico' },
          { value: 'engine', label: 'Motore' },
        ];
      case 'tires':
        return [
          { value: 'change', label: 'Cambio gomme' },
          { value: 'repair', label: 'Riparazione' },
          { value: 'balance', label: 'Equilibratura' },
        ];
      default:
        return [];
    }
  };

  // Map API slots to SlotOption shape for Step4
  const apiSlots: SlotOption[] = (slotsData?.availableSlots || []).map(slot => ({
    id: slot.id,
    start: slot.startTime,
    end: slot.endTime,
    technicianId: '',
    technicianName: '',
    liftAvailable: '',
    capacityPercentage: 0,
    isOptimal: false,
  }));
  const getFilteredSlots = (): SlotOption[] => {
    if (watchUrgency === 'urgent') return apiSlots.slice(0, 2);
    return apiSlots;
  };

  if (isSuccess) {
    return (
      <SuccessView
        bookingNumber={`PREN-${Date.now().toString(36).toUpperCase()}`}
        onClose={() => window.location.reload()}
      />
    );
  }

  return (
    <div className='fixed inset-0 bg-white dark:bg-[#212121] flex items-center justify-center p-4 overflow-hidden'>
      {/* Main Container - 900x900px - Perfectly Centered */}
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        {/* Background Icon/Illustration - Scaled proportionally */}
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='w-[80%] h-[80%] rounded-full bg-gradient-to-br from-gray-100/40 via-gray-100/30 to-gray-100/40 dark:from-[#353535]/40 dark:via-[#353535]/30 dark:to-[#353535]/40 blur-3xl' />
          <motion.div
            className='absolute'
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Calendar
              className='w-[45%] h-[45%] text-gray-200/30 dark:text-[#424242]/30'
              strokeWidth={0.5}
            />
          </motion.div>
        </div>

        {/* Glass Card Container */}
        <motion.div
          className='relative z-10 w-full h-full bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple rounded-[40px] shadow-2xl border border-apple-border/20 dark:border-[#424242]/50 overflow-hidden'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className='px-10 pt-8 pb-4'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-3xl font-semibold text-apple-dark dark:text-[#ececec] tracking-tight'>
                  Nuova Prenotazione
                </h1>
                <p className='text-apple-gray dark:text-[#636366] mt-1'>
                  Crea un nuovo appuntamento per il cliente
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-apple-gray dark:text-[#636366]'>Step</span>
                <span className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                  {currentStep}
                </span>
                <span className='text-apple-gray dark:text-[#636366]'>/</span>
                <span className='text-apple-gray dark:text-[#636366]'>{totalSteps}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='h-2 bg-gray-200 dark:bg-[#424242] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-black dark:bg-[#ececec]'
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className='px-10 pb-32 h-[calc(100%-140px)] overflow-y-auto'>
            <AnimatePresence mode='wait'>
              {currentStep === 1 && (
                <Step1CustomerVehicle
                  key='step1'
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  customerSearch={customerSearch}
                  setCustomerSearch={setCustomerSearch}
                  filteredCustomers={filteredCustomers}
                  showCustomerDropdown={showCustomerDropdown}
                  setShowCustomerDropdown={setShowCustomerDropdown}
                  isDecodingPlate={isDecodingPlate}
                  decodeLicensePlate={decodeLicensePlate}
                />
              )}
              {currentStep === 2 && (
                <Step2AppointmentDetails
                  key='step2'
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  serviceSubtypeOptions={getServiceSubtypeOptions()}
                  isRecording={isRecording}
                  recordingTime={recordingTime}
                  toggleRecording={toggleRecording}
                  technicians={(tenantSettings?.team || []).map(m => ({
                    id: m.id,
                    name: m.name,
                    specialty: m.role,
                  }))}
                />
              )}
              {currentStep === 3 && (
                <Step3Notifications
                  key='step3'
                  control={control}
                  watch={watch}
                  setValue={setValue}
                />
              )}
              {currentStep === 4 && (
                <Step4Capacity
                  key='step4'
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  filteredSlots={getFilteredSlots()}
                  showWaitlistModal={showWaitlistModal}
                  setShowWaitlistModal={setShowWaitlistModal}
                />
              )}
              {currentStep === 5 && (
                <Step5AIFeatures
                  key='step5'
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  totalEstimatedCost={totalEstimatedCost}
                  baseLaborCost={baseLaborCost}
                  preventiveCost={preventiveCost}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-t border-apple-border/20 dark:border-[#424242]/50'>
            <div className='flex items-center justify-between'>
              <Button
                variant='outline'
                onClick={prevStep}
                className='rounded-full px-6 h-12 border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] hover:bg-apple-light-gray/30 dark:hover:bg-[#353535]'
              >
                <ChevronLeft className='w-5 h-5 mr-2' />
                Indietro
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  className='rounded-full px-8 h-12 border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] hover:bg-apple-light-gray/30 dark:hover:bg-[#353535]'
                >
                  Avanti
                  <ChevronRight className='w-5 h-5 ml-2' />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className='rounded-full px-8 h-12 bg-apple-green hover:bg-green-600 text-white'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Check className='w-5 h-5 mr-2' />
                      Conferma Prenotazione
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
// STEP 1: CUSTOMER & VEHICLE
// ============================================================================

function Step1CustomerVehicle({
  control,
  errors,
  watch,
  setValue,
  customerSearch,
  setCustomerSearch,
  filteredCustomers,
  showCustomerDropdown,
  setShowCustomerDropdown,
  isDecodingPlate,
  decodeLicensePlate,
}: BookingStepBaseProps & {
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  filteredCustomers: Customer[];
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (value: boolean) => void;
  isDecodingPlate: boolean;
  decodeLicensePlate: () => void;
}) {
  const selectedCustomerId = watch('customerId');

  const selectCustomer = (customer: Customer) => {
    setValue('customerId', customer.id);
    setValue('customerName', customer.name);
    setValue('customerEmail', customer.email);
    setValue('customerPhone', customer.phone);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='mb-6'>
        <h2 className='text-xl font-semibold text-apple-dark dark:text-[#ececec]'>
          Informazioni Cliente e Veicolo
        </h2>
        <p className='text-apple-gray dark:text-[#636366] text-sm'>
          Cerca un cliente esistente o inserisci i dati manualmente
        </p>
      </div>

      {/* Customer Search */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-3 block'>
          Cerca Cliente
        </Label>
        <div className='relative'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray/70 dark:text-[#636366]' />
          <Input
            value={customerSearch}
            onChange={e => {
              setCustomerSearch(e.target.value);
              setShowCustomerDropdown(true);
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholder='Cerca per nome, telefono o email...'
            className='pl-12 h-14 rounded-2xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
          />

          {/* Dropdown */}
          <AnimatePresence>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className='absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-xl border border-apple-border/50 dark:border-[#424242] overflow-hidden'
              >
                {filteredCustomers.map((customer: Customer) => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className='w-full px-4 py-3 flex items-center gap-3 hover:bg-apple-light-gray/30 dark:hover:bg-[#353535] transition-colors text-left'
                  >
                    <div className='w-10 h-10 rounded-full bg-apple-purple flex items-center justify-center text-white font-semibold'>
                      {customer.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </div>
                    <div className='flex-1'>
                      <p className='font-medium text-apple-dark dark:text-[#ececec]'>
                        {customer.name}
                      </p>
                      <p className='text-sm text-apple-gray dark:text-[#636366]'>
                        {customer.phone} • {customer.email}
                      </p>
                    </div>
                    {customer.lastAppointment && (
                      <Badge variant='secondary' className='text-xs'>
                        {customer.lastAppointment}
                      </Badge>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className='mt-4 flex items-center gap-2 text-sm text-apple-gray dark:text-[#636366]'>
          <Plus className='w-4 h-4' />
          <span>
            Oppure{' '}
            <button
              className='text-apple-dark dark:text-[#ececec] hover:underline'
              onClick={() => setShowCustomerDropdown(false)}
            >
              clicca per nuovo cliente
            </button>
          </span>
        </div>
      </div>

      {/* Customer Details */}
      <div className='grid grid-cols-2 gap-4'>
        <Controller
          name='customerName'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Nome e Cognome *
              </Label>
              <div className='relative'>
                <User className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray/70 dark:text-[#636366]' />
                <Input {...field} className='pl-12 h-12 rounded-xl' placeholder='Mario Rossi' />
              </div>
              {errors.customerName && (
                <p className='text-red-500 text-sm mt-1'>{errors.customerName.message as string}</p>
              )}
            </div>
          )}
        />

        <Controller
          name='customerPhone'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Telefono *
              </Label>
              <div className='relative'>
                <Phone className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray/70 dark:text-[#636366]' />
                <Input {...field} className='pl-12 h-12 rounded-xl' placeholder='+39 333 1234567' />
              </div>
              {errors.customerPhone && (
                <p className='text-red-500 text-sm mt-1'>
                  {errors.customerPhone.message as string}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          name='customerEmail'
          control={control}
          render={({ field }) => (
            <div className='col-span-2'>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Email *
              </Label>
              <div className='relative'>
                <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray/70 dark:text-[#636366]' />
                <Input
                  {...field}
                  type='email'
                  className='pl-12 h-12 rounded-xl'
                  placeholder='mario@email.it'
                />
              </div>
              {errors.customerEmail && (
                <p className='text-red-500 text-sm mt-1'>
                  {errors.customerEmail.message as string}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Vehicle Section */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='mb-6'>
          <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>Dati Veicolo</h3>
          <p className='text-sm text-apple-gray dark:text-[#636366]'>
            Inserisci la targa per decodifica automatica
          </p>
        </div>

        <div className='flex gap-3 mb-6'>
          <Controller
            name='licensePlate'
            control={control}
            render={({ field }) => (
              <div className='flex-1'>
                <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                  Targa *
                </Label>
                <Input
                  {...field}
                  className='h-12 rounded-xl uppercase tracking-wider font-medium text-center text-lg'
                  placeholder='AB 123 CD'
                  maxLength={10}
                />
              </div>
            )}
          />
          <Button
            type='button'
            onClick={decodeLicensePlate}
            disabled={isDecodingPlate || !watch('licensePlate') || watch('licensePlate').length < 5}
            className='h-12 mt-7 rounded-xl bg-black hover:bg-gray-800 dark:bg-[#ececec] dark:hover:bg-white dark:text-black text-white'
          >
            {isDecodingPlate ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <>
                <Sparkles className='w-4 h-4 mr-2' />
                Decodifica
              </>
            )}
          </Button>
        </div>

        {/* Vehicle Summary */}
        {(watch('vehicleMake') || watch('vehicleModel')) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='bg-apple-light-gray/30 dark:bg-[#353535] rounded-2xl p-5 mb-6'
          >
            <h4 className='font-semibold text-apple-dark dark:text-[#ececec] mb-3 flex items-center gap-2'>
              <Check className='w-5 h-5 text-green-500' />
              Dati Veicolo Decodificati
            </h4>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-apple-gray dark:text-[#636366]'>Marca:</span>
                <span className='ml-2 font-medium'>{watch('vehicleMake')}</span>
              </div>
              <div>
                <span className='text-apple-gray dark:text-[#636366]'>Modello:</span>
                <span className='ml-2 font-medium'>{watch('vehicleModel')}</span>
              </div>
              <div>
                <span className='text-apple-gray dark:text-[#636366]'>Anno:</span>
                <span className='ml-2 font-medium'>{watch('vehicleYear')}</span>
              </div>
              <div>
                <span className='text-apple-gray dark:text-[#636366]'>Colore:</span>
                <span className='ml-2 font-medium'>{watch('vehicleColor')}</span>
              </div>
              <div className='col-span-2'>
                <span className='text-apple-gray dark:text-[#636366]'>VIN:</span>
                <span className='ml-2 font-mono text-xs'>{watch('vehicleVin')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 2: APPOINTMENT DETAILS
// ============================================================================

function Step2AppointmentDetails({
  control,
  errors,
  watch,
  setValue,
  serviceSubtypeOptions,
  isRecording,
  recordingTime,
  toggleRecording,
  technicians,
}: BookingStepBaseProps & {
  serviceSubtypeOptions: ServiceSubtypeOption[];
  isRecording: boolean;
  recordingTime: number;
  toggleRecording: () => void;
  technicians: Array<{ id: string; name: string; specialty?: string }>;
}) {
  const urgencyOptions: Array<{
    value: BookingFormData['urgency'];
    label: string;
    color: string;
    desc: string;
  }> = [
    { value: 'routine', label: 'Routine', color: 'bg-green-500', desc: 'Nessuna urgenza' },
    {
      value: 'semi-urgent',
      label: 'Semi-Urgente',
      color: 'bg-yellow-500',
      desc: 'Da fare entro 7 giorni',
    },
    { value: 'urgent', label: 'Urgente', color: 'bg-red-500', desc: 'Entro 48 ore' },
  ];

  const serviceTypeLabels: Record<string, string> = {
    maintenance: 'Tagliando',
    repair: 'Riparazione',
    inspection: 'Ispezione',
    diagnostic: 'Diagnosi',
    tires: 'Pneumatici',
    bodywork: 'Carrozzeria',
    revision: 'Revisione',
    other: 'Altro',
  };

  const serviceDurations: Record<string, number> = {
    maintenance: 90,
    repair: 120,
    inspection: 60,
    diagnostic: 45,
    tires: 30,
    bodywork: 180,
    revision: 90,
    other: 60,
  };

  const handleServiceTypeChange = (value: BookingFormData['serviceType']) => {
    setValue('serviceType', value);
    setValue('duration', serviceDurations[value] || 60);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='mb-6'>
        <h2 className='text-xl font-semibold text-apple-dark dark:text-[#ececec]'>
          Dettagli Appuntamento
        </h2>
        <p className='text-apple-gray dark:text-[#636366] text-sm'>
          Configura il tipo di intervento e la data
        </p>
      </div>

      {/* Service Type */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-4 block'>
          Tipo Intervento *
        </Label>
        <Controller
          name='serviceType'
          control={control}
          render={({ field }) => (
            <Select onValueChange={handleServiceTypeChange} defaultValue={field.value}>
              <SelectTrigger className='h-14 rounded-xl bg-white/80 dark:bg-[#2f2f2f]/80 border-apple-border dark:border-[#424242]'>
                <SelectValue placeholder='Seleziona tipo intervento' />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        {/* Conditional Subtype */}
        {serviceSubtypeOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='mt-4'
          >
            <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
              Sotto-categoria
            </Label>
            <Controller
              name='serviceSubtype'
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className='h-12 rounded-xl bg-white/80 dark:bg-[#2f2f2f]/80 border-apple-border dark:border-[#424242]'>
                    <SelectValue placeholder='Seleziona sotto-categoria' />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceSubtypeOptions.map((opt: ServiceSubtypeOption) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </motion.div>
        )}
      </div>

      {/* Urgency */}
      <div>
        <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-3 block'>
          Livello di Urgenza *
        </Label>
        <div className='grid grid-cols-3 gap-3'>
          {urgencyOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setValue('urgency', option.value)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${
                watch('urgency') === option.value
                  ? 'border-black dark:border-[#ececec] bg-apple-light-gray/30 dark:bg-[#353535]'
                  : 'border-apple-border dark:border-[#424242] hover:border-apple-dark/30 dark:hover:border-[#636366]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${option.color} mb-2`} />
              <div className='font-medium text-apple-dark dark:text-[#ececec]'>{option.label}</div>
              <div className='text-xs text-apple-gray dark:text-[#636366] mt-1'>{option.desc}</div>
            </button>
          ))}
        </div>
        {watch('urgency') === 'urgent' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-3 p-3 bg-red-50 rounded-xl flex items-start gap-2'
          >
            <AlertTriangle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
            <p className='text-sm text-red-700'>
              Per interventi urgenti mostreremo solo gli slot disponibili nelle prossime 48 ore.
            </p>
          </motion.div>
        )}
      </div>

      {/* Description with Voice */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='flex items-center justify-between mb-3'>
          <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
            Descrizione / Richiesta Cliente *
          </Label>
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              isRecording
                ? 'bg-black/10 dark:bg-[#ececec]/10 text-apple-dark dark:text-[#ececec] animate-pulse'
                : 'bg-apple-light-gray/30 dark:bg-[#353535] text-apple-gray dark:text-[#636366] hover:bg-apple-light-gray/50 dark:hover:bg-[#424242]'
            }`}
          >
            {isRecording ? (
              <>
                <div className='w-2 h-2 bg-red-500 rounded-full animate-pulse' />
                <Mic className='w-4 h-4' />
                {recordingTime}s
              </>
            ) : (
              <>
                <Mic className='w-4 h-4' />
                Registra voce
              </>
            )}
          </button>
        </div>

        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <>
              <Textarea
                {...field}
                className='min-h-[120px] rounded-xl resize-none bg-white/80 dark:bg-[#2f2f2f]/80 border-apple-border dark:border-[#424242]'
                placeholder='Descrivi il problema o la richiesta del cliente...'
              />
              <div className='flex justify-between mt-2'>
                {errors.description && (
                  <p className='text-red-500 text-sm'>{errors.description.message as string}</p>
                )}
                <span className='text-xs text-apple-gray/70 dark:text-[#636366] ml-auto'>
                  {field.value?.length || 0}/500
                </span>
              </div>
            </>
          )}
        />

        {watch('voiceNote') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='mt-4 p-4 bg-apple-light-gray/30 dark:bg-[#353535] rounded-xl'
          >
            <div className='flex items-center gap-2 mb-2'>
              <Volume2 className='w-4 h-4 text-apple-dark dark:text-[#ececec]' />
              <span className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                Nota vocale trascritta
              </span>
            </div>
            <p className='text-sm text-apple-gray dark:text-[#636366]'>{watch('voiceNote')}</p>
          </motion.div>
        )}
      </div>

      {/* Date & Time */}
      <div className='grid grid-cols-2 gap-4'>
        <Controller
          name='date'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Data *
              </Label>
              <div className='relative'>
                <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray/70 dark:text-[#636366]' />
                <Input {...field} type='date' className='pl-12 h-12 rounded-xl' />
              </div>
              {errors.date && (
                <p className='text-red-500 text-sm mt-1'>{errors.date.message as string}</p>
              )}
            </div>
          )}
        />

        <Controller
          name='time'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Ora *
              </Label>
              <div className='relative'>
                <Clock className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray/70 dark:text-[#636366]' />
                <Input {...field} type='time' className='pl-12 h-12 rounded-xl' />
              </div>
              {errors.time && (
                <p className='text-red-500 text-sm mt-1'>{errors.time.message as string}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Duration */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
            Durata Prevista
          </Label>
          <span className='text-lg font-semibold text-apple-dark dark:text-[#ececec]'>
            {watch('duration')} min
          </span>
        </div>
        <Controller
          name='duration'
          control={control}
          render={({ field }) => (
            <Slider
              value={[field.value]}
              onValueChange={([value]) => field.onChange(value)}
              min={30}
              max={240}
              step={15}
              className='w-full'
            />
          )}
        />
        <div className='flex justify-between text-xs text-apple-gray/70 dark:text-[#636366] mt-2'>
          <span>30 min</span>
          <span>4 ore</span>
        </div>
      </div>

      {/* Technician */}
      <div className='grid grid-cols-2 gap-4'>
        <Controller
          name='technicianId'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Tecnico Assegnato
              </Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className='h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'>
                  <SelectValue placeholder='Seleziona tecnico' />
                </SelectTrigger>
                <SelectContent>
                  {technicians.length > 0 ? (
                    technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        <div className='flex items-center gap-2'>
                          <span className='w-6 h-6 rounded-full bg-apple-purple text-white text-xs flex items-center justify-center'>
                            {tech.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </span>
                          <span>{tech.name}</span>
                          {tech.specialty && (
                            <Badge variant='secondary' className='text-xs'>
                              {tech.specialty}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value='none' disabled>
                      Nessun tecnico configurato
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name='liftPosition'
          control={control}
          render={({ field }) => (
            <div>
              <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-2 block'>
                Posto Rialzo
              </Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className='h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-apple-dark dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'>
                  <SelectValue placeholder='Seleziona posto' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Ponte A'>Ponte A</SelectItem>
                  <SelectItem value='Ponte B'>Ponte B</SelectItem>
                  <SelectItem value='Ponte C'>Ponte C</SelectItem>
                  <SelectItem value='Linea 1'>Linea 1</SelectItem>
                  <SelectItem value='Linea 2'>Linea 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 3: NOTIFICATIONS
// ============================================================================

function Step3Notifications({
  control,
  watch,
  setValue,
}: Pick<BookingStepBaseProps, 'control' | 'watch' | 'setValue'>) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='mb-6'>
        <h2 className='text-xl font-semibold text-apple-dark dark:text-[#ececec]'>
          Promemoria e Notifiche
        </h2>
        <p className='text-apple-gray dark:text-[#636366] text-sm'>
          Configura come e quando contattare il cliente
        </p>
      </div>

      {/* Email */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>Email</h3>
            <p className='text-sm text-apple-gray dark:text-[#636366]'>
              Invia promemoria via email
            </p>
          </div>
          <Controller
            name='emailReminder'
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {watch('emailReminder') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='mt-4'>
            <Label className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'>
              Invia prima di:
            </Label>
            <Controller
              name='emailTiming'
              control={control}
              render={({ field }) => (
                <div className='flex gap-3'>
                  {[24, 48].map(hours => (
                    <button
                      key={hours}
                      onClick={() => field.onChange(hours)}
                      className={`px-4 py-2 rounded-xl border transition-colors ${
                        field.value === hours
                          ? 'border-black dark:border-[#ececec] bg-apple-light-gray/30 dark:bg-[#353535] text-apple-dark dark:text-[#ececec]'
                          : 'border-apple-border dark:border-[#424242] text-apple-gray dark:text-[#636366] hover:border-apple-dark/30 dark:hover:border-[#636366]'
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              )}
            />
          </motion.div>
        )}
      </div>

      {/* SMS */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>SMS</h3>
            <p className='text-sm text-apple-gray dark:text-[#636366]'>Invia promemoria via SMS</p>
          </div>
          <Controller
            name='smsReminder'
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {watch('smsReminder') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='mt-4'>
            <Label className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'>
              Invia prima di:
            </Label>
            <Controller
              name='smsTiming'
              control={control}
              render={({ field }) => (
                <div className='flex gap-3'>
                  {[2, 24, 48].map(hours => (
                    <button
                      key={hours}
                      onClick={() => field.onChange(hours)}
                      className={`px-4 py-2 rounded-xl border transition-colors ${
                        field.value === hours
                          ? 'border-black dark:border-[#ececec] bg-apple-light-gray/30 dark:bg-[#353535] text-apple-dark dark:text-[#ececec]'
                          : 'border-apple-border dark:border-[#424242] text-apple-gray dark:text-[#636366] hover:border-apple-dark/30 dark:hover:border-[#636366]'
                      }`}
                    >
                      {hours === 2 ? '2h' : `${hours}h`}
                    </button>
                  ))}
                </div>
              )}
            />
          </motion.div>
        )}
      </div>

      {/* WhatsApp */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>WhatsApp</h3>
            <p className='text-sm text-apple-gray dark:text-[#636366]'>
              Invia promemoria via WhatsApp
            </p>
          </div>
          <Controller
            name='whatsappReminder'
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      {/* 2-Way Confirmation */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>Richiedi Conferma</h3>
            <p className='text-sm text-apple-gray dark:text-[#636366]'>
              Doppio opt-in per confermare l&apos;appuntamento
            </p>
          </div>
          <Controller
            name='requireConfirmation'
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {watch('requireConfirmation') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='mt-4'>
            <Label className='text-sm text-apple-gray dark:text-[#636366] mb-2 block'>
              Canale di conferma:
            </Label>
            <Controller
              name='confirmationChannel'
              control={control}
              render={({ field }) => (
                <div className='flex gap-3'>
                  {['sms', 'email', 'whatsapp'].map(channel => (
                    <button
                      key={channel}
                      onClick={() => field.onChange(channel)}
                      className={`px-4 py-2 rounded-xl border capitalize transition-colors ${
                        field.value === channel
                          ? 'border-black dark:border-[#ececec] bg-apple-light-gray/30 dark:bg-[#353535] text-apple-dark dark:text-[#ececec]'
                          : 'border-apple-border dark:border-[#424242] text-apple-gray dark:text-[#636366] hover:border-apple-dark/30 dark:hover:border-[#636366]'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              )}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 4: CAPACITY MANAGEMENT
// ============================================================================

function Step4Capacity({
  control,
  errors,
  watch,
  setValue,
  filteredSlots,
  showWaitlistModal,
  setShowWaitlistModal,
}: BookingStepBaseProps & {
  filteredSlots: SlotOption[];
  showWaitlistModal: boolean;
  setShowWaitlistModal: (value: boolean) => void;
}) {
  const selectedSlotId = watch('selectedSlotId');
  const bufferTime = watch('bufferTime');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='mb-6'>
        <h2 className='text-xl font-semibold text-apple-dark dark:text-[#ececec]'>
          Gestione Capacità Produttiva
        </h2>
        <p className='text-apple-gray dark:text-[#636366] text-sm'>
          Verifica disponibilità e seleziona lo slot ottimale
        </p>
      </div>

      {/* Conflict Warning */}
      {filteredSlots.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className='bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3'
        >
          <AlertTriangle className='w-6 h-6 text-red-500 flex-shrink-0' />
          <div>
            <h4 className='font-semibold text-red-800'>Attenzione: Capacità Saturation</h4>
            <p className='text-sm text-red-600 mt-1'>
              3 appuntamenti già presenti nella stessa fascia oraria. Considera di aggiungere il
              cliente alla lista d&apos;attesa.
            </p>
            <Button
              onClick={() => setShowWaitlistModal(true)}
              variant='outline'
              className='mt-3 border-2 border-black dark:border-[#424242] text-apple-dark dark:text-[#ececec] hover:bg-apple-light-gray/30 dark:hover:bg-[#353535]'
            >
              <Plus className='w-4 h-4 mr-2' />
              Aggiungi a Lista d'Attesa
            </Button>
          </div>
        </motion.div>
      )}

      {/* Available Slots */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <Label className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
            Slot Disponibili Suggeriti
          </Label>
          <Badge
            variant='outline'
            className='text-xs border-black dark:border-[#424242] text-apple-dark dark:text-[#ececec]'
          >
            {filteredSlots.length} opzioni
          </Badge>
        </div>

        <div className='space-y-3'>
          {filteredSlots.map((slot: SlotOption) => (
            <motion.button
              key={slot.id}
              onClick={() => setValue('selectedSlotId', slot.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                selectedSlotId === slot.id
                  ? 'border-black dark:border-[#ececec] bg-apple-light-gray/30 dark:bg-[#353535]'
                  : 'border-apple-border dark:border-[#424242] hover:border-apple-dark/30 dark:hover:border-[#636366] dark:hover:border-[#555] bg-white/80 dark:bg-[#2f2f2f]/80'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold text-apple-dark dark:text-[#ececec]'>
                        {new Date(slot.start).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {slot.isOptimal && (
                        <Badge className='bg-green-500 text-white text-xs'>
                          <Star className='w-3 h-3 mr-1' />
                          Ottimale
                        </Badge>
                      )}
                    </div>
                    <p className='text-sm text-apple-gray dark:text-[#636366]'>
                      {slot.technicianName} • {slot.liftAvailable}
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                    Capacità
                  </div>
                  <div
                    className={`text-sm ${
                      slot.capacityPercentage > 80
                        ? 'text-red-500'
                        : slot.capacityPercentage > 50
                          ? 'text-amber-500'
                          : 'text-green-500'
                    }`}
                  >
                    {slot.capacityPercentage}%
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {errors.selectedSlotId && (
          <p className='text-red-500 text-sm mt-2'>{errors.selectedSlotId.message as string}</p>
        )}
      </div>

      {/* Buffer Time */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <div className='mb-4'>
          <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>Buffer Time</h3>
          <p className='text-sm text-apple-gray dark:text-[#636366]'>
            Tempo di pulizia/setup dopo l&apos;appuntamento
          </p>
        </div>

        <Controller
          name='bufferTime'
          control={control}
          render={({ field }) => (
            <div className='flex gap-3'>
              {[5, 10, 15].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => field.onChange(minutes)}
                  className={`flex-1 py-3 rounded-xl border transition-colors ${
                    field.value === minutes
                      ? 'border-black dark:border-[#ececec] bg-apple-light-gray/30 dark:bg-[#353535] text-apple-dark dark:text-[#ececec]'
                      : 'border-apple-border dark:border-[#424242] text-apple-gray dark:text-[#636366] hover:border-apple-dark/30 dark:hover:border-[#636366]'
                  }`}
                >
                  <div className='text-lg font-semibold'>{minutes}</div>
                  <div className='text-xs'>min</div>
                </button>
              ))}
            </div>
          )}
        />

        <p className='text-sm text-apple-gray dark:text-[#636366] mt-4'>
          Impatto: Lo slot successivo verrà mostrato disponibile {bufferTime} min dopo la fine di
          questo appuntamento.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STEP 5: AI FEATURES
// ============================================================================

function Step5AIFeatures({
  control,
  watch,
  setValue,
  totalEstimatedCost,
  baseLaborCost,
  preventiveCost,
}: Pick<BookingStepBaseProps, 'control' | 'watch' | 'setValue'> & {
  totalEstimatedCost: number;
  baseLaborCost: number;
  preventiveCost: number;
}) {
  const selectedServices = watch('selectedPreventiveServices') || [];

  const toggleService = (serviceId: string) => {
    const current = selectedServices;
    if (current.includes(serviceId)) {
      setValue(
        'selectedPreventiveServices',
        current.filter((id: string) => id !== serviceId)
      );
    } else {
      setValue('selectedPreventiveServices', [...current, serviceId]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='space-y-8'
    >
      <div className='mb-6'>
        <h2 className='text-xl font-semibold text-apple-dark dark:text-[#ececec]'>
          Funzionalità AI e Smart
        </h2>
        <p className='text-apple-gray dark:text-[#636366] text-sm'>
          Suggerimenti intelligenti basati sullo storico
        </p>
      </div>

      {/* Preventive Services */}
      <div className='bg-apple-light-gray/30 dark:bg-[#353535] rounded-3xl p-6 border border-apple-border/20 dark:border-[#424242]/50'>
        <div className='flex items-center gap-2 mb-4'>
          <Shield className='w-5 h-5 text-apple-dark dark:text-[#ececec]' />
          <h3 className='font-semibold text-apple-dark dark:text-[#ececec]'>
            Servizi Preventivi Suggeriti
          </h3>
          <Badge className='bg-apple-light-gray/30 dark:bg-[#353535] text-apple-dark dark:text-[#ececec] border border-black dark:border-[#424242]'>
            AI Powered
          </Badge>
        </div>

        <div className='space-y-3'>
          {PREVENTIVE_SERVICES.map(service => (
            <motion.button
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                selectedServices.includes(service.id)
                  ? 'border-black dark:border-[#ececec] bg-white dark:bg-[#2f2f2f]'
                  : 'border-transparent bg-white/60 dark:bg-[#2f2f2f]/60 hover:bg-white dark:hover:bg-[#353535]'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className='flex items-start justify-between'>
                <div className='flex items-start gap-3'>
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      selectedServices.includes(service.id)
                        ? 'border-black bg-black dark:border-[#ececec] dark:bg-[#ececec]'
                        : 'border-apple-border dark:border-[#424242]'
                    }`}
                  >
                    {selectedServices.includes(service.id) && (
                      <Check className='w-3 h-3 text-white' />
                    )}
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold text-apple-dark dark:text-[#ececec]'>
                        {service.title}
                      </span>
                      <Badge
                        className={`text-xs ${
                          service.priority === 'high'
                            ? 'bg-black/10 dark:bg-[#ececec]/10 text-apple-dark dark:text-[#ececec] border border-black dark:border-[#424242]'
                            : service.priority === 'medium'
                              ? 'bg-black/5 dark:bg-[#ececec]/5 text-apple-dark dark:text-[#ececec] border border-black/50 dark:border-[#424242]'
                              : 'bg-apple-light-gray/30 dark:bg-[#353535] text-apple-dark dark:text-[#ececec] border border-apple-border dark:border-[#424242]'
                        }`}
                      >
                        {service.priority}
                      </Badge>
                    </div>
                    <p className='text-sm text-apple-dark dark:text-[#ececec] mt-1'>
                      {service.reason}
                    </p>
                    <div className='flex items-center gap-3 mt-2 text-xs text-apple-dark dark:text-[#ececec]'>
                      <span>Stima: €{service.estimatedCost}</span>
                      <span>•</span>
                      <span>Confidenza: {service.aiConfidence}%</span>
                    </div>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-semibold text-apple-dark dark:text-[#ececec]'>
                    €{service.estimatedCost}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cost Summary */}
      <div className='bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-apple-border/50 dark:border-[#424242]'>
        <h3 className='font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2'>
          <Zap className='w-5 h-5 text-apple-dark dark:text-[#ececec]' />
          Stima Costi
        </h3>

        <div className='space-y-3'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-apple-gray dark:text-[#636366]'>
              Mano d&apos;opera ({watch('duration')} min @ €85/h)
            </span>
            <span className='font-medium text-apple-dark dark:text-[#ececec]'>
              €{baseLaborCost.toFixed(2)}
            </span>
          </div>

          {preventiveCost > 0 && (
            <div className='flex items-center justify-between text-sm'>
              <span className='text-apple-gray dark:text-[#636366]'>
                Servizi preventivi ({selectedServices.length})
              </span>
              <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                +€{preventiveCost.toFixed(2)}
              </span>
            </div>
          )}

          <div className='border-t border-apple-border dark:border-[#424242] pt-3'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold text-apple-dark dark:text-[#ececec]'>
                Totale Stimato
              </span>
              <span className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
                €{totalEstimatedCost.toFixed(2)}
              </span>
            </div>
            <p className='text-xs text-apple-gray dark:text-[#636366] mt-2'>
              * Il costo finale può variare in base alle condizioni del veicolo.
            </p>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className='bg-apple-light-gray/30 dark:bg-[#353535] rounded-3xl p-6 border border-apple-border/20 dark:border-[#424242]/50'>
        <h3 className='font-semibold text-apple-dark dark:text-[#ececec] mb-4 flex items-center gap-2'>
          <Sparkles className='w-5 h-5 text-apple-dark dark:text-[#ececec]' />
          Riepilogo AI
        </h3>

        <div className='space-y-2 text-sm text-apple-dark dark:text-[#ececec]'>
          <p>
            <strong>Cliente:</strong> {watch('customerName')}
          </p>
          <p>
            <strong>Veicolo:</strong> {watch('vehicleMake')} {watch('vehicleModel')} (
            {watch('vehicleYear')})
          </p>
          <p>
            <strong>Servizio:</strong> {watch('serviceType')}
          </p>
          <p>
            <strong>Data:</strong> {watch('date')} alle {watch('time')}
          </p>
          <p>
            <strong>Tecnico:</strong> {watch('technicianId') || 'Da assegnare'}
          </p>
          <p>
            <strong>Durata:</strong> {watch('duration')} minuti
          </p>
          <p>
            <strong>Notifiche:</strong> Email {watch('emailReminder') ? '✓' : '✗'}, SMS{' '}
            {watch('smsReminder') ? '✓' : '✗'}
          </p>
          <p>
            <strong>Conferma:</strong>{' '}
            {watch('requireConfirmation') ? 'Richiesta' : 'Non richiesta'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SUCCESS VIEW
// ============================================================================

function SuccessView({ bookingNumber, onClose }: { bookingNumber: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className='fixed inset-0 bg-white dark:bg-[#212121] flex items-center justify-center p-4 overflow-hidden'
    >
      <div className='w-[min(900px,95vw)] h-[min(900px,95vh)] bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple rounded-[40px] shadow-2xl border border-apple-border/20 dark:border-[#424242]/50 flex flex-col items-center justify-center p-10 text-center'>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className='w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8'
        >
          <Check className='w-16 h-16 text-white' />
        </motion.div>

        <h2 className='text-3xl font-bold text-apple-dark dark:text-[#ececec] mb-4'>
          Prenotazione Creata!
        </h2>
        <p className='text-apple-gray dark:text-[#636366] mb-8 max-w-md'>
          L&apos;appuntamento è stato registrato con successo. Il cliente riceverà le notifiche
          configurate.
        </p>

        <div className='bg-apple-light-gray/30 dark:bg-[#353535] rounded-2xl p-6 mb-8'>
          <p className='text-sm text-apple-gray dark:text-[#636366] mb-2'>Numero Prenotazione</p>
          <p className='text-3xl font-mono font-bold text-apple-dark dark:text-[#ececec]'>
            {bookingNumber}
          </p>
        </div>

        <Button
          onClick={onClose}
          className='rounded-full px-8 h-14 bg-black hover:bg-gray-800 dark:bg-[#ececec] dark:hover:bg-white dark:text-black text-white'
        >
          Crea Nuova Prenotazione
        </Button>
      </div>
    </motion.div>
  );
}

export default BookingFormComplete;
