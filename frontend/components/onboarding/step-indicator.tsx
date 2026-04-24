'use client';

import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  totalSteps?: number;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Tipo officina',
  2: 'Team',
  3: 'Partenza',
  4: 'Priorita',
};

export function StepIndicator({
  currentStep,
  totalSteps = 4,
}: StepIndicatorProps): React.ReactElement {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dot progress row */}
      <div className="flex items-center gap-0">
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isFuture = step > currentStep;

          return (
            <div key={step} className="flex items-center">
              {/* Dot */}
              <motion.div
                className="relative flex items-center justify-center"
                initial={false}
                animate={{ scale: isCurrent ? 1 : 0.85 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {/* Outer ring for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute h-10 w-10 rounded-full border-2 border-[var(--border-default)]/40"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  />
                )}

                {/* Inner dot */}
                <motion.div
                  className={[
                    'relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300',
                    isCompleted ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)]' : '',
                    isCurrent ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)]' : '',
                    isFuture ? 'bg-[var(--border-default)] text-[var(--text-tertiary)]' : '',
                  ].join(' ')}
                  layout
                >
                  {isCompleted ? (
                    <motion.svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </motion.svg>
                  ) : (
                    <span>{step}</span>
                  )}
                </motion.div>
              </motion.div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="relative mx-1 h-0.5 w-8 overflow-hidden rounded-full bg-[var(--border-default)] sm:w-12">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-[var(--surface-secondary)]"
                    initial={false}
                    animate={{ width: step < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step label */}
      <motion.p
        key={currentStep}
        className="text-sm font-medium text-[var(--text-tertiary)]"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Passo {currentStep} di {totalSteps}
        {STEP_LABELS[currentStep] && (
          <span className="text-[var(--text-tertiary)]">
            {' '}&mdash; {STEP_LABELS[currentStep]}
          </span>
        )}
      </motion.p>
    </div>
  );
}
