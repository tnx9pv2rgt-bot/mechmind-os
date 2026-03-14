'use client';

/**
 * ConditionalStepRenderer Component
 * 
 * Renderer principale per form condizionali con animazioni,
 * gestione step dinamici e integrazione con useConditionalFlow.
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ConditionalStepRendererProps } from '@/lib/formFlow/types';
import { useConditionalFlow } from '@/hooks/form-flow';
import { DynamicProgress } from './DynamicProgress';
import { ConditionalNavigation } from './ConditionalNavigation';

// Animation variants
const stepVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  }),
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Default step components (placeholder)
 */
const DefaultStepComponent: React.FC<{
  stepId: string;
  onNext: () => void;
  onBack: () => void;
}> = ({ stepId, onNext }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">
      Step: {stepId}
    </h2>
    <p className="text-gray-600 mb-6">
      Componente non configurato per questo step.
    </p>
    <button
      onClick={onNext}
      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      Continua
    </button>
  </div>
);

/**
 * ConditionalStepRenderer
 */
export const ConditionalStepRenderer: React.FC<ConditionalStepRendererProps> = ({
  answers: externalAnswers,
  onStepChange,
  onAnswersChange,
  onComplete,
  config,
  customComponents = {},
  className,
}) => {
  // Usa il hook conditional flow
  const {
    activeSteps,
    currentStepIndex,
    currentStepId,
    estimatedTime,
    progress,
    canGoBack,
    canGoNext,
    isLastStep,
    isFirstStep,
    answers,
    goToNext,
    goToPrevious,
    updateAnswersImmediate,
    complete,
  } = useConditionalFlow({
    initialAnswers: externalAnswers,
    config,
    onStepChange,
    onAnswersChange,
    onComplete,
  });

  // Direction per animazione
  const [direction, setDirection] = React.useState(0);

  // Memoizza la mappa dei componenti
  const stepComponents = useMemo(
    () => ({
      welcome: DefaultStepComponent,
      credentials: DefaultStepComponent,
      personalData: DefaultStepComponent,
      businessData: DefaultStepComponent,
      businessDataSimplified: DefaultStepComponent,
      billingAddress: DefaultStepComponent,
      internationalBilling: DefaultStepComponent,
      taxId: DefaultStepComponent,
      privacy: DefaultStepComponent,
      vatConfirmation: DefaultStepComponent,
      review: DefaultStepComponent,
      ...customComponents,
    }),
    [customComponents]
  );

  // Ottieni il componente per lo step corrente
  const StepComponent = (stepComponents as unknown as Record<string, React.FC<Record<string, unknown>>>)[currentStepId] || DefaultStepComponent;

  // Handler per next con direction
  const handleNext = useCallback(() => {
    setDirection(1);
    goToNext();
  }, [goToNext]);

  // Handler per back con direction
  const handleBack = useCallback(() => {
    setDirection(-1);
    goToPrevious();
  }, [goToPrevious]);

  // Handler per complete
  const handleComplete = useCallback(() => {
    complete();
  }, [complete]);

  // Se non ci sono step, mostra errore
  if (activeSteps.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Nessuno step configurato</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Dynamic Progress */}
      <DynamicProgress
        current={currentStepIndex + 1}
        total={activeSteps.length}
        estimatedTime={estimatedTime}
        showStepIndicators
        showTimeEstimate
      />

      {/* Step Container con animazione */}
      <motion.div
        className="relative min-h-[400px]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepId}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            <StepComponent
              stepId={currentStepId}
              answers={answers}
              onAnswersChange={updateAnswersImmediate}
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <ConditionalNavigation
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isLastStep={isLastStep}
        onBack={handleBack}
        onNext={handleNext}
      />
    </div>
  );
};

export default ConditionalStepRenderer;
