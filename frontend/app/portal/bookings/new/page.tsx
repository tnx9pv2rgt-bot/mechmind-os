'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PortalLayout, usePortalCustomer } from '@/components/portal';
import { BookingType, CustomerVehicle } from '@/lib/types/portal';

const bookingSchema = z.object({
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  type: z.string().min(1, 'Seleziona un tipo di servizio'),
  date: z.string().min(1, 'Seleziona una data'),
  time: z.string().min(1, 'Seleziona un orario'),
  notes: z.string().optional(),
});

type BookingFormErrors = Partial<Record<keyof z.infer<typeof bookingSchema>, string>>;

const serviceTypes: { type: BookingType; label: string; description: string; duration: number }[] =
  [
    {
      type: 'maintenance',
      label: 'Tagliando',
      description: 'Manutenzione ordinaria programmata',
      duration: 120,
    },
    {
      type: 'repair',
      label: 'Riparazione',
      description: 'Riparazione guasto o danno',
      duration: 180,
    },
    {
      type: 'inspection',
      label: 'Ispezione',
      description: 'Controllo completo del veicolo',
      duration: 90,
    },
    {
      type: 'warranty',
      label: 'Lavoro in Garanzia',
      description: 'Intervento coperto da garanzia',
      duration: 120,
    },
    {
      type: 'consultation',
      label: 'Consulenza',
      description: 'Valutazione e preventivo',
      duration: 30,
    },
    {
      type: 'emergency',
      label: 'Emergenza',
      description: 'Problema urgente da risolvere',
      duration: 60,
    },
  ];

const timeSlots = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: '' as BookingType | '',
    date: '',
    time: '',
    notes: '',
  });

  const { customer } = usePortalCustomer();

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles');
        if (response.ok) {
          const result = await response.json();
          setVehicles(result.data || []);
        }
      } catch (_err) {
        // Vehicle loading failed silently - empty list shown
      }
    };

    loadVehicles();
  }, []);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmitError(null);
    setErrors({});

    const result = bookingSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: BookingFormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof BookingFormErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/portal/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          type: formData.type,
          scheduledDate: formData.date,
          scheduledTime: formData.time,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Errore nella creazione della prenotazione');
      }

      setStep(5); // Success step
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Errore nella creazione della prenotazione'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedService = serviceTypes.find(s => s.type === formData.type);
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

  const isStepValid = () => {
    switch (step) {
      case 1:
        return !!formData.vehicleId;
      case 2:
        return !!formData.type;
      case 3:
        return !!formData.date && !!formData.time;
      case 4:
        return true; // Notes are optional
      default:
        return false;
    }
  };

  return (
    <PortalLayout customer={customer || undefined}>
      <div className='p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6'
        >
          <Link
            href='/portal/bookings'
            className='inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors mb-4'
          >
            <ArrowLeft className='h-4 w-4' />
            Torna alle prenotazioni
          </Link>
          <h1 className='text-2xl sm:text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
            Nuova Prenotazione
          </h1>
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
            Prenota un appuntamento in officina
          </p>
        </motion.div>

        {/* Progress */}
        <div className='flex items-center justify-center gap-2 mb-8'>
          {[1, 2, 3, 4].map(s => (
            <div key={s} className='flex items-center'>
              <div
                className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${
                  step >= s
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)]'
                    : 'bg-[var(--border-default)] dark:bg-[var(--border-default)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'
                }
              `}
              >
                {step > s ? <CheckCircle className='h-5 w-5' /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${step > s ? 'bg-[var(--brand)]' : 'bg-[var(--border-default)] dark:bg-[var(--border-default)]'}`}
                />
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
              <AppleCardContent className='p-6'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                  <Car className='h-5 w-5 text-[var(--brand)]' />
                  Seleziona il veicolo
                </h2>

                <div className='space-y-3'>
                  {vehicles.map(vehicle => (
                    <button
                      key={vehicle.id}
                      onClick={() => setFormData({ ...formData, vehicleId: vehicle.id })}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all
                        ${
                          formData.vehicleId === vehicle.id
                            ? 'border-[var(--brand)] bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]'
                            : 'border-[var(--border-default)] dark:border-[var(--border-default)] hover:border-[var(--brand)]/50'
                        }
                      `}
                    >
                      <div className='flex items-center gap-4'>
                        <div className='w-12 h-12 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] flex items-center justify-center'>
                          <Car className='h-6 w-6 text-[var(--text-tertiary)]' />
                        </div>
                        <div className='flex-1'>
                          <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            {vehicle.licensePlate} • {vehicle.year}
                          </p>
                        </div>
                        {formData.vehicleId === vehicle.id && (
                          <CheckCircle className='h-5 w-5 text-[var(--brand)]' />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className='mt-4 p-4 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl text-center'>
                  <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Vuoi aggiungere un nuovo veicolo?{' '}
                    <Link href='/portal/settings' className='text-[var(--brand)] hover:underline'>
                      Vai alle impostazioni
                    </Link>
                  </p>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {step === 2 && (
            <AppleCard>
              <AppleCardContent className='p-6'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                  <FileText className='h-5 w-5 text-[var(--brand)]' />
                  Tipo di servizio
                </h2>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {serviceTypes.map(service => (
                    <button
                      key={service.type}
                      onClick={() => setFormData({ ...formData, type: service.type })}
                      className={`
                        p-4 rounded-xl border-2 text-left transition-all
                        ${
                          formData.type === service.type
                            ? 'border-[var(--brand)] bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]'
                            : 'border-[var(--border-default)] dark:border-[var(--border-default)] hover:border-[var(--brand)]/50'
                        }
                      `}
                    >
                      <div className='flex items-start justify-between'>
                        <div>
                          <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {service.label}
                          </p>
                          <p className='text-sm text-[var(--text-tertiary)] mt-1'>{service.description}</p>
                          <p className='text-xs text-[var(--brand)] mt-2'>
                            Durata: ~{service.duration} min
                          </p>
                        </div>
                        {formData.type === service.type && (
                          <CheckCircle className='h-5 w-5 text-[var(--brand)] flex-shrink-0' />
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
              <AppleCardContent className='p-6'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                  <Calendar className='h-5 w-5 text-[var(--brand)]' />
                  Data e ora
                </h2>

                <div className='space-y-6'>
                  {/* Date Picker */}
                  <div>
                    <Label className='text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2 block'>Data</Label>
                    <Input
                      type='date'
                      value={formData.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className='h-12 rounded-xl'
                    />
                  </div>

                  {/* Time Slots */}
                  {formData.date && (
                    <div>
                      <Label className='text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 block'>
                        Orario
                      </Label>
                      <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
                        {timeSlots.map(time => (
                          <button
                            key={time}
                            onClick={() => setFormData({ ...formData, time })}
                            className={`
                              p-2 rounded-lg text-sm font-medium transition-all
                              ${
                                formData.time === time
                                  ? 'bg-[var(--brand)] text-[var(--text-on-brand)]'
                                  : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-primary)] dark:text-[var(--text-primary)] hover:bg-[var(--border-default)] dark:hover:bg-[var(--surface-active)]'
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
              <AppleCardContent className='p-6'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                  <FileText className='h-5 w-5 text-[var(--brand)]' />
                  Note aggiuntive
                </h2>

                <div className='space-y-6'>
                  <div>
                    <Label className='text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2 block'>
                      Descrivi il problema o le esigenze (opzionale)
                    </Label>
                    <Textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder='Es. Rumore strano al motore, bisogno di sostituire le gomme...'
                      rows={4}
                      className='rounded-xl resize-none'
                    />
                  </div>

                  {/* Summary */}
                  <div className='p-4 bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] rounded-xl space-y-2'>
                    <h3 className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Riepilogo</h3>
                    <div className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] space-y-1'>
                      <p>
                        <span className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Veicolo:</span>{' '}
                        {selectedVehicle?.make} {selectedVehicle?.model}
                      </p>
                      <p>
                        <span className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Servizio:</span>{' '}
                        {selectedService?.label}
                      </p>
                      <p>
                        <span className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Data:</span>{' '}
                        {formData.date ? new Date(formData.date).toLocaleDateString('it-IT') : '-'}
                      </p>
                      <p>
                        <span className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ora:</span>{' '}
                        {formData.time || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}

          {step === 5 && (
            <AppleCard>
              <AppleCardContent className='p-8 text-center'>
                <div className='w-20 h-20 rounded-full bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] flex items-center justify-center mx-auto mb-6'>
                  <CheckCircle className='h-10 w-10 text-[var(--status-success)]' />
                </div>
                <h2 className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
                  Prenotazione Confermata!
                </h2>
                <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-6'>
                  Ti abbiamo inviato un&apos;email di conferma con tutti i dettagli.
                </p>
                <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                  <Link href='/portal/bookings'>
                    <AppleButton variant='secondary'>Vedi le mie prenotazioni</AppleButton>
                  </Link>
                  <Link href='/portal/dashboard'>
                    <AppleButton>Torna alla dashboard</AppleButton>
                  </Link>
                </div>
              </AppleCardContent>
            </AppleCard>
          )}
        </motion.div>

        {/* Validation / Submit Errors */}
        {(Object.keys(errors).length > 0 || submitError) && (
          <div className='mt-4 p-4 bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/50 rounded-xl space-y-1'>
            {Object.values(errors).map((msg, i) => (
              <p key={i} className='text-sm text-[var(--status-error)]'>
                {msg}
              </p>
            ))}
            {submitError && <p className='text-sm text-[var(--status-error)]'>{submitError}</p>}
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 5 && (
          <div className='flex items-center justify-between mt-6'>
            <AppleButton
              variant='secondary'
              onClick={handleBack}
              disabled={step === 1}
              icon={<ChevronLeft className='h-4 w-4' />}
            >
              Indietro
            </AppleButton>

            {step < 4 ? (
              <AppleButton
                onClick={handleNext}
                disabled={!isStepValid()}
                icon={<ChevronRight className='h-4 w-4' />}
                iconPosition='right'
              >
                Continua
              </AppleButton>
            ) : (
              <AppleButton onClick={handleSubmit} loading={isLoading}>
                Conferma Prenotazione
              </AppleButton>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
