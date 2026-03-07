'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
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
  Zap
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  lastAppointment?: string
}

interface VehicleData {
  make: string
  model: string
  year: number
  color: string
  vin: string
}

interface SlotOption {
  id: string
  start: string
  end: string
  technicianId: string
  technicianName: string
  liftAvailable: string
  capacityPercentage: number
  isOptimal: boolean
}

interface PreventiveService {
  id: string
  title: string
  reason: string
  estimatedCost: number
  priority: 'high' | 'medium' | 'low'
  aiConfidence: number
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
  serviceType: z.enum(['maintenance', 'repair', 'inspection', 'diagnostic', 'tires', 'bodywork', 'revision', 'other']),
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
})

type BookingFormData = z.infer<typeof bookingFormSchema>

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Mario Rossi', email: 'mario@email.it', phone: '+39 333 1234567', lastAppointment: '2 settimane fa' },
  { id: '2', name: 'Laura Bianchi', email: 'laura@email.it', phone: '+39 333 7654321', lastAppointment: '1 mese fa' },
  { id: '3', name: 'Giuseppe Verdi', email: 'giuseppe@email.it', phone: '+39 333 9876543', lastAppointment: '3 giorni fa' },
  { id: '4', name: 'Anna Neri', email: 'anna@email.it', phone: '+39 333 4567890', lastAppointment: '2 mesi fa' },
]

const MOCK_TECHNICIANS = [
  { id: 'tech-1', name: 'Marco Ferrari', specialty: 'Elettrauto', avatar: 'MF' },
  { id: 'tech-2', name: 'Luigi Bianchi', specialty: 'Gommista', avatar: 'LB' },
  { id: 'tech-3', name: 'Paolo Rossi', specialty: 'Meccanico', avatar: 'PR' },
  { id: 'tech-4', name: 'Andrea Verdi', specialty: 'Full-Stack', avatar: 'AV' },
]

const MOCK_SLOTS: SlotOption[] = [
  { id: 'slot-1', start: '2026-03-04T09:00:00', end: '2026-03-04T10:30:00', technicianId: 'tech-1', technicianName: 'Marco Ferrari', liftAvailable: 'Ponte A', capacityPercentage: 45, isOptimal: true },
  { id: 'slot-2', start: '2026-03-04T14:00:00', end: '2026-03-04T15:30:00', technicianId: 'tech-2', technicianName: 'Luigi Bianchi', liftAvailable: 'Ponte B', capacityPercentage: 60, isOptimal: true },
  { id: 'slot-3', start: '2026-03-05T10:00:00', end: '2026-03-05T11:30:00', technicianId: 'tech-3', technicianName: 'Paolo Rossi', liftAvailable: 'Ponte A', capacityPercentage: 75, isOptimal: false },
  { id: 'slot-4', start: '2026-03-05T16:00:00', end: '2026-03-05T17:30:00', technicianId: 'tech-4', technicianName: 'Andrea Verdi', liftAvailable: 'Ponte C', capacityPercentage: 30, isOptimal: true },
]

const PREVENTIVE_SERVICES: PreventiveService[] = [
  { id: 'prev-1', title: 'Cambio olio e filtri', reason: 'Ultimo cambio 12 mesi fa', estimatedCost: 120, priority: 'high', aiConfidence: 95 },
  { id: 'prev-2', title: 'Controllo freni', reason: 'KM percorsi: 25.000 da ultimo controllo', estimatedCost: 45, priority: 'medium', aiConfidence: 87 },
  { id: 'prev-3', title: 'Sostituzione candele', reason: 'Età veicolo 4 anni', estimatedCost: 80, priority: 'medium', aiConfidence: 78 },
  { id: 'prev-4', title: 'Ricarica clima', reason: 'Stagione estiva in arrivo', estimatedCost: 65, priority: 'low', aiConfidence: 72 },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingFormComplete() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isDecodingPlate, setIsDecodingPlate] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  
  const totalSteps = 5
  
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
  })
  
  const watchServiceType = watch('serviceType')
  const watchUrgency = watch('urgency')
  const watchDuration = watch('duration')
  const watchLicensePlate = watch('licensePlate')
  const watchDate = watch('date')
  const watchTime = watch('time')
  const watchSelectedServices = watch('selectedPreventiveServices')
  
  // Filter customers based on search
  const filteredCustomers = customerSearch.length > 0
    ? MOCK_CUSTOMERS.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch) ||
        c.email.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : []
  
  // Decode license plate
  const decodeLicensePlate = useCallback(async () => {
    if (!watchLicensePlate || watchLicensePlate.length < 5) return
    
    setIsDecodingPlate(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Mock decoded data
    setValue('vehicleMake', 'BMW')
    setValue('vehicleModel', 'Serie 3')
    setValue('vehicleYear', 2022)
    setValue('vehicleColor', 'Nero')
    setValue('vehicleVin', 'WBA1234567890XYZ')
    
    setIsDecodingPlate(false)
  }, [watchLicensePlate, setValue])
  
  // Voice recording simulation
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])
  
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      setValue('voiceNote', 'Freni che cigolano quando freno forte, specialmente al mattino quando è freddo.')
      setRecordingTime(0)
    } else {
      setIsRecording(true)
      setRecordingTime(0)
    }
  }
  
  // Calculate estimated cost
  const baseLaborCost = (watchDuration / 60) * 85 // €85/hour
  const preventiveCost = watchSelectedServices.reduce((sum, serviceId) => {
    const service = PREVENTIVE_SERVICES.find(s => s.id === serviceId)
    return sum + (service?.estimatedCost || 0)
  }, 0)
  const totalEstimatedCost = baseLaborCost + preventiveCost
  
  // Handle step navigation - DEV MODE: bypass validation to preview all steps
  const nextStep = async () => {
    // DEV MODE: Skip validation to allow previewing all steps
    // TODO: Remove this in production and uncomment validation below
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
      return
    }
    
    // PRODUCTION VALIDATION (commented for dev):
    /*
    let fieldsToValidate: string[] = []
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['customerName', 'customerEmail', 'customerPhone', 'licensePlate', 'vehicleMake', 'vehicleModel']
        break
      case 2:
        fieldsToValidate = ['serviceType', 'description', 'date', 'time']
        break
      case 3:
        fieldsToValidate = ['confirmationChannel']
        break
      case 4:
        fieldsToValidate = ['selectedSlotId']
        break
    }
    
    const isValid = await trigger(fieldsToValidate as any)
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
    */
  }
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('Booking submitted:', data)
    setIsSubmitting(false)
    setIsSuccess(true)
  }
  
  // Service type conditional fields
  const getServiceSubtypeOptions = () => {
    switch (watchServiceType) {
      case 'maintenance':
        return [
          { value: 'oil-change', label: 'Cambio olio' },
          { value: 'filters', label: 'Filtri' },
          { value: 'scheduled', label: 'Tagliando programmato' },
        ]
      case 'repair':
        return [
          { value: 'brakes', label: 'Freni' },
          { value: 'suspension', label: 'Sospensioni' },
          { value: 'electrical', label: 'Elettrico' },
          { value: 'engine', label: 'Motore' },
        ]
      case 'tires':
        return [
          { value: 'change', label: 'Cambio gomme' },
          { value: 'repair', label: 'Riparazione' },
          { value: 'balance', label: 'Equilibratura' },
        ]
      default:
        return []
    }
  }
  
  // Urgency affects available slots
  const getFilteredSlots = () => {
    if (watchUrgency === 'urgent') {
      return MOCK_SLOTS.slice(0, 2) // Only next 2 slots
    }
    return MOCK_SLOTS
  }
  
  if (isSuccess) {
    return (
      <SuccessView 
        bookingNumber={`PREN-${Date.now().toString(36).toUpperCase()}`}
        onClose={() => window.location.reload()}
      />
    )
  }
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden">
      {/* Main Container - 900x900px - Perfectly Centered */}
      <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)]">
        
        {/* Background Icon/Illustration - Scaled proportionally */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-100/40 via-purple-100/30 to-pink-100/40 blur-3xl" />
          <motion.div 
            className="absolute"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Calendar className="w-[45%] h-[45%] text-blue-200/30" strokeWidth={0.5} />
          </motion.div>
        </div>
        
        {/* Glass Card Container */}
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
                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                  Nuova Prenotazione
                </h1>
                <p className="text-gray-500 mt-1">Crea un nuovo appuntamento per il cliente</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Step</span>
                <span className="text-2xl font-bold text-blue-600">{currentStep}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-400">{totalSteps}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          
          {/* Form Content */}
          <div className="px-10 pb-24 h-[calc(100%-140px)] overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1CustomerVehicle 
                  key="step1"
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
                  key="step2"
                  control={control}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  serviceSubtypeOptions={getServiceSubtypeOptions()}
                  isRecording={isRecording}
                  recordingTime={recordingTime}
                  toggleRecording={toggleRecording}
                />
              )}
              {currentStep === 3 && (
                <Step3Notifications 
                  key="step3"
                  control={control}
                  watch={watch}
                  setValue={setValue}
                />
              )}
              {currentStep === 4 && (
                <Step4Capacity 
                  key="step4"
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
                  key="step5"
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
          <div className="absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 backdrop-blur-xl border-t border-gray-200/50">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="rounded-full px-6 h-12"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Indietro
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  className="rounded-full px-8 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Avanti
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="rounded-full px-8 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
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
  )
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
}: any) {
  const selectedCustomerId = watch('customerId')
  
  const selectCustomer = (customer: Customer) => {
    setValue('customerId', customer.id)
    setValue('customerName', customer.name)
    setValue('customerEmail', customer.email)
    setValue('customerPhone', customer.phone)
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Informazioni Cliente e Veicolo</h2>
          <p className="text-gray-500 text-sm">Cerca un cliente esistente o inserisci i dati manualmente</p>
        </div>
      </div>
      
      {/* Customer Search */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Cerca Cliente</Label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setShowCustomerDropdown(true)
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholder="Cerca per nome, telefono o email..."
            className="pl-12 h-14 rounded-2xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          />
          
          {/* Dropdown */}
          <AnimatePresence>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              >
                {filteredCustomers.map((customer: Customer) => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone} • {customer.email}</p>
                    </div>
                    {customer.lastAppointment && (
                      <Badge variant="secondary" className="text-xs">
                        {customer.lastAppointment}
                      </Badge>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Plus className="w-4 h-4" />
          <span>Oppure <button className="text-blue-600 hover:underline" onClick={() => setShowCustomerDropdown(false)}>clicca per nuovo cliente</button></span>
        </div>
      </div>
      
      {/* Customer Details */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="customerName"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Nome e Cognome *</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} className="pl-12 h-12 rounded-xl" placeholder="Mario Rossi" />
              </div>
              {errors.customerName && (
                <p className="text-red-500 text-sm mt-1">{errors.customerName.message as string}</p>
              )}
            </div>
          )}
        />
        
        <Controller
          name="customerPhone"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Telefono *</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} className="pl-12 h-12 rounded-xl" placeholder="+39 333 1234567" />
              </div>
              {errors.customerPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.customerPhone.message as string}</p>
              )}
            </div>
          )}
        />
        
        <Controller
          name="customerEmail"
          control={control}
          render={({ field }) => (
            <div className="col-span-2">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} type="email" className="pl-12 h-12 rounded-xl" placeholder="mario@email.it" />
              </div>
              {errors.customerEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.customerEmail.message as string}</p>
              )}
            </div>
          )}
        />
      </div>
      
      {/* Vehicle Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Dati Veicolo</h3>
            <p className="text-sm text-gray-500">Inserisci la targa per decodifica automatica</p>
          </div>
        </div>
        
        <div className="flex gap-3 mb-6">
          <Controller
            name="licensePlate"
            control={control}
            render={({ field }) => (
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Targa *</Label>
                <Input 
                  {...field} 
                  className="h-12 rounded-xl uppercase tracking-wider font-medium text-center text-lg" 
                  placeholder="AB 123 CD"
                  maxLength={10}
                />
              </div>
            )}
          />
          <Button
            type="button"
            onClick={decodeLicensePlate}
            disabled={isDecodingPlate || !watch('licensePlate') || watch('licensePlate').length < 5}
            className="h-12 mt-7 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {isDecodingPlate ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
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
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 mb-6"
          >
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Dati Veicolo Decodificati
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Marca:</span>
                <span className="ml-2 font-medium">{watch('vehicleMake')}</span>
              </div>
              <div>
                <span className="text-gray-500">Modello:</span>
                <span className="ml-2 font-medium">{watch('vehicleModel')}</span>
              </div>
              <div>
                <span className="text-gray-500">Anno:</span>
                <span className="ml-2 font-medium">{watch('vehicleYear')}</span>
              </div>
              <div>
                <span className="text-gray-500">Colore:</span>
                <span className="ml-2 font-medium">{watch('vehicleColor')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">VIN:</span>
                <span className="ml-2 font-mono text-xs">{watch('vehicleVin')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
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
}: any) {
  const urgencyOptions = [
    { value: 'routine', label: 'Routine', color: 'bg-green-500', desc: 'Nessuna urgenza' },
    { value: 'semi-urgent', label: 'Semi-Urgente', color: 'bg-yellow-500', desc: 'Da fare entro 7 giorni' },
    { value: 'urgent', label: 'Urgente', color: 'bg-red-500', desc: 'Entro 48 ore' },
  ]
  
  const serviceTypeLabels: any = {
    'maintenance': 'Tagliando',
    'repair': 'Riparazione',
    'inspection': 'Ispezione',
    'diagnostic': 'Diagnosi',
    'tires': 'Pneumatici',
    'bodywork': 'Carrozzeria',
    'revision': 'Revisione',
    'other': 'Altro',
  }
  
  const serviceDurations: any = {
    'maintenance': 90,
    'repair': 120,
    'inspection': 60,
    'diagnostic': 45,
    'tires': 30,
    'bodywork': 180,
    'revision': 90,
    'other': 60,
  }
  
  const handleServiceTypeChange = (value: string) => {
    setValue('serviceType', value)
    setValue('duration', serviceDurations[value] || 60)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dettagli Appuntamento</h2>
          <p className="text-gray-500 text-sm">Configura il tipo di intervento e la data</p>
        </div>
      </div>
      
      {/* Service Type */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <Label className="text-sm font-medium text-gray-700 mb-4 block">Tipo Intervento *</Label>
        <Controller
          name="serviceType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={handleServiceTypeChange} defaultValue={field.value}>
              <SelectTrigger className="h-14 rounded-xl bg-white/80 border-gray-200">
                <SelectValue placeholder="Seleziona tipo intervento" />
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
            className="mt-4"
          >
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Sotto-categoria</Label>
            <Controller
              name="serviceSubtype"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="h-12 rounded-xl bg-white/80 border-gray-200">
                    <SelectValue placeholder="Seleziona sotto-categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceSubtypeOptions.map((opt: any) => (
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
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Livello di Urgenza *</Label>
        <div className="grid grid-cols-3 gap-3">
          {urgencyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setValue('urgency', option.value)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${
                watch('urgency') === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${option.color} mb-2`} />
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
            </button>
          ))}
        </div>
        {watch('urgency') === 'urgent' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-3 bg-red-50 rounded-xl flex items-start gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Per interventi urgenti mostreremo solo gli slot disponibili nelle prossime 48 ore.
            </p>
          </motion.div>
        )}
      </div>
      
      {/* Description with Voice */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium text-gray-700">Descrizione / Richiesta Cliente *</Label>
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isRecording ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <Mic className="w-4 h-4" />
                {recordingTime}s
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Registra voce
              </>
            )}
          </button>
        </div>
        
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <>
              <Textarea 
                {...field} 
                className="min-h-[120px] rounded-xl resize-none bg-white/80 border-gray-200"
                placeholder="Descrivi il problema o la richiesta del cliente..."
              />
              <div className="flex justify-between mt-2">
                {errors.description && (
                  <p className="text-red-500 text-sm">{errors.description.message as string}</p>
                )}
                <span className="text-xs text-gray-400 ml-auto">
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
            className="mt-4 p-4 bg-blue-50 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Nota vocale trascritta</span>
            </div>
            <p className="text-sm text-blue-800">{watch('voiceNote')}</p>
          </motion.div>
        )}
      </div>
      
      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Data *</Label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} type="date" className="pl-12 h-12 rounded-xl" />
              </div>
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message as string}</p>
              )}
            </div>
          )}
        />
        
        <Controller
          name="time"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Ora *</Label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input {...field} type="time" className="pl-12 h-12 rounded-xl" />
              </div>
              {errors.time && (
                <p className="text-red-500 text-sm mt-1">{errors.time.message as string}</p>
              )}
            </div>
          )}
        />
      </div>
      
      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium text-gray-700">Durata Prevista</Label>
          <span className="text-lg font-semibold text-blue-600">{watch('duration')} min</span>
        </div>
        <Controller
          name="duration"
          control={control}
          render={({ field }) => (
            <Slider
              value={[field.value]}
              onValueChange={([value]) => field.onChange(value)}
              min={30}
              max={240}
              step={15}
              className="w-full"
            />
          )}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>30 min</span>
          <span>4 ore</span>
        </div>
      </div>
      
      {/* Technician */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="technicianId"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Tecnico Assegnato</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Seleziona tecnico" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TECHNICIANS.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs flex items-center justify-center">
                          {tech.avatar}
                        </span>
                        <span>{tech.name}</span>
                        <Badge variant="secondary" className="text-xs">{tech.specialty}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        
        <Controller
          name="liftPosition"
          control={control}
          render={({ field }) => (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Posto Rialzo</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Seleziona posto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ponte A">Ponte A</SelectItem>
                  <SelectItem value="Ponte B">Ponte B</SelectItem>
                  <SelectItem value="Ponte C">Ponte C</SelectItem>
                  <SelectItem value="Linea 1">Linea 1</SelectItem>
                  <SelectItem value="Linea 2">Linea 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 3: NOTIFICATIONS
// ============================================================================

function Step3Notifications({ control, watch, setValue }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Promemoria e Notifiche</h2>
          <p className="text-gray-500 text-sm">Configura come e quando contattare il cliente</p>
        </div>
      </div>
      
      {/* Email */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Email</h3>
              <p className="text-sm text-gray-500">Invia promemoria via email</p>
            </div>
          </div>
          <Controller
            name="emailReminder"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        
        {watch('emailReminder') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <Label className="text-sm text-gray-600 mb-2 block">Invia prima di:</Label>
            <Controller
              name="emailTiming"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {[24, 48].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => field.onChange(hours)}
                      className={`px-4 py-2 rounded-xl border transition-colors ${
                        field.value === hours
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">SMS</h3>
              <p className="text-sm text-gray-500">Invia promemoria via SMS</p>
            </div>
          </div>
          <Controller
            name="smsReminder"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        
        {watch('smsReminder') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <Label className="text-sm text-gray-600 mb-2 block">Invia prima di:</Label>
            <Controller
              name="smsTiming"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {[2, 24, 48].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => field.onChange(hours)}
                      className={`px-4 py-2 rounded-xl border transition-colors ${
                        field.value === hours
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">WhatsApp</h3>
              <p className="text-sm text-gray-500">Invia promemoria via WhatsApp</p>
            </div>
          </div>
          <Controller
            name="whatsappReminder"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
      
      {/* 2-Way Confirmation */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Richiedi Conferma</h3>
              <p className="text-sm text-gray-600">Doppio opt-in per confermare l'appuntamento</p>
            </div>
          </div>
          <Controller
            name="requireConfirmation"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        
        {watch('requireConfirmation') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <Label className="text-sm text-gray-600 mb-2 block">Canale di conferma:</Label>
            <Controller
              name="confirmationChannel"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {['sms', 'email', 'whatsapp'].map((channel) => (
                    <button
                      key={channel}
                      onClick={() => field.onChange(channel)}
                      className={`px-4 py-2 rounded-xl border capitalize transition-colors ${
                        field.value === channel
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
  )
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
}: any) {
  const selectedSlotId = watch('selectedSlotId')
  const bufferTime = watch('bufferTime')
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestione Capacità Produttiva</h2>
          <p className="text-gray-500 text-sm">Verifica disponibilità e seleziona lo slot ottimale</p>
        </div>
      </div>
      
      {/* Conflict Warning */}
      {filteredSlots.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3"
        >
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-red-800">Attenzione: Capacità Saturation</h4>
            <p className="text-sm text-red-600 mt-1">
              3 appuntamenti già presenti nella stessa fascia oraria. Considera di aggiungere il cliente alla lista d'attesa.
            </p>
            <Button
              onClick={() => setShowWaitlistModal(true)}
              variant="outline"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi a Lista d'Attesa
            </Button>
          </div>
        </motion.div>
      )}
      
      {/* Available Slots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-sm font-medium text-gray-700">Slot Disponibili Suggeriti</Label>
          <Badge variant="outline" className="text-xs">
            {filteredSlots.length} opzioni
          </Badge>
        </div>
        
        <div className="space-y-3">
          {filteredSlots.map((slot: SlotOption) => (
            <motion.button
              key={slot.id}
              onClick={() => setValue('selectedSlotId', slot.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                selectedSlotId === slot.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white/80'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    slot.isOptimal ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Clock className={`w-5 h-5 ${slot.isOptimal ? 'text-green-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {new Date(slot.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {slot.isOptimal && (
                        <Badge className="bg-green-500 text-white text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Ottimale
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {slot.technicianName} • {slot.liftAvailable}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">Capacità</div>
                  <div className={`text-sm ${
                    slot.capacityPercentage > 80 ? 'text-red-500' : 
                    slot.capacityPercentage > 50 ? 'text-amber-500' : 'text-green-500'
                  }`}>
                    {slot.capacityPercentage}%
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        
        {errors.selectedSlotId && (
          <p className="text-red-500 text-sm mt-2">{errors.selectedSlotId.message as string}</p>
        )}
      </div>
      
      {/* Buffer Time */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Buffer Time</h3>
            <p className="text-sm text-gray-500">Tempo di pulizia/setup dopo l'appuntamento</p>
          </div>
        </div>
        
        <Controller
          name="bufferTime"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3">
              {[5, 10, 15].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => field.onChange(minutes)}
                  className={`flex-1 py-3 rounded-xl border transition-colors ${
                    field.value === minutes
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg font-semibold">{minutes}</div>
                  <div className="text-xs">min</div>
                </button>
              ))}
            </div>
          )}
        />
        
        <p className="text-sm text-gray-500 mt-4">
          Impatto: Lo slot successivo verrà mostrato disponibile {bufferTime} min dopo la fine di questo appuntamento.
        </p>
      </div>
    </motion.div>
  )
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
}: any) {
  const selectedServices = watch('selectedPreventiveServices') || []
  
  const toggleService = (serviceId: string) => {
    const current = selectedServices
    if (current.includes(serviceId)) {
      setValue('selectedPreventiveServices', current.filter((id: string) => id !== serviceId))
    } else {
      setValue('selectedPreventiveServices', [...current, serviceId])
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Funzionalità AI e Smart</h2>
          <p className="text-gray-500 text-sm">Suggerimenti intelligenti basati sullo storico</p>
        </div>
      </div>
      
      {/* Preventive Services */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 border border-violet-200">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Servizi Preventivi Suggeriti</h3>
          <Badge className="bg-violet-100 text-violet-700">AI Powered</Badge>
        </div>
        
        <div className="space-y-3">
          {PREVENTIVE_SERVICES.map((service) => (
            <motion.button
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                selectedServices.includes(service.id)
                  ? 'border-violet-500 bg-white'
                  : 'border-transparent bg-white/60 hover:bg-white'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                    selectedServices.includes(service.id)
                      ? 'border-violet-500 bg-violet-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedServices.includes(service.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{service.title}</span>
                      <Badge 
                        className={`text-xs ${
                          service.priority === 'high' ? 'bg-red-100 text-red-700' :
                          service.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {service.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{service.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Stima: €{service.estimatedCost}</span>
                      <span>•</span>
                      <span>Confidenza: {service.aiConfidence}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-violet-700">€{service.estimatedCost}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Cost Summary */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Stima Costi
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Mano d'opera ({watch('duration')} min @ €85/h)</span>
            <span className="font-medium">€{baseLaborCost.toFixed(2)}</span>
          </div>
          
          {preventiveCost > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Servizi preventivi ({selectedServices.length})</span>
              <span className="font-medium text-green-600">+€{preventiveCost.toFixed(2)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Totale Stimato</span>
              <span className="text-2xl font-bold text-blue-600">€{totalEstimatedCost.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Il costo finale può variare in base alle condizioni del veicolo.
            </p>
          </div>
        </div>
      </div>
      
      {/* AI Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Riepilogo AI
        </h3>
        
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Cliente:</strong> {watch('customerName')}</p>
          <p><strong>Veicolo:</strong> {watch('vehicleMake')} {watch('vehicleModel')} ({watch('vehicleYear')})</p>
          <p><strong>Servizio:</strong> {watch('serviceType')}</p>
          <p><strong>Data:</strong> {watch('date')} alle {watch('time')}</p>
          <p><strong>Tecnico:</strong> {MOCK_TECHNICIANS.find(t => t.id === watch('technicianId'))?.name || 'Da assegnare'}</p>
          <p><strong>Durata:</strong> {watch('duration')} minuti</p>
          <p><strong>Notifiche:</strong> Email {watch('emailReminder') ? '✓' : '✗'}, SMS {watch('smsReminder') ? '✓' : '✗'}</p>
          <p><strong>Conferma:</strong> {watch('requireConfirmation') ? 'Richiesta' : 'Non richiesta'}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// SUCCESS VIEW
// ============================================================================

function SuccessView({ bookingNumber, onClose }: { bookingNumber: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden"
    >
      <div className="w-[min(900px,95vw)] h-[min(900px,95vh)] bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 flex flex-col items-center justify-center p-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8"
        >
          <Check className="w-16 h-16 text-white" />
        </motion.div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Prenotazione Creata!</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          L'appuntamento è stato registrato con successo. Il cliente riceverà le notifiche configurate.
        </p>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
          <p className="text-sm text-gray-500 mb-2">Numero Prenotazione</p>
          <p className="text-3xl font-mono font-bold text-blue-600">{bookingNumber}</p>
        </div>
        
        <Button
          onClick={onClose}
          className="rounded-full px-8 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          Crea Nuova Prenotazione
        </Button>
      </div>
    </motion.div>
  )
}

export default BookingFormComplete
