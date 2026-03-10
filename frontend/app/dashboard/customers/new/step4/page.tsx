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
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Success View - same style as bookings/new
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-[min(900px,95vw)] h-[min(900px,95vh)]">
          <motion.div 
            className="relative w-full h-full bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 flex flex-col items-center justify-center p-10 text-center"
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
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Cliente Creato!</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              {formData.firstName} {formData.lastName} è stato registrato con successo con {formData.vehicles?.length || 1} veicolo/i.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
              <p className="text-sm text-gray-500 mb-2">Codice Cliente</p>
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
                className="rounded-full px-8 h-14 border-gray-300 hover:bg-gray-100"
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
            <h2 className="text-xl font-semibold text-gray-900">Riepilogo Dati</h2>
            <p className="text-gray-500 text-sm">Verifica tutte le informazioni inserite</p>
          </div>
        </div>

        {/* Anagrafica */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Anagrafica</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Tipo:</span>
              <span className="font-medium px-3 py-1 bg-gray-100 rounded-full">{isBusiness ? 'Azienda' : 'Privato'}</span>
            </div>
            {isBusiness && formData.companyName && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Ragione Sociale:</span>
                <span className="font-medium">{formData.companyName}</span>
              </div>
            )}
            {formData.title && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Titolo:</span>
                <span className="font-medium">{formData.title}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Nome:</span>
              <span className="font-medium">{formData.firstName} {formData.lastName}</span>
            </div>
            {formData.dateOfBirth && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Data di nascita:</span>
                <span className="font-medium">{formData.dateOfBirth}</span>
              </div>
            )}
            {formData.gender && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Sesso:</span>
                <span className="font-medium">{formData.gender}</span>
              </div>
            )}
            {formData.maritalStatus && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Stato civile:</span>
                <span className="font-medium">{formData.maritalStatus}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Telefono:</span>
              <span className="font-medium">{formData.phone}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{formData.email}</span>
            </div>
          </div>
        </motion.div>

        {/* Indirizzo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Indirizzo</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Indirizzo:</span>
              <span className="font-medium">{formData.address}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Città:</span>
              <span className="font-medium">{formData.city} ({formData.province}) - {formData.zipCode}</span>
            </div>
          </div>
        </motion.div>

        {/* Fiscali */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Dati Fiscali</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Codice Fiscale:</span>
              <span className="font-medium font-mono">{formData.fiscalCode}</span>
            </div>
            {formData.vatNumber && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">P.IVA:</span>
                <span className="font-medium font-mono">{formData.vatNumber}</span>
              </div>
            )}
            {formData.sdiCode && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">SDI:</span>
                <span className="font-medium font-mono">{formData.sdiCode}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Preferenze e Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Preferenze & Privacy</h3>
          </div>
          <div className="space-y-3 text-sm">
            {formData.preferredChannel && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Canale preferito:</span>
                <span className="font-medium capitalize">{formData.preferredChannel}</span>
              </div>
            )}
            {formData.language && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Lingua:</span>
                <span className="font-medium capitalize">{formData.language}</span>
              </div>
            )}
            {formData.source && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Fonte:</span>
                <span className="font-medium">{formData.source}</span>
              </div>
            )}
            {formData.tags && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Tag:</span>
                <span className="font-medium">{formData.tags}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Marketing:</span>
              <span className={`font-medium ${formData.marketingConsent ? 'text-green-600' : 'text-red-600'}`}>
                {formData.marketingConsent ? 'Consenso dato' : 'Non consenso'}
              </span>
            </div>
            {formData.doNotCall && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Restrizioni:</span>
                <span className="font-medium text-red-600">Non chiamare</span>
              </div>
            )}
            {formData.doNotEmail && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Restrizioni:</span>
                <span className="font-medium text-orange-600">Non inviare email</span>
              </div>
            )}
            {formData.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Note</span>
                <p className="text-gray-700 mt-1">{formData.notes}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Veicoli */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">
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
                className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">{v.make} {v.model}</span>
                  <span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-sm">{v.plate}</span>
                </div>
                <div className="text-gray-500 text-sm flex items-center gap-4">
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
