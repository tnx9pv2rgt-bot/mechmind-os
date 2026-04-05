'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Mail,
  Building2,
  Loader2,
  Info,
  Calendar,
  Heart,
  Tag,
  Globe,
  MessageSquare,
  Bell,
  Megaphone,
  MapPin,
  Briefcase,
  UserCircle,
  Languages,
  Cake,
  Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const schema = z.object({
  // Dati base
  customerType: z.enum(['private', 'business']).default('private'),
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),

  // Dati anagrafici estesi
  title: z
    .enum(['Sig.', 'Sig.ra', 'Dott.', 'Dott.ssa', 'Ing.', 'Arch.', 'Avv.', ''])
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['M', 'F', 'Altro', '']).optional().or(z.literal('')),
  maritalStatus: z
    .enum(['Celibe/Nubile', 'Coniugato/a', 'Divorziato/a', 'Vedovo/a', 'Unione civile', ''])
    .optional()
    .or(z.literal('')),

  // Preferenze contatto
  preferredChannel: z
    .enum(['email', 'sms', 'whatsapp', 'telefono', ''])
    .optional()
    .or(z.literal('')),
  language: z
    .enum(['italiano', 'inglese', 'francese', 'tedesco', 'spagnolo', 'altro'])
    .default('italiano'),

  // Categorizzazione
  source: z
    .enum([
      'Passaparola',
      'Google',
      'Facebook',
      'Instagram',
      'Sito web',
      'Volantino',
      'Cliente esistente',
      'Altro',
      '',
    ])
    .optional()
    .or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),

  // Privacy
  doNotCall: z.boolean().default(false),
  doNotEmail: z.boolean().default(false),
  marketingConsent: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

const titleOptions = [
  { value: 'Sig.', label: 'Sig.' },
  { value: 'Sig.ra', label: 'Sig.ra' },
  { value: 'Dott.', label: 'Dott.' },
  { value: 'Dott.ssa', label: 'Dott.ssa' },
  { value: 'Ing.', label: 'Ing.' },
  { value: 'Arch.', label: 'Arch.' },
  { value: 'Avv.', label: 'Avv.' },
];

const genderOptions = [
  { value: 'M', label: 'Maschio' },
  { value: 'F', label: 'Femmina' },
  { value: 'Altro', label: 'Altro' },
];

const maritalStatusOptions = [
  { value: 'Celibe/Nubile', label: 'Celibe/Nubile' },
  { value: 'Coniugato/a', label: 'Coniugato/a' },
  { value: 'Divorziato/a', label: 'Divorziato/a' },
  { value: 'Vedovo/a', label: 'Vedovo/a' },
  { value: 'Unione civile', label: 'Unione civile' },
];

const channelOptions = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'telefono', label: 'Telefono', icon: Phone },
];

const languageOptions = [
  { value: 'italiano', label: 'Italiano' },
  { value: 'inglese', label: 'Inglese' },
  { value: 'francese', label: 'Francese' },
  { value: 'tedesco', label: 'Tedesco' },
  { value: 'spagnolo', label: 'Spagnolo' },
  { value: 'altro', label: 'Altro' },
];

const sourceOptions = [
  { value: 'Passaparola', label: 'Passaparola' },
  { value: 'Google', label: 'Google' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Sito web', label: 'Sito web' },
  { value: 'Volantino', label: 'Volantino' },
  { value: 'Cliente esistente', label: 'Cliente esistente' },
  { value: 'Altro', label: 'Altro' },
];

export default function Step1Page() {
  const router = useRouter();
  const { formData: savedData, saveStep, isLoaded } = useFormSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerType: 'private',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      companyName: '',
      title: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      preferredChannel: '',
      language: 'italiano',
      source: '',
      tags: '',
      notes: '',
      doNotCall: false,
      doNotEmail: false,
      marketingConsent: true,
    },
  });

  // Ripristina i dati salvati quando si torna indietro
  useEffect(() => {
    if (isLoaded && savedData) {
      reset({
        customerType: savedData.customerType || 'private',
        firstName: savedData.firstName || '',
        lastName: savedData.lastName || '',
        phone: savedData.phone || '',
        email: savedData.email || '',
        companyName: savedData.companyName || '',
        title: savedData.title || '',
        dateOfBirth: savedData.dateOfBirth || '',
        gender: savedData.gender || '',
        maritalStatus: savedData.maritalStatus || '',
        preferredChannel: savedData.preferredChannel || '',
        language: savedData.language || 'italiano',
        source: savedData.source || '',
        tags: savedData.tags || '',
        notes: savedData.notes || '',
        doNotCall: savedData.doNotCall || false,
        doNotEmail: savedData.doNotEmail || false,
        marketingConsent:
          savedData.marketingConsent !== undefined ? savedData.marketingConsent : true,
      });
    }
  }, [isLoaded, savedData, reset]);

  const customerType = watch('customerType');
  const marketingConsent = watch('marketingConsent');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    saveStep(1, data);
    toast.success('Dati cliente salvati');
    await new Promise(r => setTimeout(r, 300));
    router.push('/dashboard/customers/new/step2');
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
      step={1}
      title='Dati Cliente'
      subtitle='Inserisci i dati anagrafici completi del cliente'
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
            <User className='w-6 h-6 text-apple-blue' />
          </div>
          <div>
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
              Informazioni Cliente
            </h2>
            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
              Dati principali e anagrafici
            </p>
          </div>
        </div>

        {/* Tipo Cliente Card */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <Label
            htmlFor='customerType'
            className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-3 block'
          >
            Tipo Cliente
          </Label>
          <Select
            defaultValue='private'
            onValueChange={v => setValue('customerType', v as 'private' | 'business')}
          >
            <SelectTrigger
              id='customerType'
              className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='private'>
                <div className='flex items-center gap-2'>
                  <User className='w-4 h-4' />
                  Privato
                </div>
              </SelectItem>
              <SelectItem value='business'>
                <div className='flex items-center gap-2'>
                  <Building2 className='w-4 h-4' />
                  Azienda
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ragione Sociale (se azienda) */}
        {customerType === 'business' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'
          >
            <Label
              htmlFor='companyName'
              className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
            >
              Ragione Sociale
            </Label>
            <div className='relative'>
              <Building2 className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray dark:text-[var(--text-secondary)]' />
              <Input
                id='companyName'
                {...register('companyName')}
                autoComplete='organization'
                className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                placeholder='Rossi Srl'
              />
            </div>
          </motion.div>
        )}

        {/* === SEZIONE: Dati Anagrafici Base === */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
              <UserCircle className='w-4 h-4 text-apple-blue' />
            </div>
            <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Dati Anagrafici</h3>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Titolo */}
            <div>
              <Label
                htmlFor='title'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Titolo
              </Label>
              <Select
                onValueChange={v => setValue('title', (v === 'none' ? '' : v) as FormData['title'])}
                defaultValue='none'
              >
                <SelectTrigger
                  id='title'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                >
                  <SelectValue placeholder='Seleziona...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Nessuno</SelectItem>
                  {titleOptions.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data di nascita */}
            <div>
              <Label
                htmlFor='dateOfBirth'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Data di Nascita
              </Label>
              <div className='relative'>
                <Cake className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                <Input
                  id='dateOfBirth'
                  type='date'
                  {...register('dateOfBirth')}
                  autoComplete='bday'
                  className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                />
              </div>
            </div>

            {/* Nome */}
            <div>
              <Label
                htmlFor='firstName'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Nome
              </Label>
              <div className='relative'>
                <User className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                <Input
                  id='firstName'
                  {...register('firstName')}
                  autoComplete='given-name'
                  className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                  placeholder='Mario'
                />
              </div>
            </div>

            {/* Cognome */}
            <div>
              <Label
                htmlFor='lastName'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Cognome
              </Label>
              <Input
                id='lastName'
                {...register('lastName')}
                autoComplete='family-name'
                className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                placeholder='Rossi'
              />
            </div>

            {/* Sesso */}
            <div>
              <Label
                htmlFor='gender'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Sesso
              </Label>
              <Select
                onValueChange={v =>
                  setValue('gender', (v === 'not_specified' ? '' : v) as FormData['gender'])
                }
                defaultValue='not_specified'
              >
                <SelectTrigger
                  id='gender'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                >
                  <SelectValue placeholder='Seleziona...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='not_specified'>Non specificato</SelectItem>
                  {genderOptions.map(g => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stato civile */}
            <div>
              <Label
                htmlFor='maritalStatus'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Stato Civile
              </Label>
              <Select
                onValueChange={v =>
                  setValue(
                    'maritalStatus',
                    (v === 'not_specified' ? '' : v) as FormData['maritalStatus']
                  )
                }
                defaultValue='not_specified'
              >
                <SelectTrigger
                  id='maritalStatus'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                >
                  <SelectValue placeholder='Seleziona...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='not_specified'>Non specificato</SelectItem>
                  {maritalStatusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Contatti === */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
              <Phone className='w-4 h-4 text-apple-blue' />
            </div>
            <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Contatti</h3>
          </div>

          <div className='space-y-4'>
            {/* Telefono */}
            <div>
              <Label
                htmlFor='phone'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Telefono
              </Label>
              <div className='relative'>
                <Phone className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                <Input
                  id='phone'
                  {...register('phone')}
                  autoComplete='tel'
                  className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                  placeholder='+39 333 1234567'
                  type='tel'
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>
                  <Label
                    htmlFor='email'
                    className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'
                  >
                    Email
                  </Label>
                  <span className='px-2 py-0.5 bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue text-xs font-medium rounded-full'>
                    Consigliato
                  </span>
                </div>
                <div className='relative'>
                  <button
                    type='button'
                    onClick={() => setShowEmailTooltip(!showEmailTooltip)}
                    className='w-6 h-6 rounded-full bg-apple-light-gray dark:bg-[var(--surface-hover)] hover:bg-apple-light-gray/80 dark:hover:bg-[var(--surface-active)] text-apple-gray dark:text-[var(--text-secondary)] flex items-center justify-center transition-colors'
                    aria-label='Informazioni sulla raccolta email'
                  >
                    <Info className='w-4 h-4' />
                  </button>

                  {showEmailTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className='absolute bottom-full right-0 mb-2 z-50 w-72 bg-white dark:bg-[var(--surface-elevated)] border border-apple-border/20 dark:border-[var(--border-default)] text-apple-dark dark:text-[var(--text-primary)] p-4 rounded-2xl shadow-apple'
                    >
                      <div className='flex items-start gap-2'>
                        <Info className='w-5 h-5 flex-shrink-0 mt-0.5' />
                        <div>
                          <p className='text-body font-medium mb-1'>Perché è consigliato?</p>
                          <p className='text-sm text-apple-gray dark:text-[var(--text-secondary)] leading-relaxed'>
                            Inserendo l&apos;email potrai inviare preventivi, notifiche di scadenza
                            tagliando, conferme appuntamenti e fatture digitali direttamente al
                            cliente.
                          </p>
                        </div>
                      </div>
                      <button
                        type='button'
                        onClick={() => setShowEmailTooltip(false)}
                        className='absolute top-2 right-2 text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)] text-xl leading-none'
                      >
                        ×
                      </button>
                      <div className='absolute -bottom-1.5 right-2 w-3 h-3 bg-white dark:bg-[var(--surface-elevated)] rotate-45'></div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className='relative'>
                <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                <Input
                  id='email'
                  type='email'
                  {...register('email')}
                  autoComplete='email'
                  className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                  placeholder='mario.rossi@email.it'
                />
              </div>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Preferenze === */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
              <Heart className='w-4 h-4 text-apple-blue' />
            </div>
            <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Preferenze</h3>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Canale preferito */}
            <div>
              <Label
                htmlFor='preferredChannel'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Canale Preferito
              </Label>
              <Select
                onValueChange={v =>
                  setValue(
                    'preferredChannel',
                    (v === 'none' ? '' : v) as FormData['preferredChannel']
                  )
                }
                defaultValue='none'
              >
                <SelectTrigger
                  id='preferredChannel'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                >
                  <SelectValue placeholder='Seleziona...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Nessuna preferenza</SelectItem>
                  {channelOptions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className='flex items-center gap-2'>
                        <c.icon className='w-4 h-4' />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lingua */}
            <div>
              <Label
                htmlFor='language'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Lingua
              </Label>
              <Select
                onValueChange={v => setValue('language', v as FormData['language'])}
                defaultValue='italiano'
              >
                <SelectTrigger
                  id='language'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(l => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fonte */}
            <div className='col-span-2'>
              <Label
                htmlFor='source'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Come ci hai conosciuto?
              </Label>
              <Select
                onValueChange={v =>
                  setValue('source', (v === 'not_specified' ? '' : v) as FormData['source'])
                }
                defaultValue='not_specified'
              >
                <SelectTrigger
                  id='source'
                  className='h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)]'
                >
                  <SelectValue placeholder='Seleziona...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='not_specified'>Non specificato</SelectItem>
                  {sourceOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag */}
            <div className='col-span-2'>
              <Label
                htmlFor='tags'
                className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2 block'
              >
                Tag / Categorie
              </Label>
              <div className='relative'>
                <Tag className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                <Input
                  id='tags'
                  {...register('tags')}
                  autoComplete='off'
                  className='pl-12 h-[52px] rounded-full border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none'
                  placeholder='VIP, Sconto 10%, Cliente storico, ecc.'
                />
              </div>
              <p className='text-xs text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                Separare i tag con virgola
              </p>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Privacy & Marketing === */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
              <Bell className='w-4 h-4 text-apple-blue' />
            </div>
            <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Privacy & Marketing</h3>
          </div>

          <div className='space-y-4'>
            {/* Marketing consent */}
            <div className='flex items-start space-x-3 p-4 bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] rounded-2xl border border-apple-border/20 dark:border-[var(--border-default)]'>
              <Checkbox
                id='marketingConsent'
                checked={marketingConsent}
                onCheckedChange={checked => setValue('marketingConsent', checked as boolean)}
                className='mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600'
              />
              <div className='flex-1'>
                <Label
                  htmlFor='marketingConsent'
                  className='font-medium text-apple-dark dark:text-[var(--text-primary)] cursor-pointer'
                >
                  Consenso marketing
                </Label>
                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                  Acconsento a ricevere comunicazioni commerciali, offerte e promozioni
                </p>
              </div>
            </div>

            {/* Do not call */}
            <div className='flex items-start space-x-3 p-4 bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] rounded-2xl border border-apple-border/20 dark:border-[var(--border-default)]'>
              <Checkbox
                id='doNotCall'
                {...register('doNotCall')}
                className='mt-1 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600'
              />
              <div className='flex-1'>
                <Label
                  htmlFor='doNotCall'
                  className='font-medium text-apple-dark dark:text-[var(--text-primary)] cursor-pointer'
                >
                  <span className='flex items-center gap-2'>
                    <Phone className='w-4 h-4 text-red-500' />
                    Non chiamare
                  </span>
                </Label>
                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                  Il cliente non desidera essere contattato telefonicamente
                </p>
              </div>
            </div>

            {/* Do not email */}
            <div className='flex items-start space-x-3 p-4 bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] rounded-2xl border border-apple-border/20 dark:border-[var(--border-default)]'>
              <Checkbox
                id='doNotEmail'
                {...register('doNotEmail')}
                className='mt-1 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600'
              />
              <div className='flex-1'>
                <Label
                  htmlFor='doNotEmail'
                  className='font-medium text-apple-dark dark:text-[var(--text-primary)] cursor-pointer'
                >
                  <span className='flex items-center gap-2'>
                    <Mail className='w-4 h-4 text-orange-500' />
                    Non inviare email
                  </span>
                </Label>
                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                  Il cliente non desidera ricevere comunicazioni via email
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Note === */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 border border-apple-border/20 dark:border-[var(--border-default)] shadow-[var(--shadow-card)]'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='w-8 h-8 rounded-xl bg-apple-blue/10 dark:bg-[var(--surface-hover)] flex items-center justify-center'>
              <Info className='w-4 h-4 text-apple-blue' />
            </div>
            <h3 className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>Note</h3>
          </div>

          <div>
            <Label htmlFor='notes' className='sr-only'>
              Note
            </Label>
            <textarea
              id='notes'
              {...register('notes')}
              autoComplete='off'
              className='w-full h-32 px-5 py-3 rounded-2xl border border-apple-border/20 dark:border-[var(--border-default)] bg-apple-light-gray/30 dark:bg-[var(--surface-primary)] text-apple-dark dark:text-[var(--text-primary)] placeholder-apple-gray dark:placeholder-[var(--text-tertiary)] outline-none resize-none'
              placeholder='Inserisci qui eventuali note sul cliente: preferenze, richieste speciali, storico interazioni...'
            />
          </div>
        </div>
      </motion.div>
    </FormLayout>
  );
}
