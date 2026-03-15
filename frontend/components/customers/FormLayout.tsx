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
    <div className='fixed inset-0 bg-white dark:bg-[#212121] flex items-center justify-center p-4 overflow-hidden'>
      <div className='relative w-[min(900px,95vw)] h-[min(900px,95vh)]'>
        {/* Glass Card Container */}
        <motion.div
          className='relative z-10 w-full h-full bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple rounded-[40px] shadow-2xl border border-apple-border/20 dark:border-[#424242]/50 overflow-hidden flex flex-col'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className='px-10 pt-8 pb-4'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h1 className='text-3xl font-semibold text-gray-900 dark:text-[#ececec] tracking-tight'>
                  {title}
                </h1>
                <p className='text-gray-500 dark:text-[#636366] mt-1'>{subtitle}</p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-gray-400'>Step</span>
                <span className='text-2xl font-bold text-black dark:text-[#ececec]'>{step}</span>
                <span className='text-gray-400'>/</span>
                <span className='text-gray-400'>{totalSteps}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='h-2 bg-gray-200 dark:bg-[#424242] rounded-full overflow-hidden'>
              <motion.div
                className='h-full bg-black dark:bg-[#ececec]'
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
                      ? 'text-black dark:text-[#ececec] cursor-default'
                      : s.num < step
                        ? 'text-black dark:text-[#ececec] hover:opacity-70 cursor-pointer hover:scale-105'
                        : 'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={e => s.num > step && e.preventDefault()}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s.num <= step
                        ? 'bg-black dark:bg-[#ececec] text-white dark:text-[#212121]'
                        : 'bg-gray-200 dark:bg-[#424242] text-gray-500'
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
            <div className='absolute bottom-0 left-0 right-0 px-10 py-6 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-t border-apple-border/20 dark:border-[#424242]/50 z-50 pointer-events-auto'>
              <div className='flex items-center justify-between'>
                {onBack ? (
                  <Button
                    type='button'
                    onClick={onBack}
                    disabled={isSubmitting}
                    className='rounded-full px-6 h-12 border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-black dark:text-[#ececec] hover:bg-gray-100 dark:hover:bg-[#424242] transition-all'
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
                    className={`rounded-full px-8 h-12 shadow-lg hover:shadow-xl transition-all ${
                      isLastStep
                        ? 'bg-apple-green hover:bg-green-600 text-white border-0'
                        : 'border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-black dark:text-[#ececec] hover:bg-gray-100 dark:hover:bg-[#424242]'
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
