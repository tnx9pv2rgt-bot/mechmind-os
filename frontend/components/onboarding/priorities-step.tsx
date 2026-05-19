'use client';

import { motion } from 'framer-motion';
import { CalendarDays, Receipt, Wrench, MessageCircle } from 'lucide-react';

interface PrioritiesStepProps {
  selected: string[];
  onToggle: (priority: string) => void;
}

interface PriorityOption {
  id: string;
  icon: React.ReactNode;
  name: string;
}

const MAX_SELECTIONS = 2;

const PRIORITIES: PriorityOption[] = [
  {
    id: 'appuntamenti',
    icon: <CalendarDays className='h-6 w-6' />,
    name: 'Gestire gli appuntamenti',
  },
  { id: 'fatturare', icon: <Receipt className='h-6 w-6' />, name: 'Fatturare più veloce' },
  { id: 'lavorazioni', icon: <Wrench className='h-6 w-6' />, name: 'Tracciare le lavorazioni' },
  {
    id: 'comunicare',
    icon: <MessageCircle className='h-6 w-6' />,
    name: 'Comunicare con i clienti',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { scale: 0.93, y: 8 },
  visible: { scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

export function PrioritiesStep({ selected, onToggle }: PrioritiesStepProps): React.ReactElement {
  const maxReached = selected.length >= MAX_SELECTIONS;

  return (
    <div className='flex flex-col items-center gap-5'>
      <div className='text-center'>
        <h2 className='text-xl font-normal text-[var(--text-on-brand)]'>Cosa ti serve di più?</h2>
        <p className='mt-1 text-[13px] text-[var(--text-secondary)]'>
          Scegli massimo {MAX_SELECTIONS}
        </p>
      </div>

      <motion.div
        className='grid w-full grid-cols-2 gap-2.5'
        variants={containerVariants}
        initial='hidden'
        animate='visible'
      >
        {PRIORITIES.map(priority => {
          const isSelected = selected.includes(priority.id);
          const isDisabledByMax = maxReached && !isSelected;

          return (
            <motion.button
              key={priority.id}
              type='button'
              variants={itemVariants}
              whileHover={isDisabledByMax ? {} : { scale: 1.02 }}
              whileTap={isDisabledByMax ? {} : { scale: 0.98 }}
              onClick={() => onToggle(priority.id)}
              disabled={isDisabledByMax}
              className={[
                'relative flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all duration-200',
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : isDisabledByMax
                    ? 'cursor-not-allowed border-[var(--border-default)] bg-[var(--surface-active)] opacity-40'
                    : 'border-[var(--border-default)] bg-[var(--surface-active)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-active)]',
              ].join(' ')}
              aria-pressed={isSelected}
              aria-disabled={isDisabledByMax}
            >
              {isSelected && (
                <motion.div
                  className='absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500'
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 20 20'
                    fill='white'
                    className='h-2.5 w-2.5'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z'
                      clipRule='evenodd'
                    />
                  </svg>
                </motion.div>
              )}
              <span
                className={
                  isSelected ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-secondary)]'
                }
              >
                {priority.icon}
              </span>
              <span
                className={[
                  'text-[13px] font-medium leading-tight',
                  isSelected ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-primary)]',
                ].join(' ')}
              >
                {priority.name}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.p
        className={[
          'text-[12px] transition-colors duration-200',
          maxReached ? 'font-medium text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]',
        ].join(' ')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        role={maxReached ? 'status' : undefined}
      >
        {maxReached
          ? `Hai selezionato il massimo (${MAX_SELECTIONS} di ${MAX_SELECTIONS})`
          : `${selected.length} di ${MAX_SELECTIONS} selezionati`}
      </motion.p>
    </div>
  );
}
