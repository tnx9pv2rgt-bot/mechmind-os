'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import Link from 'next/link'
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PortalLayout } from '@/components/portal'
import { portalAuth } from '@/lib/auth/portal-auth'
import { BookingType, CustomerVehicle } from '@/lib/types/portal'

// ============================================
// MOCK DATA
// ============================================

const mockVehicles: CustomerVehicle[] = [
  {
    id: 'v1',
    customerId: '1',
    make: 'Volkswagen',
    model: 'Golf',
    year: 2020,
    licensePlate: 'AB123CD',
    mileage: 45000,
    fuelType: 'diesel',
  },
]

const serviceTypes: { type: BookingType; label: string; description: string; duration: number }[] = [
  { type: 'maintenance', label: 'Tagliando', description: 'Manutenzione ordinaria programmata', duration: 120 },
  { type: 'repair', label: 'Riparazione', description: 'Riparazione guasto o danno', duration: 180 },
  { type: 'inspection', label: 'Ispezione', description: 'Controllo completo del veicolo', duration: 90 },
  { type: 'warranty', label: 'Lavoro in Garanzia', description: 'Intervento coperto da garanzia', duration: 120 },
  { type: 'consultation', label: 'Consulenza', description: 'Valutazione e preventivo', duration: 30 },
  { type: 'emergency', label: 'Emergenza', description: 'Problema urgente da risolvere', duration: 60 },
]

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewBookingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: '' as BookingType | '',
    date: '',
    time: '',
    notes: '',
  })

  // const customer = await portalAuth.getCurrentCustomer(token)
  const customer = null // TODO: Get from auth context

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    // Mock API call
    setTimeout(() => {
      setIsLoading(false)
      setStep(5) // Success step
    }, 1500)
  }

  const selectedService = serviceTypes.find(s => s.type === formData.type)
  const selectedVehicle = mockVehicles.find(v => v.id === formData.vehicleId)

  const isStepValid = () => {
    switch (step) {
      case 1: return !!formData.vehicleId
      case 2: return !!formData.type
      case 3: return !!formData.date && !!formData.time
      case 4: return true // Notes are optional
      default: return false
    }
  }

  return (
    <PortalLayout customer={customer || undefined}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link 
            href="/portal/bookings"
            className="inline-flex items-center gap-2 text-sm text-apple-gray hover:text-apple-dark transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alle prenotazioni
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-apple-dark">Nuova Prenotazione</h1>
          <p className="text-apple-gray mt-1">Prenota un appuntamento in officina</p>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${step >= s 
                  ? 'bg-apple-blue text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {step > s ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-0.5 mx-1 ${step > s ? 'bg-apple-blue' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {step === 1 && (
            <AppleCard>
              <AppleCardContent className="p-6">
                <h2 className="text-lg font-semibold text-apple-dark mb-4 flex items-center gap-2">
                  <Car className="h-5 w-5 text-apple-blue" />
                  Seleziona il veicolo
                </h2>

                <div className="space-y-3">
                  {mockVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => setFormData({ ...formData, vehicleId: vehicle.id })}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all
                        ${formData.vehicleId === vehicle.id
                          ? 'border-apple-blue bg-blue-50'
                          : 'border-gray-200 hover:border-apple-blue/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Car className="h-6 w-6 text-apple-gray" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-apple-dark">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-sm text-apple-gray">
                            {vehicle.licensePlate} • {vehicle.year}
                          </p>
                        </div>
                        {formData.vehicleId === vehicle.id && (
                          <CheckCircle className="h-5 w-5 text-apple-blue" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-apple-light-gray/50 rounded-xl text-center">
                  <p className="text-sm text-apple-gray">
                    Vuoi aggiungere un nuovo veicolo?{' '}
                    <Link href="/portal/settings" className="text-apple-blue hover:underline">
                      Vai alle impostazioni
                    </Link>
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {step === 2 && (
            <AppleCard>
              <AppleCardContent className="p-6">
                <h2 className="text-lg font-semibold text-apple-dark mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-apple-blue" />
                  Tipo di servizio
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {serviceTypes.map((service) => (
                    <button
                      key={service.type}
                      onClick={() => setFormData({ ...formData, type: service.type })}
                      className={`
                        p-4 rounded-xl border-2 text-left transition-all
                        ${formData.type === service.type
                          ? 'border-apple-blue bg-blue-50'
                          : 'border-gray-200 hover:border-apple-blue/50'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-apple-dark">{service.label}</p>
                          <p className="text-sm text-apple-gray mt-1">{service.description}</p>
                          <p className="text-xs text-apple-blue mt-2">
                            Durata: ~{service.duration} min
                          </p>
                        </div>
                        {formData.type === service.type && (
                          <CheckCircle className="h-5 w-5 text-apple-blue flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {step === 3 && (
            <AppleCard>
              <AppleCardContent className="p-6">
                <h2 className="text-lg font-semibold text-apple-dark mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-apple-blue" />
                  Data e ora
                </h2>

                <div className="space-y-6">
                  {/* Date Picker */}
                  <div>
                    <Label className="text-apple-dark mb-2 block">Data</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  {/* Time Slots */}
                  {formData.date && (
                    <div>
                      <Label className="text-apple-dark mb-3 block">Orario</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setFormData({ ...formData, time })}
                            className={`
                              p-2 rounded-lg text-sm font-medium transition-all
                              ${formData.time === time
                                ? 'bg-apple-blue text-white'
                                : 'bg-apple-light-gray text-apple-dark hover:bg-gray-200'
                              }
                            `}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {step === 4 && (
            <AppleCard>
              <AppleCardContent className="p-6">
                <h2 className="text-lg font-semibold text-apple-dark mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-apple-blue" />
                  Note aggiuntive
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-apple-dark mb-2 block">
                      Descrivi il problema o le esigenze (opzionale)
                    </Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Es. Rumore strano al motore, bisogno di sostituire le gomme..."
                      rows={4}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-apple-light-gray/50 rounded-xl space-y-2">
                    <h3 className="font-medium text-apple-dark">Riepilogo</h3>
                    <div className="text-sm text-apple-gray space-y-1">
                      <p><span className="text-apple-dark">Veicolo:</span> {selectedVehicle?.make} {selectedVehicle?.model}</p>
                      <p><span className="text-apple-dark">Servizio:</span> {selectedService?.label}</p>
                      <p><span className="text-apple-dark">Data:</span> {formData.date ? new Date(formData.date).toLocaleDateString('it-IT') : '-'}</p>
                      <p><span className="text-apple-dark">Ora:</span> {formData.time || '-'}</p>
                    </div>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {step === 5 && (
            <AppleCard>
              <AppleCardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-apple-green" />
                </div>
                <h2 className="text-2xl font-bold text-apple-dark mb-2">
                  Prenotazione Confermata!
                </h2>
                <p className="text-apple-gray mb-6">
                  Ti abbiamo inviato un&apos;email di conferma con tutti i dettagli.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/portal/bookings">
                    <AppleButton variant="secondary">
                      Vedi le mie prenotazioni
                    </AppleButton>
                  </Link>
                  <Link href="/portal/dashboard">
                    <AppleButton>
                      Torna alla dashboard
                    </AppleButton>
                  </Link>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}
        </motion.div>

        {/* Navigation Buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-6">
            <AppleButton
              variant="secondary"
              onClick={handleBack}
              disabled={step === 1}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Indietro
            </AppleButton>

            {step < 4 ? (
              <AppleButton
                onClick={handleNext}
                disabled={!isStepValid()}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Continua
              </AppleButton>
            ) : (
              <AppleButton
                onClick={handleSubmit}
                loading={isLoading}
              >
                Conferma Prenotazione
              </AppleButton>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
