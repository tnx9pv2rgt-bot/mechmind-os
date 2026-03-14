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
  Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  title: z.enum(['Sig.', 'Sig.ra', 'Dott.', 'Dott.ssa', 'Ing.', 'Arch.', 'Avv.', '']).optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['M', 'F', 'Altro', '']).optional().or(z.literal('')),
  maritalStatus: z.enum(['Celibe/Nubile', 'Coniugato/a', 'Divorziato/a', 'Vedovo/a', 'Unione civile', '']).optional().or(z.literal('')),
  
  // Preferenze contatto
  preferredChannel: z.enum(['email', 'sms', 'whatsapp', 'telefono', '']).optional().or(z.literal('')),
  language: z.enum(['italiano', 'inglese', 'francese', 'tedesco', 'spagnolo', 'altro']).default('italiano'),
  
  // Categorizzazione
  source: z.enum(['Passaparola', 'Google', 'Facebook', 'Instagram', 'Sito web', 'Volantino', 'Cliente esistente', 'Altro', '']).optional().or(z.literal('')),
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
        marketingConsent: savedData.marketingConsent !== undefined ? savedData.marketingConsent : true,
      });
    }
  }, [isLoaded, savedData, reset]);

  const customerType = watch('customerType');
  const marketingConsent = watch('marketingConsent');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    saveStep(1, data);
    await new Promise(r => setTimeout(r, 300));
    router.push('/dashboard/customers/new/step2');
  };

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#212121] dark:to-[#212121] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <FormLayout 
      step={1} 
      title="Dati Cliente" 
      subtitle="Inserisci i dati anagrafici completi del cliente"
      onNext={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Section Header with Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ececec]">Informazioni Cliente</h2>

            <p className="text-gray-500 dark:text-[#636366] text-sm">Dati principali e anagrafici</p>
          </div>
        </div>

        {/* Tipo Cliente Card */}
        <div className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]">
          <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-3 block">Tipo Cliente</Label>
          <Select 
            defaultValue="private" 
            onValueChange={(v) => setValue('customerType', v as 'private' | 'business')}
          >
            <SelectTrigger className="h-14 rounded-xl bg-white/80 dark:bg-[#2f2f2f]/80 border-gray-200 dark:border-[#424242]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Privato
                </div>
              </SelectItem>
              <SelectItem value="business">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
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
            className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]"
          >
            <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Ragione Sociale</Label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                {...register('companyName')}
                className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                placeholder="Rossi Srl"
              />
            </div>
          </motion.div>
        )}

        {/* === SEZIONE: Dati Anagrafici Base === */}
        <div className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <UserCircle className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec]">Dati Anagrafici</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Titolo */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Titolo</Label>
              <Select onValueChange={(v) => setValue('title', (v === 'none' ? '' : v) as FormData['title'])} defaultValue="none">
                <SelectTrigger className="h-14 rounded-xl border-gray-200 dark:border-[#424242] bg-white/80 dark:bg-[#2f2f2f]/80">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {titleOptions.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data di nascita */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Data di Nascita</Label>
              <div className="relative">
                <Cake className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  {...register('dateOfBirth')}
                  className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Nome */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Nome</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  {...register('firstName')}
                  className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                  placeholder="Mario"
                />
              </div>
            </div>

            {/* Cognome */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Cognome</Label>
              <Input
                {...register('lastName')}
                className="h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                placeholder="Rossi"
              />
            </div>

            {/* Sesso */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Sesso</Label>
              <Select onValueChange={(v) => setValue('gender', (v === 'not_specified' ? '' : v) as FormData['gender'])} defaultValue="not_specified">
                <SelectTrigger className="h-14 rounded-xl border-gray-200 dark:border-[#424242] bg-white/80 dark:bg-[#2f2f2f]/80">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Non specificato</SelectItem>
                  {genderOptions.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stato civile */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Stato Civile</Label>
              <Select onValueChange={(v) => setValue('maritalStatus', (v === 'not_specified' ? '' : v) as FormData['maritalStatus'])} defaultValue="not_specified">
                <SelectTrigger className="h-14 rounded-xl border-gray-200 dark:border-[#424242] bg-white/80 dark:bg-[#2f2f2f]/80">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Non specificato</SelectItem>
                  {maritalStatusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Contatti === */}
        <div className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec]">Contatti</h3>
          </div>

          <div className="space-y-4">
            {/* Telefono */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Telefono</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  {...register('phone')}
                  className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                  placeholder="+39 333 1234567"
                  type="tel"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec]">Email</Label>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                    Consigliato
                  </span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmailTooltip(!showEmailTooltip)}
                    className="w-6 h-6 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  
                  {showEmailTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full right-0 mb-2 z-50 w-72 bg-gray-800 text-white p-4 rounded-2xl shadow-xl"
                    >
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm mb-1">Perché è consigliato?</p>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            Inserendo l&apos;email potrai inviare preventivi, notifiche di scadenza tagliando, 
                            conferme appuntamenti e fatture digitali direttamente al cliente.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmailTooltip(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl leading-none"
                      >
                        ×
                      </button>
                      <div className="absolute -bottom-1.5 right-2 w-3 h-3 bg-gray-800 rotate-45"></div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  {...register('email')}
                  className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                  placeholder="mario.rossi@email.it"
                />
              </div>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Preferenze === */}
        <div className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec]">Preferenze</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Canale preferito */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Canale Preferito</Label>
              <Select onValueChange={(v) => setValue('preferredChannel', (v === 'none' ? '' : v) as FormData['preferredChannel'])} defaultValue="none">
                <SelectTrigger className="h-14 rounded-xl border-gray-200 dark:border-[#424242] bg-white/80 dark:bg-[#2f2f2f]/80">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna preferenza</SelectItem>
                  {channelOptions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <c.icon className="w-4 h-4" />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lingua */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Lingua</Label>
              <Select onValueChange={(v) => setValue('language', v as FormData['language'])} defaultValue="italiano">
                <SelectTrigger className="h-14 rounded-xl border-gray-200 dark:border-[#424242] bg-white/80 dark:bg-[#2f2f2f]/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fonte */}
            <div className="col-span-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Come ci hai conosciuto?</Label>
              <Select onValueChange={(v) => setValue('source', (v === 'not_specified' ? '' : v) as FormData['source'])} defaultValue="not_specified">
                <SelectTrigger className="h-14 rounded-xl border-gray-200 dark:border-[#424242] bg-white/80 dark:bg-[#2f2f2f]/80">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Non specificato</SelectItem>
                  {sourceOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag */}
            <div className="col-span-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-[#ececec] mb-2 block">Tag / Categorie</Label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  {...register('tags')}
                  className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#424242] focus:border-blue-500 focus:ring-blue-500/20"
                  placeholder="VIP, Sconto 10%, Cliente storico, ecc."
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-[#636366] mt-1">Separare i tag con virgola</p>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Privacy & Marketing === */}
        <div className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec]">Privacy & Marketing</h3>
          </div>

          <div className="space-y-4">
            {/* Marketing consent */}
            <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-700/30">
              <Checkbox
                id="marketingConsent"
                checked={marketingConsent}
                onCheckedChange={(checked) => setValue('marketingConsent', checked as boolean)}
                className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <div className="flex-1">
                <Label htmlFor="marketingConsent" className="font-medium text-gray-900 dark:text-[#ececec] cursor-pointer">
                  Consenso marketing
                </Label>
                <p className="text-sm text-gray-600 dark:text-[#636366] mt-1">
                  Acconsento a ricevere comunicazioni commerciali, offerte e promozioni
                </p>
              </div>
            </div>

            {/* Do not call */}
            <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-700/30">
              <Checkbox
                id="doNotCall"
                {...register('doNotCall')}
                className="mt-1 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <div className="flex-1">
                <Label htmlFor="doNotCall" className="font-medium text-gray-900 dark:text-[#ececec] cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-red-500" />
                    Non chiamare
                  </span>
                </Label>
                <p className="text-sm text-gray-600 dark:text-[#636366] mt-1">
                  Il cliente non desidera essere contattato telefonicamente
                </p>
              </div>
            </div>

            {/* Do not email */}
            <div className="flex items-start space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-700/30">
              <Checkbox
                id="doNotEmail"
                {...register('doNotEmail')}
                className="mt-1 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
              />
              <div className="flex-1">
                <Label htmlFor="doNotEmail" className="font-medium text-gray-900 dark:text-[#ececec] cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-500" />
                    Non inviare email
                  </span>
                </Label>
                <p className="text-sm text-gray-600 dark:text-[#636366] mt-1">
                  Il cliente non desidera ricevere comunicazioni via email
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* === SEZIONE: Note === */}
        <div className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <Info className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec]">Note</h3>
          </div>

          <div>
            <textarea
              {...register('notes')}
              className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#424242] dark:bg-[#2f2f2f] dark:text-[#ececec] focus:border-blue-500 focus:ring-blue-500/20 resize-none"
              placeholder="Inserisci qui eventuali note sul cliente: preferenze, richieste speciali, storico interazioni..."
            />
          </div>
        </div>
      </motion.div>
    </FormLayout>
  );
}
