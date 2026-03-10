'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
// zodResolver removed: form uses local validation
import { User, Mail, Phone, MapPin, FileText, Shield, Check, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { AppleButton } from '@/components/ui/apple-button'
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { formatPhoneNumber, normalizePhone } from '@/lib/validations/customer'

/** Local form data type matching the English field names used in this form */
interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fiscalCode: string;
  address: {
    street: string;
    city: string;
    zipCode: string;
    province: string;
  };
  gdprConsent: boolean;
  marketingConsent: boolean;
  notes: string;
  [key: string]: unknown;
}

export interface CustomerFormProps {
  onSubmit: (data: CustomerFormValues) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<CustomerFormValues>
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

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

export function CustomerForm({ onSubmit, onCancel, initialData }: CustomerFormProps) {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showAddress, setShowAddress] = useState(false)

  const form = useForm<CustomerFormValues>({
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      fiscalCode: initialData?.fiscalCode || '',
      address: {
        street: initialData?.address?.street || '',
        city: initialData?.address?.city || '',
        zipCode: initialData?.address?.zipCode || '',
        province: initialData?.address?.province || '',
      },
      gdprConsent: initialData?.gdprConsent || false,
      marketingConsent: initialData?.marketingConsent || false,
      notes: initialData?.notes || '',
    },
  })

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange(normalizePhone(formatted))
  }, [])

  const handleSubmit = async (data: CustomerFormValues) => {
    setStatus('loading')
    setErrorMessage('')
    
    try {
      await onSubmit(data)
      setStatus('success')
      setTimeout(() => {
        setStatus('idle')
        form.reset()
      }, 2000)
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Errore durante il salvataggio')
    }
  }

  return (
    <AppleCard className="bg-white/70 backdrop-blur-3xl rounded-3xl overflow-hidden">
      <AppleCardHeader className="border-b border-gray-100/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {initialData ? 'Modifica Cliente' : 'Nuovo Cliente'}
            </h2>
            <p className="text-sm text-gray-500">
              {initialData ? 'Aggiorna i dati del cliente' : 'Inserisci i dati del nuovo cliente'}
            </p>
          </div>
        </div>
      </AppleCardHeader>

      <AppleCardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Dati Anagrafici */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div custom={0} variants={slideUpVariants} initial="hidden" animate="visible">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Nome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            placeholder="Mario"
                            className="h-14 rounded-2xl bg-white/60 border-0 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div custom={1} variants={slideUpVariants} initial="hidden" animate="visible">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Cognome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            placeholder="Rossi"
                            className="h-14 rounded-2xl bg-white/60 border-0 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </motion.div>
            </div>

            {/* Contatti */}
            <motion.div custom={2} variants={slideUpVariants} initial="hidden" animate="visible">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="mario.rossi@email.it"
                          className="h-14 rounded-2xl bg-white/60 border-0 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div custom={3} variants={slideUpVariants} initial="hidden" animate="visible">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Telefono</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            placeholder="+39 333 123 4567"
                            onChange={(e) => handlePhoneChange(e, field.onChange)}
                            className="h-14 rounded-2xl bg-white/60 border-0 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div custom={4} variants={slideUpVariants} initial="hidden" animate="visible">
                <FormField
                  control={form.control}
                  name="fiscalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Codice Fiscale (opzionale)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            placeholder="RSSMRA85T10A562S"
                            maxLength={16}
                            className="h-14 rounded-2xl bg-white/60 border-0 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </motion.div>
            </div>

            {/* Indirizzo (opzionale) */}
            <motion.div custom={5} variants={slideUpVariants} initial="hidden" animate="visible">
              <button
                type="button"
                onClick={() => setShowAddress(!showAddress)}
                className="flex items-center justify-between w-full py-3 px-4 rounded-2xl bg-white/40 hover:bg-white/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Indirizzo (opzionale)</span>
                </div>
                {showAddress ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </motion.div>

            <AnimatePresence>
              {showAddress && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-2">
                    <FormField
                      control={form.control}
                      name="address.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Via Roma 123"
                              className="h-12 rounded-2xl bg-white/60 border-0 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Città"
                                className="h-12 rounded-2xl bg-white/60 border-0 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="CAP"
                                maxLength={5}
                                className="h-12 rounded-2xl bg-white/60 border-0 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address.province"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Provincia (es: RM)"
                              maxLength={2}
                              className="h-12 rounded-2xl bg-white/60 border-0 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note */}
            <motion.div custom={6} variants={slideUpVariants} initial="hidden" animate="visible">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Note aggiuntive sul cliente..."
                        rows={3}
                        className="rounded-2xl bg-white/60 border-0 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* GDPR */}
            <motion.div custom={7} variants={slideUpVariants} initial="hidden" animate="visible" className="space-y-3">
              <FormField
                control={form.control}
                name="gdprConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-2xl bg-white/40 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Consenso GDPR *
                      </FormLabel>
                      <p className="text-xs text-gray-500">
                        Dichiaro di aver preso visione dell&apos;informativa privacy e acconsento al trattamento dei dati personali.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-2xl bg-white/40 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-gray-900">
                        Consenso Marketing (opzionale)
                      </FormLabel>
                      <p className="text-xs text-gray-500">
                        Acconsento a ricevere comunicazioni commerciali relative a promozioni e offerte.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage || 'Si è verificato un errore. Riprova.'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 p-4 rounded-2xl bg-green-50 text-green-600 text-sm"
                >
                  <Check className="h-4 w-4 flex-shrink-0" />
                  <span>Cliente salvato con successo!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <motion.div custom={8} variants={slideUpVariants} initial="hidden" animate="visible" className="flex gap-3 pt-4">
              {onCancel && (
                <AppleButton
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  className="flex-1 h-12 rounded-2xl"
                >
                  Annulla
                </AppleButton>
              )}
              <AppleButton
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25"
              >
                {status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : status === 'success' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  initialData ? 'Salva Modifiche' : 'Crea Cliente'
                )}
              </AppleButton>
            </motion.div>
          </form>
        </Form>
      </AppleCardContent>
    </AppleCard>
  )
}
