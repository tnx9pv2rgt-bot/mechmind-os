'use client';

import { motion } from 'framer-motion';
import { User, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface FormLayoutProps {
  children: React.ReactNode;
  step: number;
  title: string;
  subtitle: string;
  totalSteps?: number;
  onBack?: () => void;
  onNext?: (e?: React.BaseSyntheticEvent) => void | Promise<void>;
  isSubmitting?: boolean;
  isLastStep?: boolean;
  nextLabel?: string;
}

const steps = [
  { num: 1, label: 'Anagrafica', href: '/dashboard/customers/new/step1' },
  { num: 2, label: 'Indirizzo', href: '/dashboard/customers/new/step2' },
  { num: 3, label: 'Veicoli', href: '/dashboard/customers/new/step3' },
  { num: 4, label: 'Riepilogo', href: '/dashboard/customers/new/step4' },
];

export function FormLayout({
  children,
  step,
  title,
  subtitle,
  totalSteps = 4,
  onBack,
  onNext,
  isSubmitting = false,
  isLastStep = false,
  nextLabel = 'Avanti',
}: FormLayoutProps) {
  const pathname = usePathname();

  return (
    <div className='fixed inset-0 bg-[#1a1a1a] flex items-center justify-center p-4 overflow-hidden'>
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        {/* Glass Card Container */}
        <motion.div
          className='relative z-10 w-full h-full bg-[#2f2f2f] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-[#4e4e4e] overflow-hidden flex flex-col'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className='px-10 pt-8 pb-4'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-3xl font-semibold text-white tracking-tight'>
                  {title}
                </h1>
                <p className='text-[#888] mt-1'>{subtitle}</p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-[#888]'>Step</span>
                <span className='text-2xl font-bold text-white'>{step}</span>
                <span className='text-[#888]'>/</span>
                <span className='text-[#888]'>{totalSteps}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='h-2 bg-[#4e4e4e] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-white'
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Step Indicators */}
            <div className='flex items-center justify-between mt-4'>
              {steps.map(s => (
                <Link
                  key={s.num}
                  href={s.href}
                  className={`flex items-center gap-2 transition-all ${
                    s.num === step
                      ? 'text-white cursor-default'
                      : s.num < step
                        ? 'text-white hover:opacity-70 cursor-pointer hover:scale-105'
                        : 'text-[#888] cursor-not-allowed'
                  }`}
                  onClick={e => s.num > step && e.preventDefault()}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s.num <= step
                        ? 'bg-white text-[#0d0d0d]'
                        : 'bg-[#4e4e4e] text-[#888]'
                    }`}
                  >
                    {s.num < step ? '✓' : s.num}
                  </div>
                  <span className='hidden sm:inline text-sm font-medium'>{s.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className='flex-1 px-10 pb-24 overflow-y-auto'>{children}</div>

          {/* Navigation Buttons - Fixed Footer */}
          {(onBack || onNext) && (
            <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-[#2f2f2f] border-t border-[#4e4e4e] z-50 pointer-events-auto'>
              <div className='flex items-center justify-between'>
                {onBack ? (
                  <Button
                    type='button'
                    onClick={onBack}
                    disabled={isSubmitting}
                    className='rounded-full px-6 h-[52px] border border-[#4e4e4e] bg-transparent text-white hover:bg-white/5 transition-all'
                  >
                    <ChevronLeft className='w-5 h-5 mr-2' />
                    Indietro
                  </Button>
                ) : (
                  <div />
                )}

                {onNext && (
                  <Button
                    type='button'
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      onNext();
                    }}
                    disabled={isSubmitting}
                    className={`rounded-full px-8 h-[52px] transition-all ${
                      isLastStep
                        ? 'bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]'
                        : 'bg-white text-[#0d0d0d] hover:bg-[#e5e5e5]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                        {isLastStep ? 'Salvataggio...' : 'Caricamento...'}
                      </>
                    ) : (
                      <>
                        {nextLabel}
                        {!isLastStep && <ChevronRight className='w-5 h-5 ml-2' />}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
