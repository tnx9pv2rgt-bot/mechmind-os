'use client';

/**
 * Esempio di Form con Analytics Completo
 * 
 * Questo componente dimostra come integrare tutto il sistema analytics
 * in un form multi-step per registrazione cliente.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useExperiment, heatmapTracker, errorTracker } from '../../lib/analytics';
import { useFormFunnel } from '../../hooks/useFormFunnel';

// Tipi
interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  vatNumber: string;
  marketingConsent: boolean;
  termsAccepted: boolean;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phone: '',
  companyName: '',
  vatNumber: '',
  marketingConsent: false,
  termsAccepted: false,
};

// Step configuration
const STEPS = [
  { id: 0, name: 'credentials', title: 'Credenziali', fields: ['email', 'password', 'confirmPassword'] },
  { id: 1, name: 'personal', title: 'Dati Personali', fields: ['firstName', 'lastName', 'phone'] },
  { id: 2, name: 'company', title: 'Azienda', fields: ['companyName', 'vatNumber'] },
  { id: 3, name: 'consent', title: 'Consensi', fields: ['marketingConsent', 'termsAccepted'] },
];

export function FormWithAnalytics() {
  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [fieldAttempts, setFieldAttempts] = useState<Partial<Record<keyof FormData, number>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A/B Testing
  const { variant: layoutVariant, config: layoutConfig, trackConversion } = 
    useExperiment('exp-layout-001');
  const { variant: buttonVariant, config: buttonConfig } = 
    useExperiment('exp-button-copy-001');

  // Form Funnel Analytics
  const {
    currentStep,
    startStep,
    completeStep,
    trackFieldCompletion,
    trackFieldError,
    trackFieldCorrection,
    trackEmailCheck,
    trackVatVerification,
    trackConsentChange,
    completeForm,
    trackFormError,
  } = useFormFunnel('customer-registration');

  // Inizializza heatmap
  useEffect(() => {
    heatmapTracker.start();
    return () => heatmapTracker.stop();
  }, []);

  // Inizia primo step
  useEffect(() => {
    startStep(0, 'credentials');
  }, [startStep]);

  // Validazione campo
  const validateField = useCallback((field: keyof FormData, value: unknown): string | null => {
    switch (field) {
      case 'email':
        if (!value || typeof value !== 'string') return 'Email richiesta';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Formato email non valido';
        return null;
      
      case 'password':
        if (!value || typeof value !== 'string') return 'Password richiesta';
        if (value.length < 8) return 'Minimo 8 caratteri';
        if (!/[A-Z]/.test(value)) return 'Maiuscola richiesta';
        if (!/[0-9]/.test(value)) return 'Numero richiesto';
        return null;
      
      case 'confirmPassword':
        if (value !== formData.password) return 'Le password non coincidono';
        return null;
      
      case 'phone':
        if (!value || typeof value !== 'string') return 'Telefono richiesto';
        if (!/^\+?[\d\s-]{10,}$/.test(value)) return 'Formato non valido';
        return null;
      
      case 'vatNumber':
        if (!value || typeof value !== 'string') return 'P.IVA richiesta';
        if (!/^IT\d{11}$/.test(value)) return 'Formato IT + 11 cifre';
        return null;
      
      case 'termsAccepted':
        if (!value) return 'Devi accettare i termini';
        return null;
      
      default:
        return null;
    }
  }, [formData.password]);

  // Handle field change
  const handleFieldChange = useCallback(async (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Traccia tentativi
    setFieldAttempts((prev) => ({
      ...prev,
      [field]: (prev[field] || 0) + 1,
    }));

    // Validazione
    const error = validateField(field, value);
    
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      trackFieldError(field, error);
    } else {
      // Rimuovi errore se presente
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
        trackFieldCorrection(field, fieldAttempts[field] || 1);
      }
      
      // Traccia completamento campo
      trackFieldCompletion(field);
    }

    // Check email
    if (field === 'email' && !error && typeof value === 'string' && value.includes('@')) {
      const startTime = Date.now();
      try {
        const response = await fetch(`/api/check-email?email=${encodeURIComponent(value)}`);
        const { exists } = await response.json();
        trackEmailCheck(exists, Date.now() - startTime);
        
        if (exists) {
          setErrors((prev) => ({ ...prev, email: 'Email già registrata' }));
        }
      } catch (e) {
        errorTracker.captureException(e as Error, { 
          extra: { action: 'check_email', email: value } 
        });
      }
    }

    // Verify VAT
    if (field === 'vatNumber' && !error && typeof value === 'string' && value.startsWith('IT')) {
      const startTime = Date.now();
      try {
        const response = await fetch(`/api/verify-vat?vat=${encodeURIComponent(value)}`);
        const result = await response.json();
        trackVatVerification(result.valid, !!result.companyName);
        
        if (result.valid && result.companyName) {
          setFormData((prev) => ({ ...prev, companyName: result.companyName }));
        }
      } catch (e) {
        errorTracker.captureException(e as Error, { 
          extra: { action: 'verify_vat', vat: value } 
        });
      }
    }
  }, [errors, fieldAttempts, trackFieldCompletion, trackFieldError, trackFieldCorrection, trackEmailCheck, trackVatVerification, validateField]);

  // Handle consent change
  const handleConsentChange = useCallback((type: 'marketing' | 'terms', value: boolean) => {
    trackConsentChange(type, value);
    
    if (type === 'marketing') {
      setFormData((prev) => ({ ...prev, marketingConsent: value }));
    } else {
      setFormData((prev) => ({ ...prev, termsAccepted: value }));
    }
  }, [trackConsentChange]);

  // Validate current step
  const validateStep = useCallback((): boolean => {
    const currentStepConfig = STEPS[currentStep];
    const stepErrors: Partial<Record<keyof FormData, string>> = {};
    let isValid = true;

    for (const field of currentStepConfig.fields) {
      const error = validateField(field as keyof FormData, formData[field as keyof FormData]);
      if (error) {
        stepErrors[field as keyof FormData] = error;
        trackFieldError(field, error);
        isValid = false;
      }
    }

    setErrors(stepErrors);
    return isValid;
  }, [currentStep, formData, trackFieldError, validateField]);

  // Go to next step
  const handleNextStep = useCallback(() => {
    if (!validateStep()) {
      errorTracker.addBreadcrumb('Step validation failed', 'form', { step: currentStep });
      return;
    }

    const currentStepConfig = STEPS[currentStep];
    const completedFields = currentStepConfig.fields.filter(
      (field) => !errors[field as keyof FormData]
    );

    completeStep(currentStep, completedFields);

    if (currentStep < STEPS.length - 1) {
      const nextStep = STEPS[currentStep + 1];
      startStep(nextStep.id, nextStep.name);
    }
  }, [currentStep, errors, validateStep, completeStep, startStep]);

  // Go to previous step
  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = STEPS[currentStep - 1];
      startStep(prevStep.id, prevStep.name);
    }
  }, [currentStep, startStep]);

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const transaction = errorTracker.startTransaction('form_submit', 'submit');
    transaction.setData('step', currentStep);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerType: formData.vatNumber ? 'business' : 'individual',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Traccia successo
      completeForm(result.customerId, formData.vatNumber ? 'business' : 'individual');
      trackConversion({ customerId: result.customerId });
      
      transaction.finish('success');
      
      // Redirect o messaggio successo
      window.location.href = '/success';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setSubmitError(errorMessage);
      
      trackFormError(errorMessage);
      errorTracker.captureException(error as Error, {
        formStep: currentStep,
        extra: { formData },
      });
      
      transaction.finish('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, formData, validateStep, completeForm, trackConversion, trackFormError]);

  // Layout basato su A/B test
  const isTwoColumn = (layoutConfig?.columns as number) === 2;
  const buttonText = (buttonConfig?.buttonText as string) || 'Registrati Ora';

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={isTwoColumn ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            <FormField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(v) => handleFieldChange('email', v)}
              error={errors.email}
              required
            />
            <FormField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(v) => handleFieldChange('password', v)}
              error={errors.password}
              required
            />
            <FormField
              label="Conferma Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(v) => handleFieldChange('confirmPassword', v)}
              error={errors.confirmPassword}
              required
            />
          </div>
        );
      
      case 1:
        return (
          <div className={isTwoColumn ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            <FormField
              label="Nome"
              value={formData.firstName}
              onChange={(v) => handleFieldChange('firstName', v)}
              error={errors.firstName}
              required
            />
            <FormField
              label="Cognome"
              value={formData.lastName}
              onChange={(v) => handleFieldChange('lastName', v)}
              error={errors.lastName}
              required
            />
            <FormField
              label="Telefono"
              type="tel"
              value={formData.phone}
              onChange={(v) => handleFieldChange('phone', v)}
              error={errors.phone}
              required
            />
          </div>
        );
      
      case 2:
        return (
          <div className={isTwoColumn ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            <FormField
              label="Ragione Sociale"
              value={formData.companyName}
              onChange={(v) => handleFieldChange('companyName', v)}
              error={errors.companyName}
            />
            <FormField
              label="Partita IVA"
              placeholder="IT12345678901"
              value={formData.vatNumber}
              onChange={(v) => handleFieldChange('vatNumber', v)}
              error={errors.vatNumber}
              helpText="Inserisci IT + 11 cifre"
            />
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <CheckboxField
              label="Accetto di ricevere comunicazioni marketing"
              checked={formData.marketingConsent}
              onChange={(v) => handleConsentChange('marketing', v)}
            />
            <CheckboxField
              label="Accetto i termini e condizioni *"
              checked={formData.termsAccepted}
              onChange={(v) => handleConsentChange('terms', v)}
              error={errors.termsAccepted}
              required
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep
                    ? 'bg-blue-600 text-white'
                    : index === currentStep
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className="ml-2 hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{STEPS[currentStep].title}</h2>
          {renderStepContent()}
        </div>

        {/* Errori */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {submitError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Indietro
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Avanti
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Invio in corso...' : buttonText}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Componenti helper
function FormField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  required,
  placeholder,
  helpText,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      {helpText && <p className="text-sm text-gray-500 mt-1">{helpText}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  error,
  required,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-start">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 mr-3"
        />
        <span className="text-sm">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      </label>
      {error && <p className="text-sm text-red-500 mt-1 ml-6">{error}</p>}
    </div>
  );
}

export default FormWithAnalytics;
