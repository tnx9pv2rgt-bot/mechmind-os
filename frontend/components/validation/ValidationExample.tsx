'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { EmailFieldWithValidation } from './EmailFieldWithValidation';
import { VatFieldWithValidation } from './VatFieldWithValidation';
import { AddressAutocompleteField } from './AddressAutocompleteField';
import { SimplifiedEmailValidation, VATValidationResult, AddressDetails } from '@/lib/validation';

/**
 * Esempio di utilizzo dei componenti di validazione
 * in un form completo con validazione multi-layer
 */
export function ValidationExample() {
  const [email, setEmail] = useState('');
  const [emailValidation, setEmailValidation] = useState<SimplifiedEmailValidation | null>(null);
  
  const [vat, setVat] = useState('');
  const [vatValidation, setVatValidation] = useState<VATValidationResult | null>(null);
  const [companyData, setCompanyData] = useState<{ name?: string; address?: string } | null>(null);
  
  const [address, setAddress] = useState('');
  const [addressDetails, setAddressDetails] = useState<Partial<AddressDetails> | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    // Simula invio
    await new Promise(resolve => setTimeout(resolve, 1500));

    const isValid = 
      emailValidation?.valid && 
      vatValidation?.valid && 
      addressDetails !== null;

    if (isValid) {
      setSubmitResult({
        success: true,
        message: 'Form inviato con successo! Tutti i campi sono validi.',
      });
    } else {
      setSubmitResult({
        success: false,
        message: 'Correggi gli errori prima di inviare il form.',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Validazione Multi-Layer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Esempio di validazione in stile Stripe con verifica real-time via API esterne.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <EmailFieldWithValidation
          value={email}
          onChange={(value, validation) => {
            setEmail(value);
            setEmailValidation(validation);
          }}
          label="Email Aziendale"
          placeholder="tuonome@azienda.com"
          required
          allowDisposable={false}
          allowRoleBased={false}
        />

        {/* VAT Field */}
        <VatFieldWithValidation
          value={vat}
          onChange={(value, validation) => {
            setVat(value);
            setVatValidation(validation);
          }}
          onCompanyData={setCompanyData}
          label="Partita IVA"
          placeholder="IT12345678901"
          required
          showCompanyData
        />

        {/* Address Field */}
        <AddressAutocompleteField
          value={address}
          onChange={(value, details) => {
            setAddress(value);
            setAddressDetails(details);
          }}
          label="Indirizzo Sede Legale"
          placeholder="Cerca indirizzo..."
          required
        />

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Validazione in corso...
            </>
          ) : (
            'Invia'
          )}
        </motion.button>

        {/* Result Message */}
        {submitResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg flex items-start gap-3 ${
              submitResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            {submitResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${
              submitResult.success
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {submitResult.message}
            </p>
          </motion.div>
        )}
      </form>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Stato Validazione (Debug)
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Email valida:</span>
            <span className={emailValidation?.valid ? 'text-green-600' : 'text-red-600'}>
              {emailValidation?.valid ? 'Sì' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Email deliverable:</span>
            <span className="text-gray-800 dark:text-gray-200">
              {emailValidation?.deliverable || 'unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">VAT valida:</span>
            <span className={vatValidation?.valid ? 'text-green-600' : 'text-red-600'}>
              {vatValidation?.valid ? 'Sì' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">VAT Luhn valid:</span>
            <span className={vatValidation?.luhnValid ? 'text-green-600' : 'text-red-600'}>
              {vatValidation?.luhnValid ? 'Sì' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Indirizzo selezionato:</span>
            <span className="text-gray-800 dark:text-gray-200">
              {addressDetails ? 'Sì' : 'No'}
            </span>
          </div>
          {companyData?.name && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Azienda:</span>
              <span className="text-gray-800 dark:text-gray-200 ml-2">{companyData.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ValidationExample;
