'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Send,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Car,
  CreditCard,
  Building2,
  Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCreateCustomer, useCreateVehicle } from '@/hooks/useApi';

const step4Schema = z.object({
  phone: z.string().min(1, 'Il numero di telefono è obbligatorio'),
  gdprAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Devi accettare il trattamento dei dati per procedere' }),
  }),
});

export default function Step4Page() {
  const router = useRouter();
  const { formData, clearForm, isLoaded } = useFormSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [gdprError, setGdprError] = useState(false);
  const createCustomer = useCreateCustomer();
  const createVehicle = useCreateVehicle();

  // Redirect only if truly empty (no data at all)
  useEffect(() => {
    if (isLoaded && Object.keys(formData).length === 0) {
      router.push('/dashboard/customers/new/step1');
    }
  }, [isLoaded, formData, router]);

  const handleSubmit = async () => {
    const result = step4Schema.safeParse({ phone: formData.phone || '', gdprAccepted });
    if (!result.success) {
      const firstError = result.error.errors[0];
      if (firstError.path[0] === 'gdprAccepted') {
        setGdprError(true);
      } else {
        toast.error(firstError.message);
      }
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Build notes with extra fields not in CreateCustomerDto
      const extraFields: Record<string, unknown> = {};
      if (formData.address) extraFields.address = formData.address;
      if (formData.city) extraFields.city = formData.city;
      if (formData.province) extraFields.province = formData.province;
      if (formData.zipCode) extraFields.zipCode = formData.zipCode;
      if (formData.fiscalCode) extraFields.fiscalCode = formData.fiscalCode;
      if (formData.vatNumber) extraFields.vatNumber = formData.vatNumber;
      if (formData.sdiCode) extraFields.sdiCode = formData.sdiCode;
      if (formData.companyName) extraFields.companyName = formData.companyName;
      if (formData.customerType) extraFields.customerType = formData.customerType;

      const noteParts: string[] = [];
      if (formData.notes) noteParts.push(formData.notes);
      if (Object.keys(extraFields).length > 0) {
        noteParts.push(`[EXTRA_DATA]${JSON.stringify(extraFields)}`);
      }

      const now = new Date().toISOString();
      const customer = await createCustomer.mutateAsync({
        phone: formData.phone,
        email: formData.email || undefined,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        gdprConsent: gdprAccepted,
        gdprConsentAt: now,
        gdprPrivacyVersion: '2.0',
        gdprConsentMethod: 'form-checkbox',
        marketingConsent: formData.marketingConsent || false,
        marketingConsentAt: formData.marketingConsent ? now : undefined,
        notes: noteParts.length > 0 ? noteParts.join('\n') : undefined,
      });

      // Create vehicles linked to the new customer
      const vehicles = formData.vehicles || [];
      for (const v of vehicles) {
        await createVehicle.mutateAsync({
          customerId: customer.id,
          licensePlate: v.plate || 'UNKNOWN',
          make: v.make || 'N/D',
          model: v.model || 'N/D',
          year: v.year || undefined,
          mileage: v.km || undefined,
        });
      }

      setIsSuccess(true);
      toast.success('Cliente creato con successo!');
      clearForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio';
      toast.error(message);
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/customers/new/step3');
  };

  if (!isLoaded) {
    return (
      <div className='fixed inset-0 bg-[#1a1a1a] flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-white' />
      </div>
    );
  }

  // Success View - same style as bookings/new
  if (isSuccess) {
    return (
      <div className='fixed inset-0 bg-[#1a1a1a] flex items-center justify-center p-4 overflow-hidden'>
        <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
          <motion.div
            className='relative w-full h-full bg-[#2f2f2f] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e] flex flex-col items-center justify-center p-10 text-center'
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className='w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8'
            >
              <Check className='w-16 h-16 text-white' />
            </motion.div>

            <h2 className='text-3xl font-bold text-white mb-4'>
              Cliente Creato!
            </h2>
            <p className='text-[#888] mb-8 max-w-md'>
              {formData.firstName} {formData.lastName} è stato registrato con successo con{' '}
              {formData.vehicles?.length || 1} veicolo/i.
            </p>

            <div className='bg-[#383838] rounded-2xl p-6 mb-8 border border-[#4e4e4e]'>
              <p className='text-sm text-[#888] mb-2'>Codice Cliente</p>
              <p className='text-3xl font-mono font-bold text-white'>
                CLI-{Date.now().toString(36).toUpperCase().slice(-8)}
              </p>
            </div>

            <div className='flex gap-4'>
              <Button
                onClick={() => router.push('/dashboard/customers')}
                className='rounded-full h-[52px] px-8 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]'
              >
                Vai ai Clienti
              </Button>
              <Button
                variant='outline'
                onClick={() => (window.location.href = '/dashboard/customers/new/step1')}
                className='rounded-full h-[52px] px-8 border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5'
              >
                Crea Nuovo Cliente
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const isBusiness = formData.customerType === 'business';

  return (
    <FormLayout
      step={4}
      title='Riepilogo'
      subtitle='Verifica tutti i dati prima di salvare'
      onBack={handleBack}
      onNext={handleSubmit}
      isSubmitting={isSubmitting}
      isLastStep={true}
      nextLabel='Salva Cliente'
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='space-y-6'
      >
        {/* Section Header with Icon */}
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-12 h-12 rounded-2xl bg-[#4e4e4e] flex items-center justify-center'>
            <Shield className='w-6 h-6 text-white' />
          </div>
          <div>
            <h2 className='text-xl font-semibold text-white'>
              Riepilogo Dati
            </h2>
            <p className='text-[#888] text-sm'>
              Verifica tutte le informazioni inserite
            </p>
          </div>
        </div>

        {/* Anagrafica */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-[#383838] rounded-2xl p-6 border border-[#4e4e4e]'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-[#4e4e4e] flex items-center justify-center'>
              <User className='w-5 h-5 text-white' />
            </div>
            <h3 className='font-semibold text-white text-lg'>Anagrafica</h3>
          </div>
          <div className='space-y-3 text-sm'>
            <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
              <span className='text-[#888]'>Tipo:</span>
              <span className='font-medium text-white px-3 py-1 bg-[#2f2f2f] rounded-full'>
                {isBusiness ? 'Azienda' : 'Privato'}
              </span>
            </div>
            {isBusiness && formData.companyName && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Ragione Sociale:</span>
                <span className='font-medium text-white'>{formData.companyName}</span>
              </div>
            )}
            {formData.title && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Titolo:</span>
                <span className='font-medium text-white'>{formData.title}</span>
              </div>
            )}
            <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
              <span className='text-[#888]'>Nome:</span>
              <span className='font-medium text-white'>
                {formData.firstName} {formData.lastName}
              </span>
            </div>
            {formData.dateOfBirth && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Data di nascita:</span>
                <span className='font-medium text-white'>{formData.dateOfBirth}</span>
              </div>
            )}
            {formData.gender && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Sesso:</span>
                <span className='font-medium text-white'>{formData.gender}</span>
              </div>
            )}
            {formData.maritalStatus && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Stato civile:</span>
                <span className='font-medium text-white'>{formData.maritalStatus}</span>
              </div>
            )}
            <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
              <span className='text-[#888]'>Telefono:</span>
              <span className='font-medium text-white'>{formData.phone}</span>
            </div>
            <div className='flex justify-between items-center py-2'>
              <span className='text-[#888]'>Email:</span>
              <span className='font-medium text-white'>{formData.email}</span>
            </div>
          </div>
        </motion.div>

        {/* Indirizzo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='bg-[#383838] rounded-2xl p-6 border border-[#4e4e4e]'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-[#4e4e4e] flex items-center justify-center'>
              <MapPin className='w-5 h-5 text-white' />
            </div>
            <h3 className='font-semibold text-white text-lg'>Indirizzo</h3>
          </div>
          <div className='space-y-3 text-sm'>
            <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
              <span className='text-[#888]'>Indirizzo:</span>
              <span className='font-medium text-white'>{formData.address}</span>
            </div>
            <div className='flex justify-between items-center py-2'>
              <span className='text-[#888]'>Città:</span>
              <span className='font-medium text-white'>
                {formData.city} ({formData.province}) - {formData.zipCode}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Fiscali */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-[#383838] rounded-2xl p-6 border border-[#4e4e4e]'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-[#4e4e4e] flex items-center justify-center'>
              <CreditCard className='w-5 h-5 text-white' />
            </div>
            <h3 className='font-semibold text-white text-lg'>
              Dati Fiscali
            </h3>
          </div>
          <div className='space-y-3 text-sm'>
            <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
              <span className='text-[#888]'>Codice Fiscale:</span>
              <span className='font-medium font-mono text-white'>
                {formData.fiscalCode}
              </span>
            </div>
            {formData.vatNumber && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>P.IVA:</span>
                <span className='font-medium font-mono text-white'>
                  {formData.vatNumber}
                </span>
              </div>
            )}
            {formData.sdiCode && (
              <div className='flex justify-between items-center py-2'>
                <span className='text-[#888]'>SDI:</span>
                <span className='font-medium font-mono text-white'>
                  {formData.sdiCode}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Preferenze e Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className='bg-[#383838] rounded-2xl p-6 border border-[#4e4e4e]'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-[#4e4e4e] flex items-center justify-center'>
              <Shield className='w-5 h-5 text-white' />
            </div>
            <h3 className='font-semibold text-white text-lg'>
              Preferenze & Privacy
            </h3>
          </div>
          <div className='space-y-3 text-sm'>
            {formData.preferredChannel && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Canale preferito:</span>
                <span className='font-medium capitalize text-white'>
                  {formData.preferredChannel}
                </span>
              </div>
            )}
            {formData.language && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Lingua:</span>
                <span className='font-medium capitalize text-white'>
                  {formData.language}
                </span>
              </div>
            )}
            {formData.source && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Fonte:</span>
                <span className='font-medium text-white'>{formData.source}</span>
              </div>
            )}
            {formData.tags && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Tag:</span>
                <span className='font-medium text-white'>{formData.tags}</span>
              </div>
            )}
            <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
              <span className='text-[#888]'>Marketing:</span>
              <span
                className={`font-medium ${formData.marketingConsent ? 'text-green-400' : 'text-red-400'}`}
              >
                {formData.marketingConsent ? 'Consenso dato' : 'Non consenso'}
              </span>
            </div>
            {formData.doNotCall && (
              <div className='flex justify-between items-center py-2 border-b border-[#4e4e4e]'>
                <span className='text-[#888]'>Restrizioni:</span>
                <span className='font-medium text-red-400'>Non chiamare</span>
              </div>
            )}
            {formData.doNotEmail && (
              <div className='flex justify-between items-center py-2'>
                <span className='text-[#888]'>Restrizioni:</span>
                <span className='font-medium text-orange-400'>
                  Non inviare email
                </span>
              </div>
            )}
            {formData.notes && (
              <div className='mt-3 p-3 bg-[#2f2f2f] rounded-xl'>
                <span className='text-[#888] text-xs uppercase tracking-wide'>Note</span>
                <p className='text-white mt-1'>{formData.notes}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Consenso GDPR */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className='bg-[#383838] rounded-2xl p-6 border border-[#4e4e4e]'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-[#4e4e4e] flex items-center justify-center'>
              <Shield className='w-5 h-5 text-white' />
            </div>
            <h3 className='font-semibold text-white text-lg'>
              Consenso Trattamento Dati
            </h3>
          </div>
          <div className='flex items-start gap-3'>
            <Checkbox
              id='gdprConsent'
              checked={gdprAccepted}
              onCheckedChange={checked => {
                setGdprAccepted(checked === true);
                if (checked) setGdprError(false);
              }}
              aria-required='true'
              aria-invalid={gdprError}
              aria-describedby={gdprError ? 'gdpr-error' : undefined}
              className='mt-1'
            />
            <Label
              htmlFor='gdprConsent'
              className='text-sm leading-relaxed text-white cursor-pointer'
            >
              Ho letto e accetto il{' '}
              <a
                href='/privacy-policy'
                target='_blank'
                rel='noopener noreferrer'
                className='underline text-white hover:text-[#e5e5e5]'
              >
                trattamento dei dati personali
              </a>{' '}
              ai sensi del GDPR 2016/679 e del Regolamento UE sulla protezione dei dati.{' '}
              <span aria-hidden='true'>*</span>
            </Label>
          </div>
          <div className='min-h-[20px] ml-7'>
            {gdprError && (
              <p
                id='gdpr-error'
                role='alert'
                aria-live='assertive'
                className='text-red-500 text-sm mt-1'
              >
                Devi accettare il trattamento dei dati per procedere
              </p>
            )}
          </div>
        </motion.div>

        {/* Veicoli */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='bg-[#383838] rounded-2xl p-6 border border-[#4e4e4e]'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-[#4e4e4e] flex items-center justify-center'>
              <Car className='w-5 h-5 text-white' />
            </div>
            <h3 className='font-semibold text-white text-lg'>
              Veicoli ({formData.vehicles?.length || 0})
            </h3>
          </div>
          <div className='space-y-3'>
            {formData.vehicles?.map(
              (
                v: {
                  make?: string;
                  model?: string;
                  plate?: string;
                  year?: number;
                  km?: number;
                  fuel?: string;
                },
                i: number
              ) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className='bg-[#2f2f2f] rounded-2xl p-4'
                >
                  <div className='flex justify-between items-center mb-2'>
                    <span className='font-semibold text-white'>
                      {v.make} {v.model}
                    </span>
                    <span className='font-bold text-white bg-[#4e4e4e] px-3 py-1 rounded-full text-sm'>
                      {v.plate}
                    </span>
                  </div>
                  <div className='text-[#888] text-sm flex items-center gap-4'>
                    <span>{v.year}</span>
                    <span>•</span>
                    <span>{v.km?.toLocaleString?.() || '0'} km</span>
                    <span>•</span>
                    <span className='capitalize'>{v.fuel}</span>
                  </div>
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </motion.div>
    </FormLayout>
  );
}
