'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Send, Loader2, User, Mail, Phone, MapPin, Car, CreditCard, Building2, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FormLayout } from '@/components/customers/FormLayout';
import { useFormSession } from '@/hooks/useFormSession';
import { Button } from '@/components/ui/button';

export default function Step4Page() {
  const router = useRouter();
  const { formData, clearForm, isLoaded } = useFormSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect only if truly empty (no data at all)
  useEffect(() => {
    if (isLoaded && Object.keys(formData).length === 0) {
      router.push('/dashboard/customers/new/step1');
    }
  }, [isLoaded, formData, router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsSubmitting(false);
    setIsSuccess(true);
    clearForm();
  };

  const handleBack = () => {
    router.push('/dashboard/customers/new/step3');
  };

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#212121] dark:to-[#212121] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Success View - same style as bookings/new
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#212121] dark:to-[#212121] flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)]">
          <motion.div 
            className="relative w-full h-full bg-white/70 dark:bg-[#2f2f2f]/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 dark:border-[#424242]/50 flex flex-col items-center justify-center p-10 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8"
            >
              <Check className="w-16 h-16 text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-gray-900 dark:text-[#ececec] mb-4">Cliente Creato!</h2>
            <p className="text-gray-600 dark:text-[#636366] mb-8 max-w-md">
              {formData.firstName} {formData.lastName} è stato registrato con successo con {formData.vehicles?.length || 1} veicolo/i.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 mb-8">
              <p className="text-sm text-gray-500 dark:text-[#636366] mb-2">Codice Cliente</p>
              <p className="text-3xl font-mono font-bold text-blue-600">CLI-{Date.now().toString(36).toUpperCase().slice(-8)}</p>
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/dashboard/customers')}
                className="rounded-full px-8 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Vai ai Clienti
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard/customers/new/step1'}
                className="rounded-full px-8 h-14 border-gray-300 dark:border-[#424242] hover:bg-gray-100 dark:hover:bg-[#353535]"
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
      title="Riepilogo" 
      subtitle="Verifica tutti i dati prima di salvare"
      onBack={handleBack}
      onNext={handleSubmit}
      isSubmitting={isSubmitting}
      isLastStep={true}
      nextLabel="Salva Cliente"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Section Header with Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ececec]">Riepilogo Dati</h2>
            <p className="text-gray-500 dark:text-[#636366] text-sm">Verifica tutte le informazioni inserite</p>
          </div>
        </div>

        {/* Anagrafica */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec] text-lg">Anagrafica</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
              <span className="text-gray-500 dark:text-[#636366]">Tipo:</span>
              <span className="font-medium dark:text-[#ececec] px-3 py-1 bg-gray-100 dark:bg-[#353535] rounded-full">{isBusiness ? 'Azienda' : 'Privato'}</span>
            </div>
            {isBusiness && formData.companyName && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Ragione Sociale:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.companyName}</span>
              </div>
            )}
            {formData.title && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Titolo:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.title}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
              <span className="text-gray-500 dark:text-[#636366]">Nome:</span>
              <span className="font-medium dark:text-[#ececec]">{formData.firstName} {formData.lastName}</span>
            </div>
            {formData.dateOfBirth && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Data di nascita:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.dateOfBirth}</span>
              </div>
            )}
            {formData.gender && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Sesso:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.gender}</span>
              </div>
            )}
            {formData.maritalStatus && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Stato civile:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.maritalStatus}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
              <span className="text-gray-500 dark:text-[#636366]">Telefono:</span>
              <span className="font-medium dark:text-[#ececec]">{formData.phone}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-[#636366]">Email:</span>
              <span className="font-medium dark:text-[#ececec]">{formData.email}</span>
            </div>
          </div>
        </motion.div>

        {/* Indirizzo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec] text-lg">Indirizzo</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
              <span className="text-gray-500 dark:text-[#636366]">Indirizzo:</span>
              <span className="font-medium dark:text-[#ececec]">{formData.address}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-[#636366]">Città:</span>
              <span className="font-medium dark:text-[#ececec]">{formData.city} ({formData.province}) - {formData.zipCode}</span>
            </div>
          </div>
        </motion.div>

        {/* Fiscali */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec] text-lg">Dati Fiscali</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
              <span className="text-gray-500 dark:text-[#636366]">Codice Fiscale:</span>
              <span className="font-medium font-mono dark:text-[#ececec]">{formData.fiscalCode}</span>
            </div>
            {formData.vatNumber && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">P.IVA:</span>
                <span className="font-medium font-mono dark:text-[#ececec]">{formData.vatNumber}</span>
              </div>
            )}
            {formData.sdiCode && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 dark:text-[#636366]">SDI:</span>
                <span className="font-medium font-mono dark:text-[#ececec]">{formData.sdiCode}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Preferenze e Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec] text-lg">Preferenze & Privacy</h3>
          </div>
          <div className="space-y-3 text-sm">
            {formData.preferredChannel && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Canale preferito:</span>
                <span className="font-medium capitalize dark:text-[#ececec]">{formData.preferredChannel}</span>
              </div>
            )}
            {formData.language && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Lingua:</span>
                <span className="font-medium capitalize dark:text-[#ececec]">{formData.language}</span>
              </div>
            )}
            {formData.source && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Fonte:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.source}</span>
              </div>
            )}
            {formData.tags && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Tag:</span>
                <span className="font-medium dark:text-[#ececec]">{formData.tags}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
              <span className="text-gray-500 dark:text-[#636366]">Marketing:</span>
              <span className={`font-medium ${formData.marketingConsent ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formData.marketingConsent ? 'Consenso dato' : 'Non consenso'}
              </span>
            </div>
            {formData.doNotCall && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#424242]">
                <span className="text-gray-500 dark:text-[#636366]">Restrizioni:</span>
                <span className="font-medium text-red-600 dark:text-red-400">Non chiamare</span>
              </div>
            )}
            {formData.doNotEmail && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 dark:text-[#636366]">Restrizioni:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">Non inviare email</span>
              </div>
            )}
            {formData.notes && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-[#353535] rounded-xl">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Note</span>
                <p className="text-gray-700 dark:text-[#ececec] mt-1">{formData.notes}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Veicoli */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#424242]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-[#ececec] text-lg">
              Veicoli ({formData.vehicles?.length || 0})
            </h3>
          </div>
          <div className="space-y-3">
            {formData.vehicles?.map((v: { make?: string; model?: string; plate?: string; year?: number; km?: number; fuel?: string }, i: number) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#353535] dark:to-[#353535] rounded-2xl p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900 dark:text-[#ececec]">{v.make} {v.model}</span>
                  <span className="font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-sm">{v.plate}</span>
                </div>
                <div className="text-gray-500 dark:text-[#636366] text-sm flex items-center gap-4">
                  <span>{v.year}</span>
                  <span>•</span>
                  <span>{v.km?.toLocaleString?.() || '0'} km</span>
                  <span>•</span>
                  <span className="capitalize">{v.fuel}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </FormLayout>
  );
}
