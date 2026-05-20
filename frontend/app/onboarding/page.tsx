'use client';

import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { ShopTypeStep } from '@/components/onboarding/shop-type-step';
import { TeamSizeStep } from '@/components/onboarding/team-size-step';
import { PrioritiesStep } from '@/components/onboarding/priorities-step';
import { SectorQuestionsStep } from '@/components/onboarding/sector-questions-step';
import { useOnboardingStore } from '@/stores/onboarding-store';
import type { ShopType, TeamSize, Priority } from '@/stores/onboarding-store';
import { ShopInfoStep } from '@/components/onboarding/shop-info-step';
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
  'flex h-[48px] items-center justify-center gap-1 rounded-full',
  'bg-[var(--surface-secondary)] px-6 text-[14px] font-medium text-[var(--text-primary)]',
  'transition-colors hover:bg-[var(--surface-active)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const btnSecondary = [
  'flex h-[48px] items-center justify-center gap-1 rounded-full',
  'border border-red-500 px-5 text-[14px] font-medium text-red-400',
  'transition-colors hover:border-red-400 hover:text-red-300',
].join(' ');

const btnContinue = [
  'flex h-[48px] items-center justify-center gap-1 rounded-full',
  'border border-emerald-500 px-5 text-[14px] font-medium text-emerald-400',
  'transition-colors hover:border-emerald-400 hover:text-emerald-300',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const TOTAL_STEPS = 5;

export default function OnboardingPage(): React.ReactElement {
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const {
    step,
    answers,
    setShopName,
    setShopCity,
    setShopType,
    setTeamSize,
    togglePriority,
    setSectorAnswer,
    nextStep,
    prevStep,
    canProceed,
    reset,
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

      localStorage.setItem('mechmind_onboarding_config', JSON.stringify(config));
      localStorage.setItem('mechmind_onboarding_answers', JSON.stringify(answers));

      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shopName: answers.shopName,
          shopCity: answers.shopCity,
          shopType: answers.shopType,
          teamSize: answers.teamSize,
          priorities: answers.priorities,
          sectorAnswers: answers.sectorAnswers,
          config,
        }),
      }).catch(() => {});

      reset();

      toast.success('Configurazione completata!');
      window.location.href = '/onboarding/welcome';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = (): void => {
    localStorage.setItem('mechmind_onboarding_dismissed', 'true');
    window.location.href = '/dashboard';
  };

  const isLastStep = step === TOTAL_STEPS;
  const canGoNext = canProceed();

  const stepHint: Record<number, string> = {
    1: 'Inserisci il nome per continuare',
    2: 'Seleziona il tipo di officina per continuare',
    3: '',
    4: 'Seleziona la dimensione del team per continuare',
    5: 'Seleziona almeno una priorità per continuare',
  };

  return (
    <MotionConfig reducedMotion='user'>
      <div className='flex min-h-screen w-full items-center justify-center bg-[var(--surface-tertiary)]'>
        <div className='flex w-full items-center justify-center p-4'>
          <div className='relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-elevated)] shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:max-w-[520px]'>
            {/* Header */}
            <div className='flex min-h-[52px] select-none justify-between p-2.5 pb-0 ps-4'>
              <div className='flex max-w-full items-center' />
              <div className='flex items-center'>
                <button
                  onClick={handleSkip}
                  className='flex h-[48px] w-[48px] items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]/10'
                  aria-label='Salta configurazione e vai alla dashboard'
                  type='button'
                >
                  <span className='text-lg pointer-events-none' aria-hidden='true'>
                    &times;
                  </span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className='grow overflow-y-auto'>
              <div className='flex flex-col items-stretch gap-5 px-6 pb-4'>
                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='text-center'
                >
                  <h1 className='text-2xl font-normal text-[var(--text-on-brand)]'>
                    Raccontaci della tua officina
                  </h1>
                  <p className='mt-1 text-[14px] text-[var(--text-secondary)]'>
                    {TOTAL_STEPS} domande · circa 60 secondi
                  </p>
                </motion.div>

                {/* Step Indicator */}
                <StepIndicator currentStep={step as 1 | 2 | 3 | 4 | 5} totalSteps={TOTAL_STEPS} />

                {/* Step Content */}
                <AnimatePresence mode='wait' custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepVariants}
                    initial='enter'
                    animate='center'
                    exit='exit'
                    className='min-h-[280px]'
                  >
                    {step === 1 && (
                      <ShopInfoStep
                        shopName={answers.shopName}
                        shopCity={answers.shopCity}
                        onShopNameChange={setShopName}
                        onShopCityChange={setShopCity}
                      />
                    )}
                    {step === 2 && (
                      <ShopTypeStep
                        selected={answers.shopType}
                        onSelect={type => setShopType(type as ShopType)}
                      />
                    )}
                    {step === 3 && (
                      <SectorQuestionsStep
                        shopType={answers.shopType}
                        answers={answers.sectorAnswers}
                        onAnswer={setSectorAnswer}
                      />
                    )}
                    {step === 4 && (
                      <TeamSizeStep
                        selected={answers.teamSize}
                        onSelect={size => setTeamSize(size as TeamSize)}
                      />
                    )}
                    {step === 5 && (
                      <PrioritiesStep
                        selected={answers.priorities}
                        onToggle={priority => togglePriority(priority as Priority)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Hint quando Continua è disabilitato */}
                <AnimatePresence>
                  {!canGoNext && stepHint[step] && (
                    <motion.p
                      key='hint'
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className='text-center text-[12px] text-[var(--text-tertiary)]'
                      role='status'
                      aria-live='polite'
                    >
                      {stepHint[step]}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className='flex items-center justify-between pb-2'>
                  <div>
                    {step > 1 && (
                      <button type='button' onClick={goPrev} className={btnSecondary}>
                        <ChevronLeft className='h-4 w-4' />
                        Indietro
                      </button>
                    )}
                  </div>
                  <div>
                    {isLastStep ? (
                      <button
                        type='button'
                        onClick={handleComplete}
                        disabled={saving || !canGoNext}
                        className={btnContinue}
                      >
                        {saving ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <>
                            Vai al pannello
                            <ChevronRight className='h-4 w-4' />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={goNext}
                        disabled={!canGoNext}
                        className={btnContinue}
                      >
                        Continua
                        <ChevronRight className='h-4 w-4' />
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
