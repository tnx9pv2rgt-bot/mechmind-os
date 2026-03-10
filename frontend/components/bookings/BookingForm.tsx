'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AppleButton } from '@/components/ui/apple-button'
import { bookingSchema, BookingFormData, serviceTypeLabels, serviceTypeIcons, timeSlots } from '@/lib/validations/booking'
import { 
  User, 
  Car, 
  Wrench, 
  Calendar, 
  Clock, 
  UserCircle, 
  FileText, 
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

// Mock data - in real app would come from API
const mockCustomers = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Mario Rossi', phone: '+39 333 1234567' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Laura Bianchi', phone: '+39 333 7654321' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Giuseppe Verdi', phone: '+39 333 9876543' },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Anna Neri', phone: '+39 333 4567890' },
  { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Roberto Marino', phone: '+39 333 1122334' },
  { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Francesca Colombo', phone: '+39 333 5566778' },
  { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Antonio Russo', phone: '+39 333 9900112' },
  { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Maria Ferrari', phone: '+39 333 3344556' },
]

const mockVehicles: Record<string, Array<{ id: string; plate: string; model: string; year: number }>> = {
  '550e8400-e29b-41d4-a716-446655440001': [
    { id: 'vh-001', plate: 'AB123CD', model: 'Fiat Panda 1.2', year: 2020 },
    { id: 'vh-002', plate: 'EF456GH', model: 'Ford Fiesta 1.0', year: 2019 },
  ],
  '550e8400-e29b-41d4-a716-446655440002': [
    { id: 'vh-003', plate: 'CD456EF', model: 'Ford Fiesta 1.5', year: 2021 },
  ],
  '550e8400-e29b-41d4-a716-446655440003': [
    { id: 'vh-004', plate: 'GH789IJ', model: 'BMW X3 xDrive20d', year: 2022 },
    { id: 'vh-005', plate: 'KL012MN', model: 'Audi A4 2.0 TDI', year: 2021 },
  ],
  '550e8400-e29b-41d4-a716-446655440004': [
    { id: 'vh-006', plate: 'MN345OP', model: 'Volkswagen Golf 1.6', year: 2020 },
  ],
  '550e8400-e29b-41d4-a716-446655440005': [
    { id: 'vh-007', plate: 'AB987CD', model: 'VW Golf GTI', year: 2023 },
  ],
}

const mockMechanics = [
  { id: 'mech-001', name: 'Luca Tecnico', specialty: 'Meccanica generale' },
  { id: 'mech-002', name: 'Paolo Elettrauto', specialty: 'Elettronica' },
  { id: 'mech-003', name: 'Giovanni Carrozziere', specialty: 'Carrozzeria' },
  { id: 'mech-004', name: 'Marco Gommista', specialty: 'Gomme' },
]

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

interface BookingFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
}

export function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const { toast } = useToast()

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerId: '',
      vehicleId: '',
      serviceType: undefined,
      date: undefined,
      timeSlot: '',
      mechanicId: '',
      notes: '',
      duration: 60,
      priority: 'normal',
    } as unknown as BookingFormData,
    mode: 'onChange',
  })

  const selectedCustomerId = form.watch('customerId')
  const selectedServiceType = form.watch('serviceType')
  const estimatedDuration = form.watch('duration')

  // Focus first field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCustomerDropdown(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return mockCustomers
    const search = customerSearch.toLowerCase()
    return mockCustomers.filter(
      c => c.name.toLowerCase().includes(search) || c.phone.includes(search)
    )
  }, [customerSearch])

  // Get vehicles for selected customer
  const customerVehicles = useMemo(() => {
    if (!selectedCustomerId) return []
    return mockVehicles[selectedCustomerId] || []
  }, [selectedCustomerId])

  // Reset vehicle when customer changes
  useEffect(() => {
    form.setValue('vehicleId', '')
  }, [selectedCustomerId, form])

  const onSubmit = async (data: BookingFormData) => {
    setStatus('loading')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('Booking created:', data)
      setStatus('success')
      
      toast({
        title: 'Prenotazione creata!',
        description: `Appuntamento confermato per ${data.date} alle ${data.timeSlot}`,
        variant: 'success',
      })
      
      setTimeout(() => {
        onSuccess?.()
      }, 1000)
    } catch (error) {
      setStatus('error')
      toast({
        title: 'Errore',
        description: 'Impossibile creare la prenotazione. Riprova.',
        variant: 'error',
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel?.()
    }
    if (e.key === 'Enter' && e.metaKey) {
      form.handleSubmit(onSubmit)()
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins} min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }

  const getTodayString = () => {
    return new Date().toISOString().split('T')[0]
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        onKeyDown={handleKeyDown}
        className="space-y-5"
      >
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Prenotazione confermata!
              </h3>
              <p className="text-gray-500">
                L'appuntamento è stato creato con successo.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Customer Select with Search */}
              <motion.div
                custom={0}
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
              >
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        Cliente *
                      </FormLabel>
                      <div className="relative">
                        {!field.value ? (
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Cerca cliente per nome o telefono..."
                              value={customerSearch}
                              onChange={(e) => {
                                setCustomerSearch(e.target.value)
                                setShowCustomerDropdown(true)
                              }}
                              onFocus={() => setShowCustomerDropdown(true)}
                              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/60 border border-gray-200/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 outline-none text-gray-900 placeholder:text-gray-400"
                              autoFocus
                            />
                            {customerSearch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerSearch('')
                                  setShowCustomerDropdown(true)
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                              >
                                <X className="w-3 h-3 text-gray-500" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {mockCustomers.find(c => c.id === field.value)?.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {mockCustomers.find(c => c.id === field.value)?.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {mockCustomers.find(c => c.id === field.value)?.phone}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange('')
                                setCustomerSearch('')
                                setShowCustomerDropdown(true)
                              }}
                              className="p-2 rounded-full hover:bg-blue-100 transition-colors"
                            >
                              <X className="w-4 h-4 text-blue-500" />
                            </button>
                          </div>
                        )}
                        
                        <AnimatePresence>
                          {showCustomerDropdown && !field.value && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl max-h-64 overflow-y-auto"
                            >
                              {filteredCustomers.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                  Nessun cliente trovato
                                </div>
                              ) : (
                                filteredCustomers.map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      field.onChange(customer.id)
                                      setShowCustomerDropdown(false)
                                      setCustomerSearch('')
                                    }}
                                    className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                      {customer.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                      <p className="font-medium text-gray-900">{customer.name}</p>
                                      <p className="text-sm text-gray-500">{customer.phone}</p>
                                    </div>
                                  </button>
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <FormMessage className="text-sm text-red-500 flex items-center gap-1" />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Vehicle Select */}
              <AnimatePresence>
                {selectedCustomerId && customerVehicles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    custom={1}
                    variants={slideUpVariants}
                  >
                    <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Car className="w-4 h-4 text-indigo-500" />
                            Veicolo
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-2xl bg-white/60 border-gray-200/50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all duration-300">
                                <SelectValue placeholder="Seleziona un veicolo (opzionale)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl">
                              {customerVehicles.map((vehicle) => (
                                <SelectItem 
                                  key={vehicle.id} 
                                  value={vehicle.id}
                                  className="rounded-xl focus:bg-indigo-50"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                      {vehicle.plate}
                                    </span>
                                    <span>{vehicle.model}</span>
                                    <span className="text-gray-400">({vehicle.year})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Service Type */}
              <motion.div
                custom={2}
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
              >
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-purple-500" />
                        Tipo di Servizio *
                      </FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(serviceTypeLabels).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300',
                              field.value === value
                                ? 'border-purple-400 bg-purple-50 shadow-lg shadow-purple-100'
                                : 'border-gray-200/50 bg-white/40 hover:bg-white/60 hover:border-purple-200'
                            )}
                          >
                            <span className="text-2xl">{serviceTypeIcons[value]}</span>
                            <span className={cn(
                              'text-xs font-medium',
                              field.value === value ? 'text-purple-700' : 'text-gray-600'
                            )}>
                              {label}
                            </span>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  custom={3}
                  variants={slideUpVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-500" />
                          Data *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="date"
                              min={getTodayString()}
                              className="h-14 rounded-2xl bg-white/60 border-gray-200/50 focus:bg-white focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300"
                              {...field}
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : String(field.value ?? '')}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  custom={4}
                  variants={slideUpVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FormField
                    control={form.control}
                    name="timeSlot"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          Ora *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl bg-white/60 border-gray-200/50 focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl max-h-48">
                            <div className="grid grid-cols-3 gap-1 p-2">
                              {timeSlots.map((time) => (
                                <SelectItem 
                                  key={time} 
                                  value={time}
                                  className="rounded-xl focus:bg-orange-50 justify-center"
                                >
                                  {time}
                                </SelectItem>
                              ))}
                            </div>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              </div>

              {/* Mechanic Select */}
              <motion.div
                custom={5}
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
              >
                <FormField
                  control={form.control}
                  name="mechanicId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-pink-500" />
                        Meccanico Assegnato
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-2xl bg-white/60 border-gray-200/50 focus:bg-white focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all duration-300">
                            <SelectValue placeholder="Seleziona un meccanico (opzionale)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl">
                          {mockMechanics.map((mechanic) => (
                            <SelectItem 
                              key={mechanic.id} 
                              value={mechanic.id}
                              className="rounded-xl focus:bg-pink-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-sm font-semibold">
                                  {mechanic.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium">{mechanic.name}</p>
                                  <p className="text-xs text-gray-500">{mechanic.specialty}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Duration Slider */}
              <motion.div
                custom={6}
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
              >
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Hourglass className="w-4 h-4 text-cyan-500" />
                        Durata Stimata
                        <span className="ml-auto text-cyan-600 font-medium bg-cyan-50 px-3 py-1 rounded-full">
                          {formatDuration(field.value)}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative pt-2">
                          <input
                            type="range"
                            min={30}
                            max={480}
                            step={15}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                            style={{
                              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((field.value - 30) / (480 - 30)) * 100}%, #e5e7eb ${((field.value - 30) / (480 - 30)) * 100}%, #e5e7eb 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>30min</span>
                            <span>2h</span>
                            <span>4h</span>
                            <span>6h</span>
                            <span>8h</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Notes */}
              <motion.div
                custom={7}
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
              >
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Note
                        <span className="text-xs text-gray-400 font-normal">
                          ({field.value?.length || 0}/500)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Aggiungi note o richieste speciali..."
                          className="min-h-[100px] rounded-2xl bg-white/60 border-gray-200/50 focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all duration-300 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Submit Button */}
              <motion.div
                custom={8}
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
                className="pt-4"
              >
                <div className="flex gap-3">
                  <AppleButton
                    type="button"
                    variant="secondary"
                    className="flex-1 h-14 rounded-2xl"
                    onClick={onCancel}
                    disabled={status === 'loading'}
                  >
                    Annulla
                  </AppleButton>
                  <AppleButton
                    type="submit"
                    className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-300"
                    loading={status === 'loading'}
                    disabled={!form.formState.isValid}
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Crea Prenotazione
                      </>
                    )}
                  </AppleButton>
                </div>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Premi <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">⌘ + Enter</kbd> per confermare
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Form>
  )
}
