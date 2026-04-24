'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { ShopTypeStep } from '@/components/onboarding/shop-type-step';
import { TeamSizeStep } from '@/components/onboarding/team-size-step';
import { MigrationStep } from '@/components/onboarding/migration-step';
import { PrioritiesStep } from '@/components/onboarding/priorities-step';
import { useOnboardingStore } from '@/stores/onboarding-store';
import type { ShopType, TeamSize, MigrationSource, Priority } from '@/stores/onboarding-store';
import { generateTenantConfig } from '@/lib/auth/onboarding-config';

const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
    transition: { duration: 0.25 },
  }),
};

const btnPrimary = [
  'flex h-[44px] items-center justify-center gap-1 rounded-full',
  'bg-[var(--surface-secondary)] px-6 text-[14px] font-medium text-[var(--text-primary)]',
  'transition-colors hover:bg-[var(--surface-active)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const btnSecondary = [
  'flex h-[44px] items-center justify-center gap-1 rounded-full',
  'border border-[var(--text-tertiary)] px-5 text-[14px] font-medium text-[var(--text-secondary)]',
  'transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--text-on-brand)]',
].join(' ');

export default function OnboardingPage(): React.ReactElement {
  const router = useRouter();
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const {
    step,
    answers,
    setShopType,
    setTeamSize,
    setMigration,
    togglePriority,
    nextStep,
    prevStep,
    canProceed,
  } = useOnboardingStore();

  const goNext = (): void => {
    if (!canProceed()) return;
    setDirection(1);
    nextStep();
  };

  const goPrev = (): void => {
    setDirection(-1);
    prevStep();
  };

  const handleComplete = async (): Promise<void> => {
    if (!canProceed()) return;
    setSaving(true);
    try {
      const config = generateTenantConfig(answers);

      // Save config locally — the backend onboarding endpoint is for fiscal data (ragione sociale, P.IVA),
      // while this wizard collects shop preferences (type, team size, priorities).
      localStorage.setItem('mechmind_onboarding_config', JSON.stringify(config));
      localStorage.setItem('mechmind_onboarding_answers', JSON.stringify(answers));

      toast.success('Configurazione completata!');
      router.push('/onboarding/welcome');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = (): void => {
    router.push('/dashboard');
  };

  const isLastStep = step === 4;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--surface-tertiary)]">
        <div className="flex w-full items-center justify-center p-4">
          <div className="relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-elevated)] shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:max-w-[520px]">
            {/* Header */}
            <header className="flex min-h-[52px] select-none justify-between p-2.5 pb-0 ps-4">
              <div className="flex max-w-full items-center" />
              <div className="flex items-center">
                <button
                  onClick={handleSkip}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]/10 min-h-[44px] min-w-[44px]"
                  aria-label="Salta"
                  type="button"
                >
                  <span className="text-lg pointer-events-none" aria-hidden="true">&times;</span>
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="grow overflow-y-auto overflow-hidden">
              <div className="flex flex-col items-stretch gap-5 px-6 pb-4">
                {/* Title */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <h1 className="text-2xl font-normal text-[var(--text-on-brand)]">
                    Raccontaci della tua officina
                  </h1>
                  <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                    4 domande per personalizzare MechMind per te
                  </p>
                </motion.div>

                {/* Step Indicator */}
                <StepIndicator currentStep={step} totalSteps={4} />

                {/* Step Content */}
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="min-h-[280px]"
                  >
                    {step === 1 && (
                      <ShopTypeStep
                        selected={answers.shopType}
                        onSelect={(type) => setShopType(type as ShopType)}
                      />
                    )}
                    {step === 2 && (
                      <TeamSizeStep
                        selected={answers.teamSize}
                        onSelect={(size) => setTeamSize(size as TeamSize)}
                      />
                    )}
                    {step === 3 && (
                      <MigrationStep
                        selected={answers.migration}
                        onSelect={(source) => setMigration(source as MigrationSource)}
                      />
                    )}
                    {step === 4 && (
                      <PrioritiesStep
                        selected={answers.priorities}
                        onToggle={(priority) => togglePriority(priority as Priority)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between pb-2">
                  <div>
                    {step > 1 && (
                      <button type="button" onClick={goPrev} className={btnSecondary}>
                        <ChevronLeft className="h-4 w-4" />
                        Indietro
                      </button>
                    )}
                  </div>
                  <div>
                    {isLastStep ? (
                      <button
                        type="button"
                        onClick={handleComplete}
                        disabled={saving || !canProceed()}
                        className={btnPrimary}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Inizia
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!canProceed()}
                        className={btnPrimary}
                      >
                        Continua
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
