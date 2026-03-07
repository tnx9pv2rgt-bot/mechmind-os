/**
 * BusinessDataStep Component
 * 
 * Step per l'inserimento dei dati aziendali (per utenti business).
 * Include verifica VAT per smart skip.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Briefcase, Globe, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessDataStepProps {
  stepId: string;
  answers: {
    companyName?: string;
    vatNumber?: string;
    businessType?: string;
    country?: string;
    vatVerified?: boolean;
    vatValid?: boolean;
  };
  onAnswersChange: (answers: {
    companyName?: string;
    vatNumber?: string;
    businessType?: string;
    country?: string;
    vatVerified?: boolean;
    vatValid?: boolean;
  }) => void;
  onNext: () => void;
  className?: string;
}

const businessTypes = [
  { id: 'srl', label: 'S.r.l.', description: 'Società a responsabilità limitata' },
  { id: 'spa', label: 'S.p.A.', description: 'Società per azioni' },
  { id: 'ss', label: 'S.s.', description: 'Società semplice' },
  { id: 'snc', label: 'S.n.c.', description: 'Società in nome collettivo' },
  { id: 'ditta', label: 'Ditta individuale', description: 'Impresa individuale' },
  { id: 'other', label: 'Altro', description: 'Altro tipo di società' },
];

const countries = [
  { code: 'IT', label: 'Italia', flag: '🇮🇹', vatPrefix: 'IT' },
  { code: 'DE', label: 'Germania', flag: '🇩🇪', vatPrefix: 'DE' },
  { code: 'FR', label: 'Francia', flag: '🇫🇷', vatPrefix: 'FR' },
  { code: 'ES', label: 'Spagna', flag: '🇪🇸', vatPrefix: 'ES' },
  { code: 'UK', label: 'Regno Unito', flag: '🇬🇧', vatPrefix: 'GB' },
  { code: 'US', label: 'Stati Uniti', flag: '🇺🇸', vatPrefix: '' },
  { code: 'CH', label: 'Svizzera', flag: '🇨🇭', vatPrefix: 'CHE' },
  { code: 'OTHER', label: 'Altro', flag: '🌍', vatPrefix: '' },
];

// Simulazione verifica VAT
const verifyVAT = async (vatNumber: string, country: string): Promise<{ valid: boolean; companyName?: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Simulazione: VAT che inizia con "VALID" è valida
  if (vatNumber.toUpperCase().includes('VALID')) {
    return { valid: true, companyName: 'Azienda Demo S.r.l.' };
  }
  
  // Formato italiano valido
  if (country === 'IT' && /^IT\d{11}$/i.test(vatNumber.replace(/\s/g, ''))) {
    return { valid: true };
  }
  
  return { valid: false };
};

export const BusinessDataStep: React.FC<BusinessDataStepProps> = ({
  stepId,
  answers,
  onAnswersChange,
  onNext,
  className,
}) => {
  const [localAnswers, setLocalAnswers] = useState(answers);
  const [isVerifyingVAT, setIsVerifyingVAT] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);
  const [vatSuccess, setVatSuccess] = useState<string | null>(null);

  // Sync con parent
  useEffect(() => {
    const timeout = setTimeout(() => {
      onAnswersChange(localAnswers);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localAnswers, onAnswersChange]);

  // Verifica VAT automatica
  useEffect(() => {
    const vat = localAnswers.vatNumber;
    const country = localAnswers.country;
    
    if (vat && country && vat.length > 5 && !localAnswers.vatVerified) {
      const timeout = setTimeout(async () => {
        setIsVerifyingVAT(true);
        setVatError(null);
        setVatSuccess(null);
        
        try {
          const result = await verifyVAT(vat, country);
          
          setLocalAnswers((prev) => ({
            ...prev,
            vatVerified: true,
            vatValid: result.valid,
          }));
          
          if (result.valid) {
            setVatSuccess(result.companyName 
              ? `VAT verificata: ${result.companyName}` 
              : 'Partita IVA verificata con successo'
            );
          } else {
            setVatError('Partita IVA non valida o non trovata');
          }
        } catch {
          setVatError('Errore durante la verifica');
        } finally {
          setIsVerifyingVAT(false);
        }
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [localAnswers.vatNumber, localAnswers.country]);

  const handleChange = (fieldId: string, value: string) => {
    // Reset VAT verification on change
    if (fieldId === 'vatNumber' || fieldId === 'country') {
      setLocalAnswers((prev) => ({
        ...prev,
        [fieldId]: value,
        vatVerified: false,
        vatValid: false,
      }));
      setVatError(null);
      setVatSuccess(null);
    } else {
      setLocalAnswers((prev) => ({ ...prev, [fieldId]: value }));
    }
  };

  const selectedCountry = countries.find((c) => c.code === localAnswers.country);

  return (
    <motion.div
      className={cn('py-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
          <Building2 className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dati aziendali
        </h2>
        <p className="text-gray-600">
          Inserisci le informazioni della tua azienda
        </p>
      </div>

      {/* Country Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paese <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleChange('country', country.code)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm border-2 transition-all',
                localAnswers.country === country.code
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="mr-1">{country.flag}</span>
              {country.label}
            </button>
          ))}
        </div>
      </div>

      {/* Company Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ragione sociale <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={localAnswers.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="Nome della tua azienda"
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
          />
        </div>
      </div>

      {/* VAT Number with verification */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {selectedCountry?.code === 'US' ? 'Tax ID / EIN' : 'Partita IVA'}
          <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={localAnswers.vatNumber || ''}
            onChange={(e) => handleChange('vatNumber', e.target.value)}
            placeholder={selectedCountry?.vatPrefix 
              ? `${selectedCountry.vatPrefix}...` 
              : 'Inserisci il numero'
            }
            className={cn(
              'w-full pl-10 pr-12 py-3 rounded-xl border-2 transition-all',
              vatError && 'border-red-300 bg-red-50',
              vatSuccess && 'border-green-300 bg-green-50',
              !vatError && !vatSuccess && 'border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isVerifyingVAT ? (
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            ) : localAnswers.vatValid ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : null}
          </div>
        </div>

        <AnimatePresence>
          {vatError && (
            <motion.p
              className="mt-2 text-sm text-red-600 flex items-center gap-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="w-4 h-4" />
              {vatError}
            </motion.p>
          )}
          {vatSuccess && (
            <motion.p
              className="mt-2 text-sm text-green-600 flex items-center gap-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Check className="w-4 h-4" />
              {vatSuccess}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Business Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo di società <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {businessTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleChange('businessType', type.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left',
                localAnswers.businessType === type.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div>
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-500">{type.description}</div>
              </div>
              {localAnswers.businessType === type.id && (
                <Check className="w-5 h-5 text-purple-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* International warning */}
      {localAnswers.country && localAnswers.country !== 'IT' && (
        <motion.div
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Azienda internazionale rilevata
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Ti verranno richiesti dati aggiuntivi per la fatturazione internazionale.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BusinessDataStep;
