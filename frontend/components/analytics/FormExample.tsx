/**
 * Form Customer Example
 * Esempio completo di form cliente con analytics integrato
 */

'use client';

import React, { useState } from 'react';
import { useFormAnalytics, useABTest } from '../../hooks/useFormAnalytics';
import { FormAnalyticsDashboard } from './dashboard';

// ============================================
// COMPONENTE ESEMPIO FORM CLIENTE CON ANALYTICS
// ============================================

interface FormData {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  azienda: string;
  settore: string;
  note: string;
}

export const CustomerFormWithAnalytics: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    azienda: '',
    settore: '',
    note: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Initialize A/B Test
  const { variant, content, trackConversion, trackEvent } = useABTest({
    experimentId: 'customer-form-headline-2024',
    config: {
      variantA: {
        headline: 'Registra la tua azienda',
        description: 'Completa il form per accedere a tutti i servizi',
        cta: 'Registrati ora',
      },
      variantB: {
        headline: 'Inizia gratis oggi',
        description: 'Nessuna carta di credito richiesta',
        cta: 'Crea account gratuito',
      },
    },
  });

  // Initialize Form Analytics
  const analytics = useFormAnalytics({
    formId: 'customer-registration-v2',
    totalSteps: 3,
    stepNames: ['Dati Personali', 'Informazioni Azienda', 'Conferma'],
    enableHeatmap: true,
    enableRealtime: true,
    enablePerformance: true,
    onStepChange: (stepNum, stepName) => {
      console.log(`Step changed: ${stepNum} - ${stepName}`);
    },
    onComplete: () => {
      console.log('Form completed!');
      trackConversion({ formVersion: 'v2' });
    },
    onAbandon: (lastStep, lastField) => {
      console.log(`Abandoned at step ${lastStep}, field: ${lastField}`);
    },
  });

  // Track field interaction
  const handleFieldFocus = (fieldName: keyof FormData) => {
    analytics.trackFieldInteraction(fieldName);
    trackEvent('field_focus', { field: fieldName });
  };

  // Handle field change with validation
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate current step
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.nome.trim()) {
        newErrors.nome = 'Nome obbligatorio';
        isValid = false;
      }
      if (!formData.cognome.trim()) {
        newErrors.cognome = 'Cognome obbligatorio';
        isValid = false;
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email obbligatoria';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email non valida';
        isValid = false;
      }
    }

    if (currentStep === 2) {
      if (!formData.azienda.trim()) {
        newErrors.azienda = 'Nome azienda obbligatorio';
        isValid = false;
      }
      if (!formData.settore) {
        newErrors.settore = 'Settore obbligatorio';
        isValid = false;
      }
    }

    // Track validation errors
    Object.entries(newErrors).forEach(([field, error]) => {
      if (error) {
        analytics.trackFieldError(field, error, currentStep);
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Navigate to next step
  const handleNext = () => {
    if (validateStep(step)) {
      analytics.trackStepComplete(step);
      const nextStep = step + 1;
      setStep(nextStep);
      analytics.trackStepStart(nextStep);
      trackEvent('step_complete', { step, nextStep });
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      analytics.trackStepStart(prevStep);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    try {
      // Measure API call
      const result = await analytics.performance.measureApiCall(async () => {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) throw new Error('Submit failed');
        return response.json();
      });

      analytics.trackConversion();
      trackConversion({ customerId: result.id });
      
      alert('Registrazione completata con successo!');
    } catch (error) {
      analytics.trackFieldError('submit', 'Errore durante l\'invio', step);
      alert('Errore durante la registrazione. Riprova.');
    }
  };

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                onFocus={() => handleFieldFocus('nome')}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.nome ? 'border-red-500' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Mario"
              />
              {errors.nome && (
                <span className="text-sm text-red-500">{errors.nome}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cognome *
              </label>
              <input
                type="text"
                value={formData.cognome}
                onChange={(e) => handleChange('cognome', e.target.value)}
                onFocus={() => handleFieldFocus('cognome')}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.cognome ? 'border-red-500' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Rossi"
              />
              {errors.cognome && (
                <span className="text-sm text-red-500">{errors.cognome}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onFocus={() => handleFieldFocus('email')}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.email ? 'border-red-500' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="mario.rossi@esempio.it"
              />
              {errors.email && (
                <span className="text-sm text-red-500">{errors.email}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                onFocus={() => handleFieldFocus('telefono')}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+39 123 456 7890"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Azienda *
              </label>
              <input
                type="text"
                value={formData.azienda}
                onChange={(e) => handleChange('azienda', e.target.value)}
                onFocus={() => handleFieldFocus('azienda')}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.azienda ? 'border-red-500' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Azienda S.r.l."
              />
              {errors.azienda && (
                <span className="text-sm text-red-500">{errors.azienda}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Settore *
              </label>
              <select
                value={formData.settore}
                onChange={(e) => handleChange('settore', e.target.value)}
                onFocus={() => handleFieldFocus('settore')}
                className={`w-full px-4 py-2 rounded-xl border ${
                  errors.settore ? 'border-red-500' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Seleziona settore</option>
                <option value="tecnologia">Tecnologia</option>
                <option value="manifattura">Manifattura</option>
                <option value="servizi">Servizi</option>
                <option value="commercio">Commercio</option>
                <option value="altro">Altro</option>
              </select>
              {errors.settore && (
                <span className="text-sm text-red-500">{errors.settore}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                onFocus={() => handleFieldFocus('note')}
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Note aggiuntive..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800">Riepilogo dati</h3>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Nome:</span>
                <span className="font-medium">{formData.nome} {formData.cognome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telefono:</span>
                <span className="font-medium">{formData.telefono || 'Non fornito'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Azienda:</span>
                <span className="font-medium">{formData.azienda}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settore:</span>
                <span className="font-medium capitalize">{formData.settore}</span>
              </div>
              {formData.note && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Note:</span>
                  <p className="mt-1 text-sm">{formData.note}</p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500">
              Cliccando su "{content.cta}" accetti i termini di servizio e la privacy policy.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Container: 900×900px glassmorphism
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Main Form Container - Design System */}
      <div className="w-[900px] h-[900px] bg-white/80 backdrop-blur-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-gray-200/50">
          {/* A/B Test Headline */}
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-3">
              Variante {variant}
            </span>
            <h1 className="text-2xl font-bold text-gray-800">{content.headline}</h1>
            <p className="text-gray-500 mt-2">{content.description}</p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Step {step} di 3</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-gray-200/50">
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-3 rounded-xl text-gray-600 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Indietro
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
              >
                Avanti
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-500/25"
              >
                {content.cta}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Dashboard - visibile solo in dev */}
      {process.env.NODE_ENV === 'development' && (
        <FormAnalyticsDashboard
          formId="customer-registration-v2"
          position="bottom-right"
          showFunnel
          showHeatmap
          showABTest
        />
      )}
    </div>
  );
};

export default CustomerFormWithAnalytics;
