'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, Building2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  fiscalCode: z.string().optional().or(z.literal('')),
  vatNumber: z.string().optional().or(z.literal('')),
  sdiCode: z.string().optional().or(z.literal('')),
  pec: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function Step2Page() {
  const router = useRouter();
  const { formData: prevData, saveStep, isLoaded } = useFormSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusiness = prevData.customerType === 'business';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      address: '',
      city: '',
      zipCode: '',
      province: '',
      fiscalCode: '',
      vatNumber: '',
      sdiCode: '',
      pec: '',
    },
  });

  // Ripristina i dati salvati quando si torna indietro
  useEffect(() => {
    if (isLoaded && prevData) {
      reset({
        address: prevData.address || '',
        city: prevData.city || '',
        zipCode: prevData.zipCode || '',
        province: prevData.province || '',
        fiscalCode: prevData.fiscalCode || '',
        vatNumber: prevData.vatNumber || '',
        sdiCode: prevData.sdiCode || '',
        pec: prevData.pec || '',
      });
    }
  }, [isLoaded, prevData, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    saveStep(2, data);
    toast.success('Indirizzo e dati fiscali salvati');
    await new Promise(r => setTimeout(r, 300));
    router.push('/dashboard/customers/new/step3');
  };

  const handleBack = () => {
    router.push('/dashboard/customers/new/step1');
  };

  if (!isLoaded) {
    return (
      <div className='fixed inset-0 bg-apple-light-gray dark:bg-[var(--surface-tertiary)] flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  return (
    <FormLayout
      step={2}
      title='Indirizzo & Fiscali'
      subtitle='Dati di residenza e informazioni fiscali'
      onBack={handleBack}
      onNext={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='space-y-6'
      >
        {/* Section Header with Icon */}
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-12 h-12 rounded-2xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
            <MapPin className='w-6 h-6 text-apple-blue' />
          </div>
          <div>
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Indirizzo</h2>
            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
              Dati di residenza del cliente
            </p>
          </div>
        </div>

        {/* Indirizzo */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <Label
            htmlFor='address'
            className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
          >
            Indirizzo
          </Label>
          <div className='relative'>
            <MapPin className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
            <Input
              id='address'
              {...register('address')}
              autoComplete='street-address'
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'address-error' : undefined}
              className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
              placeholder='Via Roma 123'
            />
          </div>
          <div className='min-h-[20px]'>
            {errors.address && (
              <p
                id='address-error'
                role='alert'
                aria-live='assertive'
                className='text-red-400 text-sm mt-2'
              >
                {errors.address.message}
              </p>
            )}
          </div>
        </div>

        {/* Città, CAP, Provincia */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
            <Label
              htmlFor='province'
              className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
            >
              Provincia
            </Label>
            <Input
              id='province'
              {...register('province')}
              autoComplete='address-level1'
              aria-invalid={!!errors.province}
              aria-describedby={errors.province ? 'province-error' : undefined}
              className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
              placeholder='MI'
              maxLength={2}
            />
            <div className='min-h-[20px]'>
              {errors.province && (
                <p
                  id='province-error'
                  role='alert'
                  aria-live='assertive'
                  className='text-red-400 text-sm mt-2'
                >
                  {errors.province.message}
                </p>
              )}
            </div>
          </div>
          <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
            <Label
              htmlFor='zipCode'
              className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
            >
              CAP
            </Label>
            <Input
              id='zipCode'
              {...register('zipCode')}
              autoComplete='postal-code'
              aria-invalid={!!errors.zipCode}
              aria-describedby={errors.zipCode ? 'zipCode-error' : undefined}
              className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
              placeholder='20100'
              maxLength={5}
            />
            <div className='min-h-[20px]'>
              {errors.zipCode && (
                <p
                  id='zipCode-error'
                  role='alert'
                  aria-live='assertive'
                  className='text-red-400 text-sm mt-2'
                >
                  {errors.zipCode.message}
                </p>
              )}
            </div>
          </div>
          <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
            <Label
              htmlFor='city'
              className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
            >
              Città
            </Label>
            <Input
              id='city'
              {...register('city')}
              autoComplete='address-level2'
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'city-error' : undefined}
              className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
              placeholder='Milano'
            />
            <div className='min-h-[20px]'>
              {errors.city && (
                <p
                  id='city-error'
                  role='alert'
                  aria-live='assertive'
                  className='text-red-400 text-sm mt-2'
                >
                  {errors.city.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dati Fiscali Section */}
        <div className='flex items-center gap-3 mb-6 pt-4'>
          <div className='w-12 h-12 rounded-2xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
            <CreditCard className='w-6 h-6 text-apple-blue' />
          </div>
          <div>
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
              Dati Fiscali
            </h2>
            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
              Informazioni fiscali del cliente
            </p>
          </div>
        </div>

        {/* Codice Fiscale */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <Label
            htmlFor='fiscalCode'
            className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
          >
            Codice Fiscale
          </Label>
          <div className='relative'>
            <CreditCard className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
            <Input
              id='fiscalCode'
              {...register('fiscalCode')}
              autoComplete='off'
              aria-invalid={!!errors.fiscalCode}
              aria-describedby={errors.fiscalCode ? 'fiscalCode-error' : undefined}
              className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
              placeholder='RSSMRA80A01F205X'
              maxLength={16}
            />
          </div>
          <div className='min-h-[20px]'>
            {errors.fiscalCode && (
              <p
                id='fiscalCode-error'
                role='alert'
                aria-live='assertive'
                className='text-red-400 text-sm mt-2'
              >
                {errors.fiscalCode.message}
              </p>
            )}
          </div>
        </div>

        {/* P.IVA */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <Label
            htmlFor='vatNumber'
            className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
          >
            Partita IVA {isBusiness && <span className='text-red-500'>*</span>}
          </Label>
          <Input
            id='vatNumber'
            {...register('vatNumber', { required: isBusiness })}
            autoComplete='off'
            aria-required={isBusiness}
            aria-invalid={!!errors.vatNumber}
            aria-describedby={errors.vatNumber ? 'vatNumber-error' : undefined}
            className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
            placeholder='IT12345678901'
          />
          <div className='min-h-[20px]'>
            {errors.vatNumber && (
              <p
                id='vatNumber-error'
                role='alert'
                aria-live='assertive'
                className='text-red-400 text-sm mt-2'
              >
                Partita IVA richiesta per aziende
              </p>
            )}
          </div>
        </div>

        {/* SDI e PEC (solo se azienda) */}
        {isBusiness && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'
          >
            <div className='flex items-center gap-2 text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
              <Building2 className='w-4 h-4' />
              <span className='font-medium'>Dati fatturazione elettronica</span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <Label
                  htmlFor='sdiCode'
                  className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                >
                  Codice SDI
                </Label>
                <Input
                  id='sdiCode'
                  {...register('sdiCode')}
                  autoComplete='off'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none uppercase'
                  placeholder='XXXXXXX'
                  maxLength={7}
                />
              </div>
              <div>
                <Label
                  htmlFor='pec'
                  className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
                >
                  PEC
                </Label>
                <Input
                  id='pec'
                  type='email'
                  {...register('pec')}
                  autoComplete='email'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                  placeholder='pec@azienda.it'
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </FormLayout>
  );
}
