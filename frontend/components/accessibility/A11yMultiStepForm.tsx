/**
 * A11yMultiStepForm Component
 * Form multi-step completamente accessibile
 * WCAG 2.1 AA Compliant
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { A11yFormField } from './A11yFormField';
import { useStepKeyboardNavigation, useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useFormAnnouncer } from '@/hooks/useA11yAnnouncer';
import { buildStepperAria } from '@/lib/accessibility';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description?: string;
  fields: React.ReactNode;
  validate?: () => boolean;
}

export interface A11yMultiStepFormProps {
  /** Steps del form */
  steps: Step[];
  /** Callback submit finale */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Callback annulla */
  onCancel?: () => void;
  /** Titolo form */
  title?: string;
  /** Descrizione form */
  description?: string;
  /** Classe CSS aggiuntiva */
  className?: string;
}

/**
 * A11yMultiStepForm - Form multi-step accessibile
 */
export function A11yMultiStepForm({
  steps,
  onSubmit,
  onCancel,
  title,
  description,
  className = '',
}: A11yMultiStepFormProps) {
  const { t } = useTranslation(['form', 'a11y', 'common']);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const stepperRef = useRef<HTMLDivElement>(null);

  const { announceStepChange, announceFormSubmit, announceFormSuccess, announceFormError } = 
    useFormAnnouncer({ formName: 'multi-step', totalSteps: steps.length });

  // Keyboard navigation per step
  useStepKeyboardNavigation({
    totalSteps: steps.length,
    currentStep,
    onStepChange: (step) => {
      if (canGoToStep(step)) {
        handleStepChange(step);
      }
    },
  });

  // Container keyboard navigation
  const { containerRef } = useKeyboardNavigation({
    escapeCloses: false,
  });

  const currentStepData = steps[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  // Build ARIA attributes per stepper
  const stepperAria = buildStepperAria({
    stepperId: 'form-stepper',
    currentStep,
    totalSteps: steps.length,
    stepTitles: steps.map((s) => s.title),
  });

  const canGoToStep = (step: number): boolean => {
    // Permetti di tornare indietro sempre
    if (step < currentStep) return true;
    // Verifica step precedenti per andare avanti
    for (let i = 0; i < step - 1; i++) {
      if (steps[i].validate && !steps[i].validate!()) {
        return false;
      }
    }
    return true;
  };

  const handleStepChange = useCallback((newStep: number) => {
    setCurrentStep(newStep);
    announceStepChange(newStep, steps[newStep - 1]?.title);
    
    // Focus sul contenuto del nuovo step
    setTimeout(() => {
      const stepContent = document.getElementById(`step-${newStep}-content`);
      if (stepContent) {
        stepContent.focus();
      }
    }, 100);
  }, [announceStepChange, steps]);

  const handleNext = () => {
    if (currentStepData.validate && !currentStepData.validate()) {
      return;
    }
    if (!isLastStep) {
      handleStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      handleStepChange(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (currentStepData.validate && !currentStepData.validate()) {
      return;
    }

    setIsSubmitting(true);
    announceFormSubmit();

    try {
      await onSubmit(formData);
      announceFormSuccess();
    } catch (error) {
      announceFormError(error instanceof Error ? error.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progresso
  const progress = (currentStep / steps.length) * 100;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`w-full max-w-3xl mx-auto ${className}`}
      role="form"
      aria-labelledby={title ? 'form-title' : undefined}
      aria-describedby={description ? 'form-description' : undefined}
    >
      {/* Header */}
      {(title || description) && (
        <div className="mb-8">
          {title && (
            <h1 id="form-title" className="text-2xl font-bold mb-2">
              {title}
            </h1>
          )}
          {description && (
            <p id="form-description" className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Stepper */}
      <nav
        ref={stepperRef}
        {...stepperAria.container}
        className="mb-8"
        aria-label={t('form:step.title', { current: currentStep, total: steps.length })}
      >
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isClickable = canGoToStep(stepNumber);

            return (
              <li
                key={step.id}
                {...stepperAria.step(index)}
                className="flex items-center"
              >
                <button
                  onClick={() => isClickable && handleStepChange(stepNumber)}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md
                    transition-colors focus:outline-none focus:ring-2 focus:ring-ring
                    ${isCurrent 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }
                    ${!isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent'}
                  `}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={`
                      flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium
                      ${isCurrent || isCompleted
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                      }
                    `}
                    aria-hidden="true"
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      stepNumber
                    )}
                  </span>
                  <span className="hidden sm:inline text-sm font-medium">
                    {step.title}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 mx-2 text-muted-foreground" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>

        {/* Progress bar */}
        <div
          className="mt-4 h-2 bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('form:step.title', { current: currentStep, total: steps.length })}
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </nav>

      {/* Step content */}
      <div
        id={`step-${currentStep}-content`}
        tabIndex={-1}
        className="bg-card border rounded-lg p-6 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-labelledby={`step-${currentStep}-title`}
      >
        <h2 id={`step-${currentStep}-title`} className="text-xl font-semibold mb-2">
          {currentStepData.title}
        </h2>
        {currentStepData.description && (
          <p className="text-muted-foreground mb-6">
            {currentStepData.description}
          </p>
        )}

        <div className="space-y-4">
          {currentStepData.fields}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={isFirstStep}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md
            border border-input bg-background
            hover:bg-accent hover:text-accent-foreground
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common:actions.back')}
        </button>

        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="
                px-4 py-2 rounded-md
                border border-input bg-background
                hover:bg-accent hover:text-accent-foreground
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              "
            >
              {t('common:actions.cancel')}
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="
                flex items-center gap-2 px-4 py-2 rounded-md
                bg-primary text-primary-foreground
                hover:bg-primary/90
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {t('common:actions.loading')}
                </>
              ) : (
                t('common:actions.submit')
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="
                flex items-center gap-2 px-4 py-2 rounded-md
                bg-primary text-primary-foreground
                hover:bg-primary/90
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              "
            >
              {t('common:actions.next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Keyboard instructions per screen reader */}
      <p className="sr-only" role="note">
        {t('a11y:screenReader.instructions.formNavigation')}
      </p>
    </div>
  );
}

export default A11yMultiStepForm;
