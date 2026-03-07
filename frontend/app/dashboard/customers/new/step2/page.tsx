'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, Building2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
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
    await new Promise(r => setTimeout(r, 300));
    router.push('/dashboard/customers/new/step3');
  };

  const handleBack = () => {
    router.push('/dashboard/customers/new/step1');
  };

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <FormLayout 
      step={2} 
      title="Indirizzo & Fiscali" 
      subtitle="Dati di residenza e informazioni fiscali"
      onBack={handleBack}
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
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Indirizzo</h2>
            <p className="text-gray-500 text-sm">Dati di residenza del cliente</p>
          </div>
        </div>

        {/* Indirizzo */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Indirizzo</Label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              {...register('address')}
              className="pl-12 h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              placeholder="Via Roma 123"
            />
          </div>
          {errors.address && <p className="text-red-500 text-sm mt-2">{errors.address.message}</p>}
        </div>

        {/* Città, CAP, Provincia */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Provincia</Label>
            <Input
              {...register('province')}
              className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
              placeholder="MI"
              maxLength={2}
            />
            {errors.province && <p className="text-red-500 text-sm mt-2">{errors.province.message}</p>}
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">CAP</Label>
            <Input
              {...register('zipCode')}
              className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              placeholder="20100"
              maxLength={5}
            />
            {errors.zipCode && <p className="text-red-500 text-sm mt-2">{errors.zipCode.message}</p>}
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Città</Label>
            <Input
              {...register('city')}
              className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              placeholder="Milano"
            />
            {errors.city && <p className="text-red-500 text-sm mt-2">{errors.city.message}</p>}
          </div>
        </div>

        {/* Dati Fiscali Section */}
        <div className="flex items-center gap-3 mb-6 pt-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dati Fiscali</h2>
            <p className="text-gray-500 text-sm">Informazioni fiscali del cliente</p>
          </div>
        </div>

        {/* Codice Fiscale */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Codice Fiscale</Label>
          <div className="relative">
            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              {...register('fiscalCode')}
              className="pl-12 h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
              placeholder="RSSMRA80A01F205X"
              maxLength={16}
            />
          </div>
          {errors.fiscalCode && <p className="text-red-500 text-sm mt-2">{errors.fiscalCode.message}</p>}
        </div>

        {/* P.IVA */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Partita IVA {isBusiness && <span className="text-red-500">*</span>}
          </Label>
          <Input
            {...register('vatNumber', { required: isBusiness })}
            className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            placeholder="IT12345678901"
          />
          {errors.vatNumber && <p className="text-red-500 text-sm mt-2">Partita IVA richiesta per aziende</p>}
        </div>

        {/* SDI e PEC (solo se azienda) */}
        {isBusiness && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">Dati fatturazione elettronica</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Codice SDI</Label>
                <Input
                  {...register('sdiCode')}
                  className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 uppercase"
                  placeholder="XXXXXXX"
                  maxLength={7}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">PEC</Label>
                <Input
                  type="email"
                  {...register('pec')}
                  className="h-14 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  placeholder="pec@azienda.it"
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </FormLayout>
  );
}
