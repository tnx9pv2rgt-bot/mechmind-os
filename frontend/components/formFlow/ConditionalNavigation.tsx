'use client';

/**
 * ConditionalNavigation Component
 * 
 * Navigazione adattiva per form condizionali con:
 * - Pulsanti back/next condizionali
 * - Stati di loading e validazione
 * - Animazioni e feedback visivi
 * - Supporto accessibilità
 */

'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConditionalNavigationProps } from '@/lib/formFlow/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * ConditionalNavigation
 */
export const ConditionalNavigation: React.FC<ConditionalNavigationProps> = ({
  canGoBack,
  canGoNext,
  isLastStep,
  onBack,
  onNext,
  backLabel = 'Indietro',
  nextLabel = 'Continua',
  completeLabel = 'Completa',
  isLoading = false,
  isValid = true,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Handler per back con prevenzione default
  const handleBack = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isLoading && canGoBack) {
        onBack();
      }
    },
    [canGoBack, isLoading, onBack]
  );

  // Handler per next/complete
  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isLoading && canGoNext) {
        onNext();
      }
    },
    [canGoNext, isLoading, onNext]
  );

  // Determina label e icona per il pulsante principale
  const primaryLabel = isLastStep ? completeLabel : nextLabel;
  const PrimaryIcon = isLastStep ? Check : ArrowRight;

  return (
    <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-[var(--border-default)]">
      {/* Back Button */}
      <motion.button
        type="button"
        onClick={handleBack}
        disabled={!canGoBack || isLoading}
        className={cn(
          'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)] focus:ring-offset-2',
          canGoBack && !isLoading
            ? 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'
            : 'text-[var(--text-tertiary)] cursor-not-allowed opacity-50'
        )}
        whileHover={prefersReducedMotion ? {} : { x: -2 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        aria-label={backLabel}
        aria-disabled={!canGoBack || isLoading}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backLabel}</span>
      </motion.button>

      {/* Next/Complete Button */}
      <motion.button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext || isLoading || !isValid}
        className={cn(
          'flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          canGoNext && !isLoading && isValid
            ? cn(
                'text-[var(--text-on-brand)] shadow-md hover:shadow-lg',
                isLastStep
                  ? 'bg-[var(--status-success)] hover:bg-[var(--status-success)] focus:ring-[var(--status-success)]'
                  : 'bg-[var(--status-info)] hover:bg-[var(--status-info)] focus:ring-[var(--status-info)]'
              )
            : 'bg-[var(--border-strong)] text-[var(--text-tertiary)] cursor-not-allowed'
        )}
        whileHover={prefersReducedMotion || !canGoNext ? {} : { x: 2 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        aria-label={primaryLabel}
        aria-disabled={!canGoNext || isLoading || !isValid}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Caricamento...</span>
          </>
        ) : (
          <>
            <span>{primaryLabel}</span>
            <PrimaryIcon className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </div>
  );
};

/**
 * StepIndicators
 * 
 * Indicatori visivi per la navigazione tra step
 */
export const StepIndicators: React.FC<{
  steps: string[];
  currentIndex: number;
  visitedSteps: string[];
  onStepClick?: (index: number) => void;
  className?: string;
}> = ({ steps, currentIndex, visitedSteps, onStepClick, className }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <nav
      className={cn('flex items-center gap-1 overflow-x-auto py-2', className)}
      aria-label="Progresso form"
    >
      {steps.map((step, index) => {
        const isCompleted = visitedSteps.includes(step) && index < currentIndex;
        const isCurrent = index === currentIndex;
        const isVisited = visitedSteps.includes(step);
        const isClickable = isVisited && onStepClick;

        return (
          <React.Fragment key={step}>
            {/* Connector line */}
            {index > 0 && (
              <div
                className={cn(
                  'w-4 h-0.5 flex-shrink-0 transition-colors duration-300',
                  isCompleted || isCurrent ? 'bg-[var(--status-info)]' : 'bg-[var(--border-default)]'
                )}
              />
            )}

            {/* Step indicator */}
            <motion.button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium',
                'transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1',
                isCompleted && 'bg-[var(--status-info-subtle)]0 text-[var(--text-on-brand)] focus:ring-[var(--status-info)]',
                isCurrent && 'bg-[var(--status-info)] text-[var(--text-on-brand)] ring-2 ring-[var(--status-info)]/20 focus:ring-[var(--status-info)]',
                !isCompleted &&
                  !isCurrent &&
                  isVisited &&
                  'bg-[var(--status-info-subtle)] text-[var(--status-info)] hover:bg-[var(--status-info)]/20 focus:ring-[var(--status-info)]/40',
                !isVisited &&
                  'bg-[var(--surface-secondary)] text-[var(--text-tertiary)] cursor-not-allowed'
              )}
              whileHover={prefersReducedMotion || !isClickable ? {} : { scale: 1.1 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              aria-label={`Step ${index + 1}${isCurrent ? ' (attuale)' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </motion.button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/**
 * FloatingNavigation
 * 
 * Navigazione fluttuante per form a schermo intero
 */
export const FloatingNavigation: React.FC<
  ConditionalNavigationProps & {
    progress?: number;
  }
> = ({
  canGoBack,
  canGoNext,
  isLastStep,
  onBack,
  onNext,
  backLabel = 'Indietro',
  nextLabel = 'Avanti',
  completeLabel = 'Completa',
  isLoading = false,
  isValid = true,
  progress = 0,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-[var(--surface-secondary)]/90 backdrop-blur-md border-t border-[var(--border-default)] p-4 z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={prefersReducedMotion ? {} : { type: 'spring', stiffness: 300 }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--surface-secondary)]">
        <motion.div
          className="h-full bg-[var(--status-info-subtle)]0"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <motion.button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            canGoBack && !isLoading
              ? 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
              : 'text-[var(--text-tertiary)] cursor-not-allowed'
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </motion.button>

        <motion.button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isLoading || !isValid}
          className={cn(
            'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
            canGoNext && !isLoading && isValid
              ? 'bg-[var(--status-info)] text-[var(--text-on-brand)] hover:bg-[var(--status-info)] shadow-lg'
              : 'bg-[var(--border-default)] text-[var(--text-tertiary)] cursor-not-allowed'
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isLastStep ? completeLabel : nextLabel}
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
              {isLastStep && <Check className="w-4 h-4" />}
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ConditionalNavigation;
