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
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Validazione Multi-Layer
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-2">
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
          className="w-full py-3 px-4 bg-[var(--status-info)] hover:bg-[var(--status-info)] text-[var(--text-on-brand)] font-medium rounded-lg
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-[var(--border-default)]/30 border-t-white rounded-full animate-spin" />
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
                ? 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] border border-[var(--status-success)]/30 dark:border-[var(--status-success)]'
                : 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]'
            }`}
          >
            {submitResult.success ? (
              <CheckCircle className="w-5 h-5 text-[var(--status-success)] dark:text-[var(--status-success)] flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[var(--status-error)] dark:text-[var(--status-error)] flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${
              submitResult.success
                ? 'text-[var(--status-success)] dark:text-[var(--status-success)]'
                : 'text-[var(--status-error)] dark:text-[var(--status-error)]'
            }`}>
              {submitResult.message}
            </p>
          </motion.div>
        )}
      </form>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3">
          Stato Validazione (Debug)
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Email valida:</span>
            <span className={emailValidation?.valid ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
              {emailValidation?.valid ? 'Sì' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Email deliverable:</span>
            <span className="text-[var(--text-primary)] dark:text-[var(--text-tertiary)]">
              {emailValidation?.deliverable || 'unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">VAT valida:</span>
            <span className={vatValidation?.valid ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
              {vatValidation?.valid ? 'Sì' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">VAT Luhn valid:</span>
            <span className={vatValidation?.luhnValid ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
              {vatValidation?.luhnValid ? 'Sì' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Indirizzo selezionato:</span>
            <span className="text-[var(--text-primary)] dark:text-[var(--text-tertiary)]">
              {addressDetails ? 'Sì' : 'No'}
            </span>
          </div>
          {companyData?.name && (
            <div className="pt-2 border-t border-[var(--border-default)] dark:border-[var(--border-default)]">
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Azienda:</span>
              <span className="text-[var(--text-primary)] dark:text-[var(--text-tertiary)] ml-2">{companyData.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ValidationExample;
